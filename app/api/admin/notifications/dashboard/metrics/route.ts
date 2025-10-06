import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import connectDB from '@/lib/db'
import NotificationLog from '@/models/NotificationLog'
import NotificationTemplate from '@/models/NotificationTemplate'
import NotificationCampaign from '@/models/NotificationCampaign'

export async function GET(request: NextRequest) {
    try {
        const { userId } = await auth()

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { timeRange } = Object.fromEntries(new URL(request.url).searchParams.entries())

        await connectDB()

        // Get today's date range
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const endRange = new Date()
        // Adjust start (stored in `today`) and endRange according to timeRange
        if (timeRange === '1h' || !timeRange) {
            // last 1 hour
            const start1h = new Date(endRange.getTime() - 1 * 60 * 60 * 1000)
            today.setTime(start1h.getTime())
        } else if (timeRange === '24h' || !timeRange) {
            // Last 24 hours
            const start24h = new Date(endRange.getTime() - 24 * 60 * 60 * 1000)
            today.setTime(start24h.getTime())
        } else if (timeRange === '7d') {
            // Last 7 full days (including today)
            today.setDate(today.getDate() - 6) // keep today as midnight, go back 6 days to cover 7 days total
            today.setHours(0, 0, 0, 0)
            endRange.setHours(23, 59, 59, 999) // include end of current day
        } else if (timeRange === '30d') {
            // Last 30 full days (including today)
            today.setDate(today.getDate() - 29)
            today.setHours(0, 0, 0, 0)
            endRange.setHours(23, 59, 59, 999)
        } else {
            // Fallback: use today's full range
            endRange.setDate(endRange.getDate() + 1)
            endRange.setHours(0, 0, 0, 0)
        }

        // Fetch today's logs
        const todayLogs = await NotificationLog.find({
            createdAt: { $gte: today, $lt: endRange }
        }).lean()

        // Compute today stats from logs
        const todayStats = todayLogs.reduce(
            (acc, log) => {
                acc.sent += log.totalSent || 0
                acc.failed += log.totalFailed || 0
                return acc
            },
            { sent: 0, failed: 0, successRate: 0 }
        )
        const totalToday = todayStats.sent + todayStats.failed
        todayStats.successRate = totalToday > 0 ? (todayStats.sent / totalToday) * 100 : 0

        // Calculate channel statistics from logs
        const channelStats: Record<string, { sent: number; failed: number; successRate: number }> = {}
        const channels = ['web_push', 'email', 'whatsapp', 'sms'] as const

        for (const channel of channels) {
            let sent = 0
            let failed = 0
            for (const log of todayLogs) {
                for (const recipient of log.sentTo || []) {
                    for (const ch of recipient.channels || []) {
                        if (ch.channel === channel) {
                            if (ch.status === 'sent') sent++
                            if (ch.status === 'failed') failed++
                        }
                    }
                }
            }
            const total = sent + failed
            if (total > 0) {
                channelStats[channel] = {
                    sent,
                    failed,
                    successRate: total > 0 ? (sent / total) * 100 : 0
                }
            }
        }

        // Generate trend data for the last 7 days from logs
        const trends: Array<{ date: string; sent: number; failed: number; successRate: number }> = []
        for (let i = 6; i >= 0; i--) {
            const date = new Date()
            date.setDate(date.getDate() - i)
            date.setHours(0, 0, 0, 0)
            const nextDate = new Date(date)
            nextDate.setDate(nextDate.getDate() + 1)

            const dayLogs = await NotificationLog.find({
                createdAt: { $gte: date, $lt: nextDate }
            }).lean()

            const day = dayLogs.reduce(
                (acc, log) => {
                    acc.sent += log.totalSent || 0
                    acc.failed += log.totalFailed || 0
                    return acc
                },
                { sent: 0, failed: 0 }
            )
            const total = day.sent + day.failed
            trends.push({
                date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                sent: day.sent,
                failed: day.failed,
                successRate: total > 0 ? (day.sent / total) * 100 : 0
            })
        }

        // Channel performance derived from channelStats
        const channelPerformance = channels
            .map((channel) => {
                const stats = channelStats[channel] || { sent: 0, failed: 0, successRate: 0 }
                return { channel: channel.replace('_', ' '), ...stats }
            })
            .filter((c) => c.sent > 0 || c.failed > 0)

        // Recent activity: derive from recent logs by flattening recipients/channels
        const recentLogs = await NotificationLog.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .lean()

        const recentActivity = recentLogs.flatMap((log) => {
            const baseMessage = log.title || (log.message ? `${log.message.slice(0, 50)}...` : 'Notification')
            const items: Array<{ id: string; type: string; message: string; timestamp: Date; status: 'success' | 'failed' | 'pending'; channel: string }> = []
            for (const recipient of log.sentTo || []) {
                for (const ch of recipient.channels || []) {
                    items.push({
                        id: String(log._id),
                        type: 'notification',
                        message: baseMessage,
                        timestamp: (ch.sentAt as Date) || (log as any).createdAt,
                        status: ch.status as any,
                        channel: ch.channel
                    })
                }
            }
            return items.length ? items : [{
                id: String(log._id),
                type: 'notification',
                message: baseMessage,
                timestamp: (log as any).createdAt,
                status: (log.totalSent ?? 0) > 0 ? 'success' : (log.totalFailed ?? 0) > 0 ? 'failed' : 'pending',
                channel: (log.channels && log.channels[0]) || 'web_push'
            }]
        })

        // Active templates count
        const activeTemplates = await NotificationTemplate.countDocuments({ isActive: true })

        // Scheduled notifications count (campaigns that are scheduled in the future)
        const scheduledNotifications = await NotificationCampaign.countDocuments({
            status: 'scheduled',
            'scheduling.scheduledFor': { $gt: new Date() }
        })

        const metrics = {
            todayStats,
            channelStats,
            recentActivity,
            activeTemplates,
            scheduledNotifications,
            trends,
            channelPerformance
        }

        return NextResponse.json(metrics)

    } catch (error) {
        console.error('Error fetching dashboard metrics:', error)
        return NextResponse.json(
            { error: 'Failed to fetch dashboard metrics' },
            { status: 500 }
        )
    }
}