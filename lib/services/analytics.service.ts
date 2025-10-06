import connectDB from '@/lib/db'
import NotificationAnalytics from '@/models/NotificationAnalytics'
import { log } from '../utils/logger'

export interface AnalyticsCollectionResult {
  success: boolean
  date: Date
  totalSent: number
  totalFailed: number
  error?: string
}

export interface ChannelEffectivenessData {
  webPush: { sent: number; failed: number; successRate: number }
  email: { sent: number; failed: number; successRate: number }
  whatsapp: { sent: number; failed: number; successRate: number }
  sms: { sent: number; failed: number; successRate: number }
}

export interface DateRangeStats {
  startDate: Date
  endDate: Date
  totalSent: number
  totalFailed: number
  dailyStats: Array<{
    date: Date
    sent: number
    failed: number
    successRate: number
  }>
  channelEffectiveness: ChannelEffectivenessData
  topRoles: Array<{
    role: string
    sent: number
    failed: number
    successRate: number
  }>
}

export class AnalyticsService {
  /**
   * Collects and aggregates notification analytics for a specific date
   */
  static async collectDailyAnalytics(date: Date = new Date()): Promise<AnalyticsCollectionResult> {
    try {
      await connectDB()

      // Normalize date to start of day
      const targetDate = new Date(date)
      targetDate.setHours(0, 0, 0, 0)

      log.service.debug('analytics', `Collecting notification analytics for ${targetDate.toISOString().split('T')[0]}`)

      // Use the static method from NotificationAnalytics model to aggregate data
      const stats = await (NotificationAnalytics as any).aggregateDailyStats(targetDate)

      // Check if analytics already exist for this date
      const existingAnalytics = await NotificationAnalytics.findOne({ date: targetDate })

      if (existingAnalytics) {
        // Update existing record
        Object.assign(existingAnalytics, stats)
        await existingAnalytics.save()
        log.service.debug('analytics', `Updated existing analytics for ${targetDate.toISOString().split('T')[0]}`)
      } else {
        // Create new record
        const newAnalytics = new NotificationAnalytics(stats)
        await newAnalytics.save()
        log.service.debug('analytics', `Created new analytics record for ${targetDate.toISOString().split('T')[0]}`)
      }

      return {
        success: true,
        date: targetDate,
        totalSent: stats.totalSent,
        totalFailed: stats.totalFailed
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      log.service.error('analytics', `Failed to collect daily analytics for ${date.toISOString().split('T')[0]}`, { error: errorMessage })

      return {
        success: false,
        date,
        totalSent: 0,
        totalFailed: 0,
        error: errorMessage
      }
    }
  }

  /**
   * Collects analytics for a range of dates (useful for backfilling)
   */
  static async collectAnalyticsForDateRange(startDate: Date, endDate: Date): Promise<AnalyticsCollectionResult[]> {
    const results: AnalyticsCollectionResult[] = []
    const currentDate = new Date(startDate)

    while (currentDate <= endDate) {
      const result = await this.collectDailyAnalytics(new Date(currentDate))
      results.push(result)
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1)
    }

    const successCount = results.filter(r => r.success).length
    const failureCount = results.length - successCount

    log.service.info('analytics', 'Completed analytics collection for date range', {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      totalDays: results.length,
      successful: successCount,
      failed: failureCount
    })

    return results
  }

  /**
   * Gets comprehensive analytics for a date range
   */
  static async getDateRangeAnalytics(startDate: Date, endDate: Date): Promise<DateRangeStats> {
    try {
      await connectDB()

      // Get daily analytics records
      const dailyRecords = await (NotificationAnalytics as any).getDateRangeStats(startDate, endDate)

      // Calculate totals
      let totalSent = 0
      let totalFailed = 0

      const dailyStats = dailyRecords.map((record: any) => {
        totalSent += record.totalSent
        totalFailed += record.totalFailed
        
        const total = record.totalSent + record.totalFailed
        const successRate = total > 0 ? (record.totalSent / total) * 100 : 0

        return {
          date: record.date,
          sent: record.totalSent,
          failed: record.totalFailed,
          successRate: Math.round(successRate * 100) / 100
        }
      })

      // Get channel effectiveness
      const channelEffectiveness = await (NotificationAnalytics as any).getChannelEffectiveness(startDate, endDate)

      // Calculate top roles by volume
      const roleAggregation: { [role: string]: { sent: number; failed: number } } = {}
      
      dailyRecords.forEach((record: any) => {
        Object.entries(record.roleStats).forEach(([role, stats]: [string, any]) => {
          if (!roleAggregation[role]) {
            roleAggregation[role] = { sent: 0, failed: 0 }
          }
          roleAggregation[role].sent += stats.sent
          roleAggregation[role].failed += stats.failed
        })
      })

      const topRoles = Object.entries(roleAggregation)
        .map(([role, stats]) => {
          const total = stats.sent + stats.failed
          const successRate = total > 0 ? (stats.sent / total) * 100 : 0
          return {
            role,
            sent: stats.sent,
            failed: stats.failed,
            successRate: Math.round(successRate * 100) / 100
          }
        })
        .sort((a, b) => (b.sent + b.failed) - (a.sent + a.failed))
        .slice(0, 10) // Top 10 roles

      return {
        startDate,
        endDate,
        totalSent,
        totalFailed,
        dailyStats,
        channelEffectiveness,
        topRoles
      }
    } catch (error) {
      log.service.error('analytics', 'Failed to get date range analytics', { error })
      throw error
    }
  }

