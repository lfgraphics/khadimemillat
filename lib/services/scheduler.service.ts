import { analyticsService } from './analytics.service'
import { log } from '../utils/logger'

export interface ScheduledJob {
  name: string
  schedule: string // Cron expression
  handler: () => Promise<void>
  enabled: boolean
}

export class SchedulerService {
  // Available job definitions (not automatically scheduled)
  private static availableJobs: ScheduledJob[] = [
    {
      name: 'daily-analytics-collection',
      schedule: '0 1 * * *', // Run at 1 AM every day
      handler: analyticsService.runDailyAnalyticsCollection,
      enabled: false // Disabled by default - user must enable
    },
    {
      name: 'weekly-analytics-backfill',
      schedule: '0 2 * * 0', // Run at 2 AM every Sunday
      handler: () => analyticsService.backfillMissingAnalytics(7),
      enabled: false // Disabled by default - user must enable
    },
    {
      name: 'monthly-analytics-cleanup',
      schedule: '0 3 1 * *', // Run at 3 AM on the 1st of every month
      handler: () => analyticsService.cleanupOldAnalytics(365),
      enabled: false // Disabled by default - user must enable
    }
  ]

  // Active jobs (only jobs that user has enabled)
  private static activeJobs: ScheduledJob[] = []
  private static intervals: Map<string, NodeJS.Timeout> = new Map()

  /**
   * Starts the scheduler (but no jobs are scheduled automatically)
   */
  static startScheduler(): void {
    log.service.info('scheduler', 'Scheduler service initialized - no automatic jobs scheduled')
    log.service.info('scheduler', `${this.availableJobs.length} jobs available for manual scheduling`)
  }

  /**
   * Stops all active scheduled jobs
   */
  static stopScheduler(): void {
    log.service.info('scheduler', 'Stopping all active scheduled jobs')

    this.intervals.forEach((interval, jobName) => {
      clearTimeout(interval)
      log.service.debug('scheduler', `Stopped job: ${jobName}`)
    })

    this.intervals.clear()
    this.activeJobs = []
    log.service.info('scheduler', 'All scheduled jobs stopped')
  }

  /**
   * Schedules a single job
   */
  private static scheduleJob(job: ScheduledJob): void {
    try {
      // Parse cron expression and calculate next run time
      const nextRun = this.getNextRunTime(job.schedule)
      const delay = nextRun.getTime() - Date.now()

      log.service.debug('scheduler', `Scheduling job "${job.name}" to run at ${nextRun.toISOString()}`)

      const timeout = setTimeout(async () => {
        try {
          log.service.info('scheduler', `Running scheduled job: ${job.name}`)
          await job.handler()
          log.service.info('scheduler', `Completed scheduled job: ${job.name}`)
        } catch (error) {
          log.service.error('scheduler', `Error in scheduled job "${job.name}"`, { error })
        }

        // Reschedule for next run
        this.scheduleJob(job)
      }, delay)

      this.intervals.set(job.name, timeout)
    } catch (error) {
      log.service.error('scheduler', `Failed to schedule job "${job.name}"`, { error })
    }
  }

  /**
   * Simple cron parser for basic expressions
   * Supports: minute hour day month dayOfWeek
   * Example: "0 1 * * *" = 1 AM every day
   */
  private static getNextRunTime(cronExpression: string): Date {
    const parts = cronExpression.split(' ')
    if (parts.length !== 5) {
      throw new Error(`Invalid cron expression: ${cronExpression}`)
    }

    const [minute, hour, day, month, dayOfWeek] = parts.map(part => 
      part === '*' ? null : parseInt(part, 10)
    )

    const now = new Date()
    const next = new Date(now)

    // Set to next occurrence
    if (minute !== null) next.setMinutes(minute, 0, 0)
    if (hour !== null) next.setHours(hour)

    // If the time has already passed today, move to tomorrow
    if (next <= now) {
      next.setDate(next.getDate() + 1)
    }

    // Handle day of week (0 = Sunday, 6 = Saturday)
    if (dayOfWeek !== null) {
      const currentDay = next.getDay()
      const daysUntilTarget = (dayOfWeek - currentDay + 7) % 7
      if (daysUntilTarget > 0) {
        next.setDate(next.getDate() + daysUntilTarget)
      }
    }

    // Handle specific day of month
    if (day !== null) {
      next.setDate(day)
      // If we've passed this day in the current month, move to next month
      if (next <= now) {
        next.setMonth(next.getMonth() + 1)
        next.setDate(day)
      }
    }

    // Handle specific month
    if (month !== null) {
      next.setMonth(month - 1) // JavaScript months are 0-indexed
      // If we've passed this month, move to next year
      if (next <= now) {
        next.setFullYear(next.getFullYear() + 1)
      }
    }

    return next
  }

