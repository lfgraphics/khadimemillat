import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import connectDB from '@/lib/db'
import NotificationLog from '@/models/NotificationLog'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has admin role (you may need to implement role checking)
    // For now, we'll assume the route is protected by middleware

    await connectDB()

    const { searchParams } = new URL(request.url)
    const range = searchParams.get('range') || '7d'

    // Calculate date range
    const now = new Date()
    let startDate: Date
    
    switch (range) {
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      default: // 7d
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    }

    // Get overall statistics
    const overallStats = await NotificationLog.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalNotifications: { $sum: 1 },
          totalSent: { $sum: '$totalSent' },
          totalFailed: { $sum: '$totalFailed' }
        }
      }
    ])

    const stats = overallStats[0] || {
      totalNotifications: 0,
      totalSent: 0,
      totalFailed: 0
    }

    const successRate = stats.totalSent + stats.totalFailed > 0 
      ? stats.totalSent / (stats.totalSent + stats.totalFailed) 
      : 0

    // Get channel statistics
    const channelStats = await NotificationLog.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $unwind: '$sentTo'
      },
      {
        $unwind: '$sentTo.channels'
      },
      {
        $group: {
          _id: '$sentTo.channels.channel',
          sent: {
            $sum: {
              $cond: [{ $eq: ['$sentTo.channels.status', 'sent'] }, 1, 0]
            }
          },
          failed: {
            $sum: {
              $cond: [{ $eq: ['$sentTo.channels.status', 'failed'] }, 1, 0]
            }
          }
        }
      }
    ])

    const channelStatsFormatted: { [key: string]: any } = {}
    channelStats.forEach(channel => {
      const total = channel.sent + channel.failed
      channelStatsFormatted[channel._id] = {
        sent: channel.sent,
        failed: channel.failed,
        successRate: total > 0 ? channel.sent / total : 0
      }
    })

    // Get role statistics
    const roleStats = await NotificationLog.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $unwind: '$targetRoles'
      },
      {
        $group: {
          _id: '$targetRoles',
          sent: { $sum: '$totalSent' },
          failed: { $sum: '$totalFailed' }
        }
      }
    ])

    const roleStatsFormatted: { [key: string]: any } = {}
    roleStats.forEach(role => {
      roleStatsFormatted[role._id] = {
        sent: role.sent,
        failed: role.failed
      }
    })

    // Get daily statistics
    const dailyStats = await NotificationLog.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt'
            }
          },
          sent: { $sum: '$totalSent' },
          failed: { $sum: '$totalFailed' }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ])

    const dailyStatsFormatted = dailyStats.map(day => ({
      date: day._id,
      sent: day.sent,
      failed: day.failed
    }))

    return NextResponse.json({
      totalNotifications: stats.totalNotifications,
      totalSent: stats.totalSent,
      totalFailed: stats.totalFailed,
      successRate,
      channelStats: channelStatsFormatted,
      roleStats: roleStatsFormatted,
      dailyStats: dailyStatsFormatted
    })
  } catch (error) {
    console.error('Error fetching notification analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notification analytics' },
      { status: 500 }
    )
  }
}