  /**
   * Gets recent analytics summary (last 7 days by default)
   */
  static async getRecentAnalytics(days: number = 7): Promise<DateRangeStats> {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days + 1)
    startDate.setHours(0, 0, 0, 0)
    endDate.setHours(23, 59, 59, 999)

    return this.getDateRangeAnalytics(startDate, endDate)
  }

  /**
   * Gets channel performance comparison
   */
  static async getChannelPerformance(startDate: Date, endDate: Date): Promise<ChannelEffectivenessData> {
    try {
      await connectDB()
      return await (NotificationAnalytics as any).getChannelEffectiveness(startDate, endDate)
    } catch (error) {
      log.service.error('analytics', 'Failed to get channel performance', { error })
      throw error
    }
  }

  /**
   * Scheduled job to collect daily analytics (should be called once per day)
   */
  static async runDailyAnalyticsCollection(): Promise<void> {
    log.service.info('analytics', 'Starting scheduled daily analytics collection')
    
    try {
      // Collect analytics for yesterday (since today might not be complete)
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      
      const result = await this.collectDailyAnalytics(yesterday)
      
      if (result.success) {
        log.service.info('analytics', `Daily analytics collection completed successfully for ${yesterday.toISOString().split('T')[0]}`)
      } else {
        log.service.error('analytics', `Daily analytics collection failed: ${result.error}`)
      }
    } catch (error) {
      log.service.error('analytics', 'Critical error in daily analytics collection', { error })
    }
  }

  /**
   * Backfill analytics for missing dates
   */
  static async backfillMissingAnalytics(daysBack: number = 30): Promise<void> {
    log.service.info('analytics', `Starting analytics backfill for last ${daysBack} days`)
    
    try {
      await connectDB()

      // Get existing analytics dates
      const existingRecords = await NotificationAnalytics.find({
        date: {
          $gte: new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000)
        }
      }).select('date').lean()

      const existingDates = new Set(
        existingRecords.map(record => record.date.toISOString().split('T')[0])
      )

      // Find missing dates
      const missingDates: Date[] = []
      for (let i = daysBack - 1; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        date.setHours(0, 0, 0, 0)
        
        const dateString = date.toISOString().split('T')[0]
        if (!existingDates.has(dateString)) {
          missingDates.push(date)
        }
      }

      if (missingDates.length === 0) {
        log.service.debug('analytics', 'No missing analytics found - all dates are up to date')
        return
      }

      log.service.info('analytics', `Found ${missingDates.length} missing analytics dates, backfilling`)

      // Collect analytics for missing dates
      const results = await Promise.all(
        missingDates.map(date => this.collectDailyAnalytics(date))
      )

      const successCount = results.filter(r => r.success).length
      const failureCount = results.length - successCount

      log.service.info('analytics', 'Analytics backfill completed', {
        totalDates: missingDates.length,
        successful: successCount,
        failed: failureCount
      })

      if (failureCount > 0) {
        const failedDates = results
          .filter(r => !r.success)
          .map(r => r.date.toISOString().split('T')[0])
        log.service.warn('analytics', `Failed to backfill analytics for dates: ${failedDates.join(', ')}`)
      }
    } catch (error) {
      log.service.error('analytics', 'Critical error in analytics backfill', { error })
    }
  }

  /**
   * Cleanup old analytics data (older than specified days)
   */
  static async cleanupOldAnalytics(retentionDays: number = 365): Promise<void> {
    log.service.info('analytics', `Starting cleanup of analytics data older than ${retentionDays} days`)
    
    try {
      await connectDB()

      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

      const result = await NotificationAnalytics.deleteMany({
        date: { $lt: cutoffDate }
      })

      log.service.info('analytics', `Cleaned up ${result.deletedCount} old analytics records`)
    } catch (error) {
      log.service.error('analytics', 'Failed to cleanup old analytics', { error })
    }
  }
}

// Export singleton instance
export const analyticsService = AnalyticsService