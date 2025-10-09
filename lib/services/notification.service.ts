import webpush from 'web-push'
import connectDB from '@/lib/db'
import WebPushSubscription from '@/models/WebPushSubscription'
import Notification from '@/models/Notification'
import NotificationLog from '@/models/NotificationLog'
import NotificationTemplate from '@/models/NotificationTemplate'
import User from '@/models/User'
import { emailService } from './email.service'
import { whatsappService } from './whatsapp.service'
import { smsService } from './sms.service'
import { ConfigValidator } from './config-validator.service'
// import { performStartupValidation } from '../startup-validation'
import { analyticsService } from './analytics.service'
import { log } from '../utils/logger'

// Configure web-push with VAPID keys
webpush.setVapidDetails(
  `mailto:${process.env.SMTP_USER || 'noreply@example.com'}`,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export interface NotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  url?: string
  data?: any
}

// Type definitions for notification log entries
export interface NotificationLogEntry {
  userId: string
  email?: string
  phone?: string
  channels: ChannelLog[]
}

export interface ChannelLog {
  channel: 'web_push' | 'email' | 'whatsapp' | 'sms'
  status: 'sent' | 'failed' | 'pending'
  sentAt?: Date
  error?: string
}

export interface NotificationServiceResult {
  success: boolean
  results: {
    webPush: { sent: number; failed: number }
    email: { sent: number; failed: number }
    whatsapp: { sent: number; failed: number }
    sms: { sent: number; failed: number }
  }
  logId?: string
  totalUsers?: number
  error?: string
}

export interface NotificationOptions {
  title: string
  message: string
  channels: ('web_push' | 'email' | 'whatsapp' | 'sms')[]
  targetRoles: ('admin' | 'moderator' | 'scrapper' | 'user' | 'everyone')[]
  sentBy: string
  metadata?: any
  templateId?: string
  retryAttempts?: number
}

export interface RetryConfig {
  maxAttempts: number
  baseDelay: number
  maxDelay: number
  backoffMultiplier: number
}

