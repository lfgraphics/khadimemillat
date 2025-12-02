import { sendDonationThankYouNotifications } from './donation-notification.service'

export class SubscriptionNotificationService {
  
  /**
   * Send subscription creation confirmation
   */
  static async sendSubscriptionCreated(subscription: any) {
    try {
      // Email notification
      if (subscription.userEmail) {
        await this.sendEmail({
          to: subscription.userEmail,
          subject: 'Sadqa Subscription Created Successfully',
          template: 'subscription-created',
          data: {
            userName: subscription.userName,
            planType: subscription.planType,
            amount: subscription.amount,
            nextPaymentDate: subscription.nextPaymentDate,
            subscriptionId: subscription._id
          }
        })
      }

      // SMS notification
      if (subscription.userPhone) {
        await this.sendSMS({
          to: subscription.userPhone,
          message: `Assalamu Alaikum ${subscription.userName}! Your ${subscription.planType} Sadqa subscription of ₹${subscription.amount} has been created successfully. Next payment: ${subscription.nextPaymentDate.toLocaleDateString()}. JazakAllahu Khair!`
        })
      }

      // WhatsApp notification
      if (subscription.userPhone) {
        await this.sendWhatsApp({
          to: subscription.userPhone,
          message: `🌟 *Sadqa Subscription Activated* 🌟\n\nAssalamu Alaikum ${subscription.userName}!\n\nYour ${subscription.planType} Sadqa subscription has been successfully created:\n\n💰 Amount: ₹${subscription.amount}\n📅 Next Payment: ${subscription.nextPaymentDate.toLocaleDateString()}\n🔄 Frequency: ${subscription.planType}\n\nMay Allah accept your continuous charity and bless you abundantly.\n\n*Khadim-e-Millat Welfare Foundation*`
        })
      }

    } catch (error) {
      console.error('[SUBSCRIPTION_CREATED_NOTIFICATION_ERROR]', error)
    }
  }

  /**
   * Send payment receipt for recurring donation
   */
  static async sendPaymentReceipt(donation: any, subscription: any) {
    try {
      // Reuse existing donation notification system
      await sendDonationThankYouNotifications(donation)

      // Additional subscription-specific messaging
      if (subscription.userPhone) {
        await this.sendWhatsApp({
          to: subscription.userPhone,
          message: `📋 *Recurring Sadqa Payment #${subscription.paymentCount}*\n\nAssalamu Alaikum ${subscription.userName}!\n\nYour ${subscription.planType} Sadqa payment has been processed:\n\n💰 Amount: ₹${subscription.amount}\n📅 Payment Date: ${new Date().toLocaleDateString()}\n🔄 Next Payment: ${subscription.nextPaymentDate.toLocaleDateString()}\n📊 Total Donated: ₹${subscription.totalPaid}\n\nBarakAllahu feeki for your continuous support!\n\n*Khadim-e-Millat Welfare Foundation*`
        })
      }

    } catch (error) {
      console.error('[SUBSCRIPTION_PAYMENT_RECEIPT_ERROR]', error)
    }
  }

  /**
   * Send payment failure notification
   */
  static async sendPaymentFailed(subscription: any, failureCount: number) {
    try {
      const isAutopaused = failureCount >= 3

      // Email notification
      if (subscription.userEmail) {
        await this.sendEmail({
          to: subscription.userEmail,
          subject: isAutopaused ? 'Sadqa Subscription Paused - Payment Issue' : 'Sadqa Subscription Payment Failed',
          template: 'subscription-payment-failed',
          data: {
            userName: subscription.userName,
            planType: subscription.planType,
            amount: subscription.amount,
            failureCount,
            isAutopaused,
            subscriptionId: subscription._id
          }
        })
      }

      // SMS notification
      if (subscription.userPhone) {
        const message = isAutopaused 
          ? `Assalamu Alaikum ${subscription.userName}. Your Sadqa subscription has been paused due to payment issues. Please update your payment method to resume. Contact us for assistance.`
          : `Assalamu Alaikum ${subscription.userName}. Your Sadqa payment of ₹${subscription.amount} failed (attempt ${failureCount}/3). Please check your payment method.`
        
        await this.sendSMS({
          to: subscription.userPhone,
          message
        })
      }

      // WhatsApp notification
      if (subscription.userPhone) {
        const whatsappMessage = isAutopaused
          ? `⚠️ *Sadqa Subscription Paused* ⚠️\n\nAssalamu Alaikum ${subscription.userName},\n\nYour ${subscription.planType} Sadqa subscription has been temporarily paused due to multiple payment failures.\n\n💰 Amount: ₹${subscription.amount}\n🔄 Frequency: ${subscription.planType}\n\nTo resume your subscription:\n1. Update your payment method\n2. Contact our support team\n\nWe're here to help you continue your charitable giving.\n\n*Khadim-e-Millat Welfare Foundation*`
          : `⚠️ *Payment Failed - Attempt ${failureCount}/3* ⚠️\n\nAssalamu Alaikum ${subscription.userName},\n\nYour Sadqa payment could not be processed:\n\n💰 Amount: ₹${subscription.amount}\n📅 Failed on: ${new Date().toLocaleDateString()}\n\nPlease check your payment method or contact us for assistance.\n\n*Khadim-e-Millat Welfare Foundation*`

        await this.sendWhatsApp({
          to: subscription.userPhone,
          message: whatsappMessage
        })
      }

    } catch (error) {
      console.error('[SUBSCRIPTION_PAYMENT_FAILED_NOTIFICATION_ERROR]', error)
    }
  }