  /**
   * Manually trigger a specific job (one-time execution)
   */
  static async runJob(jobName: string): Promise<void> {
    const job = this.availableJobs.find(j => j.name === jobName)
    if (!job) {
      throw new Error(`Job not found: ${jobName}. Available jobs: ${this.availableJobs.map(j => j.name).join(', ')}`)
    }

    log.service.info('scheduler', `Manually running job: ${jobName}`)
    try {
      await job.handler()
      log.service.info('scheduler', `Manually completed job: ${jobName}`)
    } catch (error) {
      log.service.error('scheduler', `Error in manual job run "${jobName}"`, { error })
      throw error
    }
  }

  /**
   * Get status of all available jobs and active jobs
   */
  static getJobStatus(): {
    available: Array<{
      name: string
      schedule: string
      description: string
      enabled: boolean
    }>
    active: Array<{
      name: string
      schedule: string
      enabled: boolean
      nextRun: string
    }>
  } {
    const jobDescriptions: Record<string, string> = {
      'daily-analytics-collection': 'Collects notification analytics data for the previous day',
      'weekly-analytics-backfill': 'Backfills missing analytics data for the past 7 days',
      'monthly-analytics-cleanup': 'Removes analytics data older than 365 days'
    }

    return {
      available: this.availableJobs.map(job => ({
        name: job.name,
        schedule: job.schedule,
        description: jobDescriptions[job.name] || 'No description available',
        enabled: this.activeJobs.some(activeJob => activeJob.name === job.name)
      })),
      active: this.activeJobs.map(job => ({
        name: job.name,
        schedule: job.schedule,
        enabled: true,
        nextRun: this.getNextRunTime(job.schedule).toISOString()
      }))
    }
  }

  /**
   * Enable or disable a specific job (user-controlled scheduling)
   */
  static setJobEnabled(jobName: string, enabled: boolean): void {
    const availableJob = this.availableJobs.find(j => j.name === jobName)
    if (!availableJob) {
      throw new Error(`Job not found: ${jobName}. Available jobs: ${this.availableJobs.map(j => j.name).join(', ')}`)
    }

    if (enabled) {
      // Check if job is already active
      const existingActiveJob = this.activeJobs.find(j => j.name === jobName)
      if (existingActiveJob) {
        log.service.info('scheduler', `Job ${jobName} is already enabled`)
        return
      }

      // Add to active jobs and schedule it
      const jobToSchedule = { ...availableJob, enabled: true }
      this.activeJobs.push(jobToSchedule)
      this.scheduleJob(jobToSchedule)
      log.service.info('scheduler', `Enabled and scheduled job: ${jobName}`)
    } else {
      // Remove from active jobs and stop scheduling
      this.activeJobs = this.activeJobs.filter(j => j.name !== jobName)
      
      const interval = this.intervals.get(jobName)
      if (interval) {
        clearTimeout(interval)
        this.intervals.delete(jobName)
      }
      log.service.info('scheduler', `Disabled job: ${jobName}`)
    }
  }

  /**
   * Get list of available jobs that can be scheduled
   */
  static getAvailableJobs(): Array<{
    name: string
    schedule: string
    description: string
  }> {
    const jobDescriptions: Record<string, string> = {
      'daily-analytics-collection': 'Collects notification analytics data for the previous day',
      'weekly-analytics-backfill': 'Backfills missing analytics data for the past 7 days',
      'monthly-analytics-cleanup': 'Removes analytics data older than 365 days'
    }

    return this.availableJobs.map(job => ({
      name: job.name,
      schedule: job.schedule,
      description: jobDescriptions[job.name] || 'No description available'
    }))
  }

  /**
   * Check if a specific job is currently scheduled
   */
  static isJobEnabled(jobName: string): boolean {
    return this.activeJobs.some(job => job.name === jobName)
  }
}

// Export singleton instance
export const schedulerService = SchedulerService