export class NotificationService {
  private static readonly DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000, // 1 second
    maxDelay: 10000, // 10 seconds
    backoffMultiplier: 2
  }

  // Convenience helpers for domain-specific notifications
  static async purchaseInquiry({ moderatorIds, itemName, scrapItemId, conversationId, buyerName }: { moderatorIds: string[]; itemName: string; scrapItemId: string; conversationId: string; buyerName?: string }) {
    const title = 'New purchase inquiry'
    const body = `${buyerName || 'A user'} asked about: ${itemName}`
    return this.notifyUsers(moderatorIds, { title, body, url: `/conversations/${conversationId}`, type: 'purchase_inquiry' })
  }

  static async paymentRequest({ buyerId, amount, conversationId, scrapItemId }: { buyerId: string; amount: number; conversationId: string; scrapItemId: string }) {
    const title = 'Payment requested'
    const body = `A payment of ₹${amount} was requested for your purchase.`
    return this.notifyUsers([buyerId], { title, body, url: `/conversations/${conversationId}`, type: 'payment_request' })
  }

  static async paymentCompleted({ buyerId, purchaseId, scrapItemId, amount }: { buyerId: string; purchaseId: string; scrapItemId: string; amount: number }) {
    const title = 'Payment completed'
    const body = `We received your payment of ₹${amount}. Thank you!`
    return this.notifyUsers([buyerId], { title, body, url: `/account`, type: 'payment_completed' })
  }

  static async itemSold({ staffIds, scrapItemId, salePrice }: { staffIds: string[]; scrapItemId: string; salePrice: number }) {
    const title = 'Item sold'
    const body = `Item ${scrapItemId} sold for ₹${salePrice}.`
    return this.notifyUsers(staffIds, { title, body, url: `/admin`, type: 'item_sold' })
  }

  // Buyer-facing item sold notification (for online sales)
  static async itemSoldToBuyer({ buyerId, scrapItemId, salePrice }: { buyerId: string; scrapItemId: string; salePrice: number }) {
    const title = 'Your purchase is confirmed'
    const body = `Purchase confirmed for ₹${salePrice}. View details in your account.`
    return this.notifyUsers([buyerId], { title, body, url: `/account`, type: 'item_sold' })
  }

  /**
   * Validates service availability and filters channels accordingly
   */
  private static validateAndFilterChannels(requestedChannels: string[]): {
    availableChannels: string[]
    unavailableChannels: string[]
    warnings: string[]
  } {
    const serviceAvailability = ConfigValidator.getServiceAvailability()
    const availableChannels: string[] = []
    const unavailableChannels: string[] = []
    const warnings: string[] = []

    for (const channel of requestedChannels) {
      switch (channel) {
        case 'web_push':
          if (serviceAvailability.webPush) {
            availableChannels.push(channel)
          } else {
            unavailableChannels.push(channel)
            warnings.push('Web Push service is not configured - notifications will not be sent via web push')
          }
          break
        case 'email':
          if (serviceAvailability.email) {
            availableChannels.push(channel)
          } else {
            unavailableChannels.push(channel)
            warnings.push('Email service is not configured - notifications will not be sent via email')
          }
          break
        case 'whatsapp':
          if (serviceAvailability.whatsapp) {
            availableChannels.push(channel)
          } else {
            unavailableChannels.push(channel)
            warnings.push('WhatsApp service is not configured - notifications will not be sent via WhatsApp')
          }
          break
        case 'sms':
          if (serviceAvailability.sms) {
            availableChannels.push(channel)
          } else {
            unavailableChannels.push(channel)
            warnings.push('SMS service is not configured - notifications will not be sent via SMS')
          }
          break
        default:
          unavailableChannels.push(channel)
          warnings.push(`Unknown channel '${channel}' - will be skipped`)
      }
    }

    return { availableChannels, unavailableChannels, warnings }
  }

  /**
   * Implements exponential backoff retry logic with intelligent retry decisions
   */
  private static async retryWithBackoff<T>(
    operation: () => Promise<T>,
    config: RetryConfig = this.DEFAULT_RETRY_CONFIG,
    context: string = 'operation'
  ): Promise<T> {
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        const result = await operation()

        // Log successful retry if this wasn't the first attempt
        if (attempt > 1) {
          log.notification.debug(`${context} succeeded on attempt ${attempt}`)
        }

        return result
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        // Check if this error is worth retrying
        const shouldRetry = this.isRetryableError(lastError) && attempt < config.maxAttempts

        if (!shouldRetry) {
          if (attempt === config.maxAttempts) {
            log.notification.error(`${context} failed after ${config.maxAttempts} attempts`, {
              message: lastError.message,
              code: (lastError as any).code || (lastError as any).status,
              stack: lastError.stack
            })
          } else {
            log.notification.error(`${context} failed with non-retryable error on attempt ${attempt}`, {
              message: lastError.message,
              code: (lastError as any).code || (lastError as any).status,
              retryable: false
            })
          }
          throw lastError
        }

        // Calculate delay with exponential backoff and jitter
        const baseDelay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1)
        const jitter = Math.random() * 0.1 * baseDelay // Add up to 10% jitter
        const delay = Math.min(baseDelay + jitter, config.maxDelay)

        log.notification.warn(`${context} attempt ${attempt}/${config.maxAttempts} failed, retrying in ${Math.round(delay)}ms`, {
          error: lastError.message,
          code: (lastError as any).code || (lastError as any).status,
          retryable: true
        })

        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    throw lastError || new Error(`${context} failed after ${config.maxAttempts} attempts`)
  }

  /**
   * Determines if an error is retryable based on error type and characteristics
   */
  private static isRetryableError(error: any): boolean {
    if (!error) return false

    const errorMessage = error.message?.toLowerCase() || ''
    const errorCode = error.code || error.status

    // Network-related errors that might be temporary
    const retryableMessages = [
      'network error',
      'timeout',
      'connection refused',
      'connection reset',
      'temporary failure',
      'service unavailable',
      'rate limit',
      'too many requests',
      'socket hang up',
      'econnreset',
      'enotfound',
      'etimedout',
      'econnrefused'
    ]

    // HTTP status codes that might be temporary
    const retryableStatusCodes = [408, 429, 500, 502, 503, 504]

    // Service-specific retryable errors
    const serviceSpecificRetryable = [
      'resend api error', // Email service temporary issues
      'whatsapp api error', // WhatsApp temporary issues
      'sms api error', // SMS service temporary issues
      'push service error' // Web push temporary issues
    ]

    const isRetryable = retryableMessages.some(msg => errorMessage.includes(msg)) ||
      retryableStatusCodes.includes(errorCode) ||
      serviceSpecificRetryable.some(msg => errorMessage.includes(msg))

    // Log retry decision for debugging
    if (isRetryable) {
      console.debug(`🔄 Error marked as retryable:`, { message: errorMessage, code: errorCode })
    } else {
      console.debug(`🚫 Error marked as non-retryable:`, { message: errorMessage, code: errorCode })
    }

    return isRetryable
  }

  /**
   * Converts technical error messages to user-friendly messages
   */
  private static getUserFriendlyErrorMessage(error: any, channel: string): string {
    if (!error) return 'Unknown error occurred'

    const errorMessage = error.message?.toLowerCase() || ''
    const errorCode = error.code || error.status

    // Channel-specific user-friendly messages
    switch (channel) {
      case 'web_push':
        if (errorMessage.includes('invalidregistration') || errorMessage.includes('notregistered')) {
          return 'User\'s device is no longer registered for notifications'
        }
        if (errorMessage.includes('payloadtoolarge')) {
          return 'Notification message is too long'
        }
        if (errorMessage.includes('ttl')) {
          return 'Notification expired before it could be delivered'
        }
        if (errorMessage.includes('vapid')) {
          return 'Push notification service configuration error'
        }
        break

      case 'email':
        if (errorCode === 429 || errorMessage.includes('rate limit')) {
          return 'Email sending rate limit reached, please try again later'
        }
        if (errorMessage.includes('invalid email') || errorMessage.includes('bounce')) {
          return 'Invalid or unreachable email address'
        }
        if (errorMessage.includes('spam')) {
          return 'Email blocked by spam filter'
        }
        if (errorMessage.includes('quota')) {
          return 'Email service quota exceeded'
        }
        break

      case 'whatsapp':
        if (errorCode === 429 || errorMessage.includes('rate limit')) {
          return 'WhatsApp messaging rate limit reached'
        }
        if (errorMessage.includes('invalid number') || errorMessage.includes('not registered')) {
          return 'Invalid or unregistered WhatsApp number'
        }
        if (errorMessage.includes('template')) {
          return 'WhatsApp message template error'
        }
        break

      case 'sms':
        if (errorCode === 429 || errorMessage.includes('rate limit')) {
          return 'SMS sending rate limit reached'
        }
        if (errorMessage.includes('invalid number')) {
          return 'Invalid phone number format'
        }
        if (errorMessage.includes('insufficient')) {
          return 'SMS service credits insufficient'
        }
        break
    }

    // Generic user-friendly messages
    if (errorMessage.includes('network') || errorMessage.includes('connection')) {
      return 'Network connection issue, please try again'
    }
    if (errorMessage.includes('timeout')) {
      return 'Service timeout, please try again'
    }
    if (errorMessage.includes('unauthorized') || errorCode === 401) {
      return 'Service authentication error'
    }
    if (errorMessage.includes('forbidden') || errorCode === 403) {
      return 'Service access denied'
    }
    if (errorCode >= 500) {
      return 'Service temporarily unavailable'
    }

    // Return original message if no friendly alternative found, but sanitized
    return error.message || 'Service error occurred'
  }

  // Send web push notification to a single user
  static async sendWebPushToUser(userId: string, payload: NotificationPayload): Promise<{ success: boolean; error?: string }> {
    const context = `Web push notification to user ${userId}`

    try {
      // Check if web push is configured
      if (!ConfigValidator.isServiceConfigured('Web Push')) {
        const error = 'Web Push service is not configured. Please check VAPID keys.'
        log.notification.warn(`${context}: ${error}`)
        return { success: false, error }
      }

      await connectDB()

      const subscription = await WebPushSubscription.findOne({ clerkUserId: userId })
      if (!subscription) {
        const error = 'No web push subscription found for user'
        log.notification.warn(`${context}: ${error}`)
        return { success: false, error }
      }

      const pushSubscription = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth
        }
      }

      // Use retry logic for sending web push notification
      await this.retryWithBackoff(
        async () => {
          await webpush.sendNotification(pushSubscription, JSON.stringify(payload))
        },
        this.DEFAULT_RETRY_CONFIG,
        context
      )

      // Log notification in user's notification history
      try {
        const notification = new Notification({
          userId,
          title: payload.title,
          message: payload.body,
          type: 'push',
          isRead: false,
          data: payload.data
        })
        await notification.save()
      } catch (dbError) {
        // Don't fail the notification if logging fails
        log.notification.warn(`Failed to log notification for user ${userId}`, { error: dbError })
      }

      log.notification.debug(`${context}: Successfully sent`)
      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      const friendlyError = this.getUserFriendlyErrorMessage(error, 'web_push')

      log.notification.error(`${context}: ${errorMessage}`, {
        userId,
        error: errorMessage,
        friendlyError,
        stack: error instanceof Error ? error.stack : undefined
      })

      return { success: false, error: friendlyError }
    }
  }

  // Send comprehensive notification through multiple channels
  static async sendNotification(options: NotificationOptions): Promise<NotificationServiceResult> {
    try {
      // Perform startup validation on first use
      // performStartupValidation()

      await connectDB()

      // Validate and filter channels based on service availability
      const { availableChannels, unavailableChannels, warnings } = this.validateAndFilterChannels(options.channels)

      // Log warnings for unavailable channels
      if (warnings.length > 0) {
        log.notification.warn('Notification service warnings', { warnings: warnings.join('; ') })
      }

      // If no channels are available, return error
      if (availableChannels.length === 0) {
        return {
          success: false,
          error: `No notification channels are available. Requested: ${options.channels.join(', ')}. Issues: ${warnings.join('; ')}`,
          results: {
            webPush: { sent: 0, failed: 0 },
            email: { sent: 0, failed: 0 },
            whatsapp: { sent: 0, failed: 0 },
            sms: { sent: 0, failed: 0 }
          }
        }
      }

      // Get target users based on roles
      const targetUsers = await this.getTargetUsers(options.targetRoles)

      if (targetUsers.length === 0) {
        return {
          success: false,
          error: 'No target users found for the specified roles',
          results: {
            webPush: { sent: 0, failed: 0 },
            email: { sent: 0, failed: 0 },
            whatsapp: { sent: 0, failed: 0 },
            sms: { sent: 0, failed: 0 }
          }
        }
      }

      // Create notification log with only available channels
      const notificationLog = new NotificationLog({
        title: options.title,
        message: options.message,
        channels: availableChannels,
        targetRoles: options.targetRoles,
        sentBy: options.sentBy,
        metadata: {
          ...options.metadata,
          originalChannels: options.channels,
          unavailableChannels,
          warnings
        },
        templateId: options.templateId,
        sentTo: targetUsers.map(user => ({
          userId: user.clerkUserId,
          email: user.email,
          phone: user.phone,
          channels: availableChannels.map(channel => ({
            channel,
            status: 'pending' as const
          }))
        }))
      })

      await notificationLog.save()

      // Track template usage if templateId is provided
      if (options.templateId) {
        try {
          await NotificationTemplate.findByIdAndUpdate(
            options.templateId,
            { $inc: { usageCount: 1 } }
          )
        } catch (error) {
          log.notification.warn('Failed to update template usage count', { error })
          // Don't fail the notification sending if template tracking fails
        }
      }

      // Send through each channel
      const results = {
        webPush: { sent: 0, failed: 0 },
        email: { sent: 0, failed: 0 },
        whatsapp: { sent: 0, failed: 0 },
        sms: { sent: 0, failed: 0 }
      }

      for (const user of targetUsers) {
        const userLogEntry = notificationLog.sentTo.find((entry: NotificationLogEntry) => entry.userId === user.clerkUserId)

        // Web Push Channel
        if (availableChannels.includes('web_push')) {
          try {
            await this.retryWithBackoff(
              async () => {
                const result = await this.sendWebPushToUser(user.clerkUserId, {
                  title: options.title,
                  body: options.message,
                  icon: '/icon-192x192.png',
                  url: options.metadata?.url
                })
                if (!result.success) {
                  throw new Error(result.error || 'Web push failed')
                }
                return result
              },
              this.DEFAULT_RETRY_CONFIG,
              `Web push to ${user.name || user.clerkUserId}`
            )

            const channelLog = userLogEntry?.channels.find((c: ChannelLog) => c.channel === 'web_push')
            if (channelLog) {
              channelLog.status = 'sent'
              channelLog.sentAt = new Date()
            }
            results.webPush.sent++
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            const friendlyError = this.getUserFriendlyErrorMessage(error, 'web_push')

            console.error(`❌ Web push failed for user ${user.name || user.clerkUserId}:`, {
              userId: user.clerkUserId,
              error: errorMessage,
              friendlyError
            })

            const channelLog = userLogEntry?.channels.find((c: ChannelLog) => c.channel === 'web_push')
            if (channelLog) {
              channelLog.status = 'failed'
              channelLog.error = friendlyError
            }
            results.webPush.failed++
          }
        }

        // Email Channel
        if (availableChannels.includes('email') && user.email) {
          // Exclude internal emails
          const isInternal = /@(?:.*\.)?khadimemillat\.org$/i.test(user.email) || user.email.toLowerCase().includes('khadimemillat.org')
          if (isInternal) {
            const channelLog = userLogEntry?.channels.find((c: ChannelLog) => c.channel === 'email')
            if (channelLog) {
              channelLog.status = 'failed'
              channelLog.error = 'Internal domain excluded from broadcast emails'
            }
            results.email.failed++
            continue
          }
          try {
            await this.retryWithBackoff(
              async () => {
                const html = emailService.generateDefaultBrandedEmail({
                  title: options.title,
                  message: options.message,
                  greetingName: user.name
                })
                const result = await emailService.sendEmail({
                  to: user.email!,
                  subject: options.title,
                  html
                })
                if (!result.success) {
                  throw new Error(result.error || 'Email sending failed')
                }
                return result
              },
              this.DEFAULT_RETRY_CONFIG,
              `Email to ${user.email}`
            )

            const channelLog = userLogEntry?.channels.find((c: ChannelLog) => c.channel === 'email')
            if (channelLog) {
              channelLog.status = 'sent'
              channelLog.sentAt = new Date()
            }
            results.email.sent++
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            const friendlyError = this.getUserFriendlyErrorMessage(error, 'email')

            console.error(`❌ Email failed for user ${user.email}:`, {
              userId: user.clerkUserId,
              email: user.email,
              error: errorMessage,
              friendlyError
            })

            const channelLog = userLogEntry?.channels.find((c: ChannelLog) => c.channel === 'email')
            if (channelLog) {
              channelLog.status = 'failed'
              channelLog.error = friendlyError
            }
            results.email.failed++
          }
        } else if (availableChannels.includes('email') && !user.email) {
          // User doesn't have email address
          const friendlyError = 'User email address not available'
          console.warn(`⚠️ Email channel skipped for user ${user.clerkUserId}: ${friendlyError}`)

          const channelLog = userLogEntry?.channels.find((c: ChannelLog) => c.channel === 'email')
          if (channelLog) {
            channelLog.status = 'failed'
            channelLog.error = friendlyError
          }
          results.email.failed++
        }

        // WhatsApp Channel
        if (availableChannels.includes('whatsapp') && user.phone) {
          try {
            await this.retryWithBackoff(
              async () => {
                const result = await whatsappService.sendMessage({
                  to: whatsappService.formatPhoneNumber(user.phone!),
                  message: whatsappService.generateCustomNotification(options.title, options.message)
                })
                if (!result.success) {
                  throw new Error(result.error || 'WhatsApp sending failed')
                }
                return result
              },
              this.DEFAULT_RETRY_CONFIG,
              `WhatsApp to ${user.phone}`
            )

            const channelLog = userLogEntry?.channels.find((c: ChannelLog) => c.channel === 'whatsapp')
            if (channelLog) {
              channelLog.status = 'sent'
              channelLog.sentAt = new Date()
            }
            results.whatsapp.sent++
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            const friendlyError = this.getUserFriendlyErrorMessage(error, 'whatsapp')

            console.error(`❌ WhatsApp failed for user ${user.phone}:`, {
              userId: user.clerkUserId,
              phone: user.phone,
              error: errorMessage,
              friendlyError
            })

            const channelLog = userLogEntry?.channels.find((c: ChannelLog) => c.channel === 'whatsapp')
            if (channelLog) {
              channelLog.status = 'failed'
              channelLog.error = friendlyError
            }
            results.whatsapp.failed++
          }
        } else if (availableChannels.includes('whatsapp') && !user.phone) {
          // User doesn't have phone number
          const friendlyError = 'User phone number not available'
          console.warn(`⚠️ WhatsApp channel skipped for user ${user.clerkUserId}: ${friendlyError}`)

          const channelLog = userLogEntry?.channels.find((c: ChannelLog) => c.channel === 'whatsapp')
          if (channelLog) {
            channelLog.status = 'failed'
            channelLog.error = friendlyError
          }
          results.whatsapp.failed++
        }

        // SMS Channel
        if (availableChannels.includes('sms') && user.phone) {
          try {
            await this.retryWithBackoff(
              async () => {
                const result = await smsService.sendSMS({
                  to: smsService.formatPhoneNumber(user.phone!),
                  message: smsService.generateCustomNotification(options.title, options.message)
                })
                if (!result.success) {
                  throw new Error(result.error || 'SMS sending failed')
                }
                return result
              },
              this.DEFAULT_RETRY_CONFIG,
              `SMS to ${user.phone}`
            )

            const channelLog = userLogEntry?.channels.find((c: ChannelLog) => c.channel === 'sms')
            if (channelLog) {
              channelLog.status = 'sent'
              channelLog.sentAt = new Date()
            }
            results.sms.sent++
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            const friendlyError = this.getUserFriendlyErrorMessage(error, 'sms')

            console.error(`❌ SMS failed for user ${user.phone}:`, {
              userId: user.clerkUserId,
              phone: user.phone,
              error: errorMessage,
              friendlyError
            })

            const channelLog = userLogEntry?.channels.find((c: ChannelLog) => c.channel === 'sms')
            if (channelLog) {
              channelLog.status = 'failed'
              channelLog.error = friendlyError
            }
            results.sms.failed++
          }
        } else if (availableChannels.includes('sms') && !user.phone) {
          // User doesn't have phone number
          const friendlyError = 'User phone number not available'
          console.warn(`⚠️ SMS channel skipped for user ${user.clerkUserId}: ${friendlyError}`)

          const channelLog = userLogEntry?.channels.find((c: ChannelLog) => c.channel === 'sms')
          if (channelLog) {
            channelLog.status = 'failed'
            channelLog.error = friendlyError
          }
          results.sms.failed++
        }
      }

      // Update notification log with results
      const totalSent = results.webPush.sent + results.email.sent + results.whatsapp.sent + results.sms.sent
      const totalFailed = results.webPush.failed + results.email.failed + results.whatsapp.failed + results.sms.failed

      notificationLog.totalSent = totalSent
      notificationLog.totalFailed = totalFailed

      try {
        await notificationLog.save()
        
        // Trigger analytics collection for today (async, don't wait)
        analyticsService.collectDailyAnalytics(new Date()).catch(error => {
          log.notification.warn('Failed to update analytics after notification send', { error })
          // Don't fail the notification sending if analytics fails
        })
      } catch (dbError) {
        console.error('❌ Failed to save notification log:', dbError)
        // Continue execution even if logging fails
      }

      // Determine overall success - consider it successful if at least one notification was sent
      const overallSuccess = totalSent > 0
      let statusMessage = ''

      if (totalSent === 0) {
        statusMessage = 'No notifications were successfully sent'
      } else if (totalFailed === 0) {
        statusMessage = `All ${totalSent} notifications sent successfully`
      } else {
        statusMessage = `${totalSent} notifications sent successfully, ${totalFailed} failed`
      }

      // Include warnings about unavailable channels in the response
      if (warnings.length > 0) {
        statusMessage += `. Warnings: ${warnings.join('; ')}`
      }

      // Log comprehensive results
      log.notification.info('Notification sending completed', {
        success: overallSuccess,
        totalUsers: targetUsers.length,
        totalSent,
        totalFailed,
        channelResults: results,
        availableChannels,
        unavailableChannels,
        warnings: warnings.length > 0 ? warnings : undefined
      })

      return {
        success: overallSuccess,
        results,
        logId: notificationLog._id,
        totalUsers: targetUsers.length,
        error: overallSuccess ? undefined : statusMessage
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      const friendlyError = this.getUserFriendlyErrorMessage(error, 'system')

      console.error('💥 Critical failure in notification service:', {
        error: errorMessage,
        friendlyError,
        stack: error instanceof Error ? error.stack : undefined,
        options: {
          title: options.title,
          channels: options.channels,
          targetRoles: options.targetRoles
        }
      })

      return {
        success: false,
        error: `Notification service encountered a critical error: ${friendlyError}`,
        results: {
          webPush: { sent: 0, failed: 0 },
          email: { sent: 0, failed: 0 },
          whatsapp: { sent: 0, failed: 0 },
          sms: { sent: 0, failed: 0 }
        }
      }
    }
  }

  // Get target users based on roles
  private static async getTargetUsers(targetRoles: string[]): Promise<Array<{
    clerkUserId: string
    name: string
    email?: string
    phone?: string
    role: string
  }>> {
    const query: any = {}

    if (!targetRoles.includes('everyone')) {
      query.role = { $in: targetRoles }
    }

    // Get users from MongoDB (cached from Clerk)
    const users = await User.find(query).lean()

    // Also get web push subscriptions to include role info
    const subscriptions = await WebPushSubscription.find({}).lean()

    // Merge user data with subscription data
    const mergedUsers = users.map(user => {
      const subscription = subscriptions.find(sub => sub.clerkUserId === user.clerkUserId)
      return {
        clerkUserId: user.clerkUserId,
        name: user.name,
        email: user.email || subscription?.userEmail,
        phone: user.phone,
        role: user.role
      }
    })

    return mergedUsers
  }

  // Send campaign creation notification
  static async sendCampaignCreatedNotification(campaignData: {
    title: string
    programTitle: string
    slug: string
    createdBy: string
  }): Promise<NotificationServiceResult> {
    const campaignUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/campaigns/${campaignData.slug}`

    return await this.sendNotification({
      title: 'New Campaign Launched! 🎯',
      message: `A new campaign "${campaignData.title}" has been launched under ${campaignData.programTitle}. Check it out and support the cause!`,
      channels: ['web_push', 'email'],
      targetRoles: ['everyone'],
      sentBy: campaignData.createdBy,
      metadata: {
        type: 'campaign_created',
        campaignSlug: campaignData.slug,
        url: campaignUrl
      }
    })
  }

  // Update user role in web push subscription
  static async updateUserRole(userId: string, newRole: string, userEmail?: string, userName?: string): Promise<{ success: boolean; error?: string }> {
    try {
      await connectDB()

      await WebPushSubscription.findOneAndUpdate(
        { clerkUserId: userId },
        {
          userRole: newRole,
          ...(userEmail && { userEmail }),
          ...(userName && { userName })
        }
      )

      return { success: true }
    } catch (error) {
      console.error('Failed to update user role in subscription:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  // Notify specific users by their IDs
  static async notifyUsers(userIds: string[], payload: {
    title: string
    body: string
    url?: string
    type?: string
  }): Promise<NotificationServiceResult> {
    try {
      await connectDB()
      
      // Get users by their Clerk IDs
      const users = await User.find({ clerkUserId: { $in: userIds } }).lean()
      
      if (users.length === 0) {
        return {
          success: false,
          error: 'No users found with the provided IDs',
          results: {
            webPush: { sent: 0, failed: 0 },
            email: { sent: 0, failed: 0 },
            whatsapp: { sent: 0, failed: 0 },
            sms: { sent: 0, failed: 0 }
          }
        }
      }

      // Use the main sendNotification method with user roles
      const userRoles = [...new Set(users.map(u => u.role))]
      
      return await this.sendNotification({
        title: payload.title,
        message: payload.body,
        channels: ['web_push', 'email'],
        targetRoles: userRoles,
        sentBy: 'system',
        metadata: {
          type: payload.type || 'notification',
          url: payload.url,
          specificUserIds: userIds
        }
      })
    } catch (error) {
      console.error('Failed to notify users:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        results: {
          webPush: { sent: 0, failed: 0 },
          email: { sent: 0, failed: 0 },
          whatsapp: { sent: 0, failed: 0 },
          sms: { sent: 0, failed: 0 }
        }
      }
    }
  }

  // Notify specific users with only web push (for chat messages)
  static async notifyUsersWebPushOnly(userIds: string[], payload: {
    title: string
    body: string
    url?: string
    type?: string
  }): Promise<NotificationServiceResult> {
    try {
      await connectDB()
      
      // Get users by their Clerk IDs
      const users = await User.find({ clerkUserId: { $in: userIds } }).lean()
      
      if (users.length === 0) {
        return {
          success: false,
          error: 'No users found with the provided IDs',
          results: {
            webPush: { sent: 0, failed: 0 },
            email: { sent: 0, failed: 0 },
            whatsapp: { sent: 0, failed: 0 },
            sms: { sent: 0, failed: 0 }
          }
        }
      }

      // Use the main sendNotification method with only web push
      const userRoles = [...new Set(users.map(u => u.role))]
      
      return await this.sendNotification({
        title: payload.title,
        message: payload.body,
        channels: ['web_push'], // Only web push, no email
        targetRoles: userRoles,
        sentBy: 'system',
        metadata: {
          type: payload.type || 'chat_message',
          url: payload.url,
          specificUserIds: userIds
        }
      })
    } catch (error) {
      console.error('Failed to notify users with web push:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        results: {
          webPush: { sent: 0, failed: 0 },
          email: { sent: 0, failed: 0 },
          whatsapp: { sent: 0, failed: 0 },
          sms: { sent: 0, failed: 0 }
        }
      }
    }
  }

  // Notify users by role
  static async notifyByRole(roles: string[], payload: {
    title: string
    body: string
    url?: string
    type?: string
  }): Promise<NotificationServiceResult> {
    return await this.sendNotification({
      title: payload.title,
      message: payload.body,
      channels: ['web_push', 'email'],
      targetRoles: roles as ('admin' | 'moderator' | 'scrapper' | 'user' | 'everyone')[],
      sentBy: 'system',
      metadata: {
        type: payload.type || 'notification',
        url: payload.url
      }
    })
  }

  // List notifications for a user
  static async listNotifications(userId: string, options: {
    page?: number
    limit?: number
    unreadOnly?: boolean
    type?: string
  } = {}): Promise<{ items: any[]; total: number }> {
    try {
      await connectDB()
      
      const { page = 1, limit = 20, unreadOnly = false, type } = options
      const skip = (page - 1) * limit
      
      const query: any = { userId }
      if (unreadOnly) query.isRead = false
      if (type) query.type = type
      
      const [items, total] = await Promise.all([
        Notification.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Notification.countDocuments(query)
      ])
      
      return { items, total }
    } catch (error) {
      console.error('Failed to list notifications:', error)
      return { items: [], total: 0 }
    }
  }

  // Subscribe to web push notifications
  static async subscribeToWebPush(userId: string, subscription: any): Promise<{ success: boolean; error?: string }> {
    try {
      await connectDB()
      
      // Get user details
      const user = await User.findOne({ clerkUserId: userId }).lean()
      
      await WebPushSubscription.findOneAndUpdate(
        { clerkUserId: userId },
        {
          clerkUserId: userId,
          endpoint: subscription.endpoint,
          keys: subscription.keys,
          userEmail: (user as any)?.email,
          userName: (user as any)?.name,
          userRole: (user as any)?.role || 'user'
        },
        { upsert: true, new: true }
      )
      
      return { success: true }
    } catch (error) {
      console.error('Failed to subscribe to web push:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  // Unsubscribe from web push notifications
  static async unsubscribeFromWebPush(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await connectDB()
      
      await WebPushSubscription.deleteOne({ clerkUserId: userId })
      
      return { success: true }
    } catch (error) {
      console.error('Failed to unsubscribe from web push:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  // Create a notification for a specific user
  static async createNotification(userId: string, data: {
    title: string
    message: string
    type?: string
    url?: string
    data?: any
  }): Promise<any> {
    try {
      await connectDB()
      
      const notification = new Notification({
        userId,
        title: data.title,
        message: data.message,
        type: data.type || 'notification',
        isRead: false,
        data: data.data
      })
      
      await notification.save()
      
      // Also try to send web push if user is subscribed
      try {
        await this.sendWebPushToUser(userId, {
          title: data.title,
          body: data.message,
          url: data.url,
          data: data.data
        })
      } catch (pushError) {
        // Don't fail the notification creation if web push fails
        console.warn('Web push failed for notification creation:', pushError)
      }
      
      return notification
    } catch (error) {
      console.error('Failed to create notification:', error)
      throw error
    }
  }
}

// Export an instance for backward compatibility
export const notificationService = NotificationService

// Export utility functions that were previously exported
export async function markAsRead(notificationId: string, userId?: string): Promise<any> {
  try {
    await connectDB()
    
    const query: any = { _id: notificationId }
    if (userId) {
      query.userId = userId
    }
    
    const notification = await Notification.findOneAndUpdate(
      query,
      { isRead: true, readAt: new Date() },
      { new: true }
    )

    if (!notification) {
      return null
    }

    return notification
  } catch (error) {
    console.error('Failed to mark notification as read:', error)
    throw error
  }
}

export async function markAllAsRead(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await connectDB()
    await Notification.updateMany(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() }
    )

    return { success: true }
  } catch (error) {
    console.error('Failed to mark all notifications as read:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Domain helpers: exported functions to match existing service hooks
export async function purchaseInquiry(params: { moderatorIds: string[]; itemName: string; scrapItemId: string; conversationId: string; buyerName?: string }) {
  return NotificationService.purchaseInquiry(params)
}

export async function paymentRequest(params: { buyerId: string; amount: number; conversationId: string; scrapItemId: string }) {
  return NotificationService.paymentRequest(params)
}

export async function paymentCompleted(params: { buyerId: string; purchaseId: string; scrapItemId: string; amount: number }) {
  return NotificationService.paymentCompleted(params)
}

export async function itemSold(params: { staffIds: string[]; scrapItemId: string; salePrice: number }) {
  return NotificationService.itemSold(params)
}

export async function itemSoldToBuyer(params: { buyerId: string; scrapItemId: string; salePrice: number }) {
  return NotificationService.itemSoldToBuyer(params)
}