  /**
   * Send subscription status change notification
   */
  static async sendStatusChange(subscription: any, previousStatus: string, newStatus: string) {
    try {
      const statusMessages = {
        paused: 'paused',
        active: 'resumed',
        cancelled: 'cancelled'
      }

      const action = statusMessages[newStatus as keyof typeof statusMessages] || newStatus

      // Email notification
      if (subscription.userEmail) {
        await this.sendEmail({
          to: subscription.userEmail,
          subject: `Sadqa Subscription ${action.charAt(0).toUpperCase() + action.slice(1)}`,
          template: 'subscription-status-change',
          data: {
            userName: subscription.userName,
            planType: subscription.planType,
            amount: subscription.amount,
            previousStatus,
            newStatus,
            action,
            subscriptionId: subscription._id
          }
        })
      }

      // SMS notification
      if (subscription.userPhone) {
        await this.sendSMS({
          to: subscription.userPhone,
          message: `Assalamu Alaikum ${subscription.userName}. Your ${subscription.planType} Sadqa subscription has been ${action}. Contact us if you have any questions.`
        })
      }

      // WhatsApp notification
      if (subscription.userPhone) {
        const statusEmojis = {
          paused: '⏸️',
          active: '▶️',
          cancelled: '❌'
        }

        const emoji = statusEmojis[newStatus as keyof typeof statusEmojis] || '📋'

        await this.sendWhatsApp({
          to: subscription.userPhone,
          message: `${emoji} *Subscription ${action.charAt(0).toUpperCase() + action.slice(1)}* ${emoji}\n\nAssalamu Alaikum ${subscription.userName},\n\nYour ${subscription.planType} Sadqa subscription has been ${action}.\n\n💰 Amount: ₹${subscription.amount}\n📅 ${action.charAt(0).toUpperCase() + action.slice(1)} on: ${new Date().toLocaleDateString()}\n\nIf you have any questions, please contact our support team.\n\n*Khadim-e-Millat Welfare Foundation*`
        })
      }

    } catch (error) {
      console.error('[SUBSCRIPTION_STATUS_CHANGE_NOTIFICATION_ERROR]', error)
    }
  }

  /**
   * Send monthly summary report
   */
  static async sendMonthlySummary(subscription: any, monthlyStats: any) {
    try {
      if (!subscription.userEmail) return

      await this.sendEmail({
        to: subscription.userEmail,
        subject: 'Monthly Sadqa Subscription Summary',
        template: 'subscription-monthly-summary',
        data: {
          userName: subscription.userName,
          planType: subscription.planType,
          monthlyAmount: subscription.amount,
          paymentsThisMonth: monthlyStats.paymentsThisMonth,
          totalThisMonth: monthlyStats.totalThisMonth,
          totalAllTime: subscription.totalPaid,
          nextPaymentDate: subscription.nextPaymentDate,
          subscriptionId: subscription._id
        }
      })

    } catch (error) {
      console.error('[SUBSCRIPTION_MONTHLY_SUMMARY_ERROR]', error)
    }
  }

  /**
   * Send email notification
   */
  private static async sendEmail(emailData: any) {
    try {
      // Implement email sending logic here
      // This would integrate with your existing email service
      console.log('[SUBSCRIPTION_EMAIL_SENT]', emailData.to, emailData.subject)
    } catch (error) {
      console.error('[SUBSCRIPTION_EMAIL_ERROR]', error)
    }
  }

  /**
   * Send SMS notification
   */
  private static async sendSMS(smsData: any) {
    try {
      // Implement SMS sending logic here
      // This would integrate with your existing SMS service
      console.log('[SUBSCRIPTION_SMS_SENT]', smsData.to)
    } catch (error) {
      console.error('[SUBSCRIPTION_SMS_ERROR]', error)
    }
  }

  /**
   * Send WhatsApp notification
   */
  private static async sendWhatsApp(whatsappData: any) {
    try {
      // Reuse existing WhatsApp service
      const { whatsappService } = await import('./whatsapp.service')
      await whatsappService.sendMessage({
        to: whatsappData.to,
        message: whatsappData.message,
        type: 'text'
      })
      console.log('[SUBSCRIPTION_WHATSAPP_SENT]', whatsappData.to)
    } catch (error) {
      console.error('[SUBSCRIPTION_WHATSAPP_ERROR]', error)
    }
  }
}