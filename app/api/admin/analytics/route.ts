import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { analyticsService } from '@/lib/services/analytics.service'
import { schedulerService } from '@/lib/services/scheduler.service'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin (you may need to implement role checking)
    // For now, assuming all authenticated users can access analytics
    
    const url = new URL(request.url)
    const action = url.searchParams.get('action')
    const startDate = url.searchParams.get('startDate')
    const endDate = url.searchParams.get('endDate')
    const days = url.searchParams.get('days')

    switch (action) {
      case 'recent':
        const recentDays = days ? parseInt(days, 10) : 7
        const recentStats = await analyticsService.getRecentAnalytics(recentDays)
        return NextResponse.json(recentStats)

      case 'dateRange':
        if (!startDate || !endDate) {
          return NextResponse.json(
            { error: 'startDate and endDate are required for dateRange action' },
            { status: 400 }
          )
        }
        const rangeStats = await analyticsService.getDateRangeAnalytics(
          new Date(startDate),
          new Date(endDate)
        )
        return NextResponse.json(rangeStats)

      case 'channelPerformance':
        if (!startDate || !endDate) {
          return NextResponse.json(
            { error: 'startDate and endDate are required for channelPerformance action' },
            { status: 400 }
          )
        }
        const channelStats = await analyticsService.getChannelPerformance(
          new Date(startDate),
          new Date(endDate)
        )
        return NextResponse.json(channelStats)

      case 'jobStatus':
        const jobStatus = schedulerService.getJobStatus()
        return NextResponse.json({ jobs: jobStatus })

      default:
        // Default to recent 7 days
        const defaultStats = await analyticsService.getRecentAnalytics(7)
        return NextResponse.json(defaultStats)
    }
  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin (implement proper role checking)
    
    const body = await request.json()
    const { action, date, startDate, endDate, jobName, enabled } = body

    switch (action) {
      case 'collectDaily':
        const targetDate = date ? new Date(date) : new Date()
        const result = await analyticsService.collectDailyAnalytics(targetDate)
        return NextResponse.json(result)

      case 'backfill':
        const backfillStartDate = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        const backfillEndDate = endDate ? new Date(endDate) : new Date()
        const backfillResults = await analyticsService.collectAnalyticsForDateRange(
          backfillStartDate,
          backfillEndDate
        )
        return NextResponse.json({ results: backfillResults })

      case 'runJob':
        if (!jobName) {
          return NextResponse.json(
            { error: 'jobName is required for runJob action' },
            { status: 400 }
          )
        }
        await schedulerService.runJob(jobName)
        return NextResponse.json({ success: true, message: `Job ${jobName} executed successfully` })

      case 'setJobEnabled':
        if (!jobName || enabled === undefined) {
          return NextResponse.json(
            { error: 'jobName and enabled are required for setJobEnabled action' },
            { status: 400 }
          )
        }
        schedulerService.setJobEnabled(jobName, enabled)
        return NextResponse.json({ success: true, message: `Job ${jobName} ${enabled ? 'enabled' : 'disabled'}` })

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json(
      { error: 'Failed to process analytics request' },
      { status: 500 }
    )
  }
}