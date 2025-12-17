import Razorpay from 'razorpay'
import connectDB from '@/lib/db'
import SadqaSubscription from '@/models/SadqaSubscription'
import SadqaSubscriptionPlan from '@/models/SadqaSubscriptionPlan'
import CampaignDonation from '@/models/CampaignDonation'
import WelfareProgram from '@/models/WelfareProgram'
import User from '@/models/User'
import { razorpayService } from './razorpay.service'

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!
})

interface CreateSubscriptionData {
  clerkUserId: string
  userEmail?: string
  userName: string
  userPhone?: string
  planType: 'daily' | 'weekly' | 'monthly' | 'yearly'
  amount: number
  startDate?: Date
}

interface RazorpayWebhookEvent {
  event: string
  payload: {
    subscription: {
      entity: any
    }
    payment?: {
      entity: any
    }
  }
}

export class SadqaSubscriptionService {
  
  /**
   * Create a subscription following Razorpay's official guide
   */
  static async createSubscription(data: CreateSubscriptionData) {
    try {
      await connectDB()

      // Generate temporary email if not provided
      const userEmail = data.userEmail || `temp_${data.clerkUserId}@khadimemillat.org`

      // Get subscription plan details
      const plan = await SadqaSubscriptionPlan.findOne({ 
        planType: data.planType, 
        isActive: true 
      })

      if (!plan) {
        return { success: false, error: 'Invalid subscription plan' }
      }

      // Get or create Razorpay customer
      const customerId = await this.getOrCreateCustomer(data.clerkUserId, {
        name: data.userName,
        email: userEmail,
        contact: data.userPhone
      })

      // Create Razorpay plan
      const razorpayPlan = await this.createRazorpayPlan(data.planType, data.amount, plan)

      // Calculate the actual amount for first payment
      let firstPaymentAmount = data.amount
      if (data.planType === 'daily') {
        // For daily plans, charge 7x the amount for the first week
        firstPaymentAmount = data.amount * 7
      }

      // Create Razorpay order for first payment
      const order = await razorpayService.createDonationOrder({
        amount: firstPaymentAmount,
        currency: 'INR',
        donationId: `subscription_${Date.now()}`,
        donorEmail: userEmail,
        donorPhone: data.userPhone
      })

      // Create subscription record in pending state
      const subscription = new SadqaSubscription({
        clerkUserId: data.clerkUserId,
        userEmail: userEmail,
        userName: data.userName,
        userPhone: data.userPhone,
        planType: data.planType,
        amount: data.amount,
        currency: 'INR',
        razorpayCustomerId: customerId,
        razorpayOrderId: order.id,
        razorpaySubscriptionId: `pending_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Unique temp ID
        status: 'pending_payment',
        startDate: new Date(),
        // Store plan details for later subscription creation
        tempPlanId: (razorpayPlan as any).id
      })

      await subscription.save()

      return { 
        success: true, 
        subscription: subscription.toObject(),
        order: {
          id: order.id,
          amount: order.amount,
          currency: order.currency
        },
        razorpayKeyId: process.env.RAZORPAY_KEY_ID
      }

    } catch (error: any) {
      console.error('Error creating subscription:', error)
      
      // Handle duplicate key error
      if (error.code === 11000 && error.keyPattern?.razorpaySubscriptionId) {
        return { 
          success: false, 
          error: 'Database index issue. Please try again or contact support.' 
        }
      }
      
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create subscription' 
      }
    }
  }



  /**
   * Process subscription webhook events
   */
  static async processSubscriptionWebhook(webhookEvent: RazorpayWebhookEvent) {
    try {
      await connectDB()

      const { event, payload } = webhookEvent
      const subscriptionEntity = payload.subscription.entity
      const paymentEntity = payload.payment?.entity

      // Find subscription record
      const subscription = await SadqaSubscription.findOne({
        razorpaySubscriptionId: subscriptionEntity.id
      })

      if (!subscription) {
        console.warn('[SUBSCRIPTION_NOT_FOUND]', subscriptionEntity.id)
        return
      }

      console.log(`[SUBSCRIPTION_WEBHOOK] ${event} for ${subscriptionEntity.id}`)

      if (event === 'subscription.activated') {
        // First payment successful, subscription is now active
        await this.handleSubscriptionActivated(subscription, subscriptionEntity)
      } else if (event === 'subscription.charged') {
        // Recurring payment successful
        await this.handleSuccessfulPayment(subscription, paymentEntity)
      } else if (event === 'subscription.halted') {
        // Payment failed
        await this.handleFailedPayment(subscription, paymentEntity)
      } else if (event === 'subscription.cancelled') {
        // Subscription cancelled
        await this.handleSubscriptionCancelled(subscription)
      }

    } catch (error) {
      console.error('Error processing subscription webhook:', error)
      throw error
    }
  }

  /**
   * Complete subscription after first payment
   */
  static async completeSubscriptionAfterPayment(orderId: string, paymentId: string) {
    try {
      await connectDB()

      // Find subscription by order ID
      const subscription = await SadqaSubscription.findOne({ razorpayOrderId: orderId })
      if (!subscription) {
        console.error('[SUBSCRIPTION_NOT_FOUND_FOR_ORDER]', orderId)
        return { success: false, error: 'Subscription not found' }
      }

      // Get appropriate total_count based on plan type
      const totalCount = this.getTotalCountForPlan(subscription.planType)

      // Create actual Razorpay subscription now that first payment is done
      let razorpaySubscription
      try {
        razorpaySubscription = await razorpay.subscriptions.create({
          plan_id: subscription.tempPlanId,
          customer_id: subscription.razorpayCustomerId,
          total_count: totalCount,
          notes: {
            clerkUserId: subscription.clerkUserId,
            planType: subscription.planType,
            createdBy: 'sadqa-subscription-system',
            firstPaymentId: paymentId
          }
        } as any)
      } catch (razorpayError: any) {
        console.error('[RAZORPAY_SUBSCRIPTION_CREATE_ERROR]', razorpayError)
        
        // If subscription creation fails but payment was successful,
        // still activate the subscription locally without Razorpay recurring
        console.log('[ACTIVATING_WITHOUT_RAZORPAY_SUBSCRIPTION]', subscription._id)
        
        subscription.razorpaySubscriptionId = `manual_${Date.now()}_${subscription._id}`
        subscription.razorpayPlanId = subscription.tempPlanId
        subscription.razorpayPaymentId = paymentId
        subscription.status = 'active'
        subscription.nextPaymentDate = this.calculateNextPaymentDate(new Date(), subscription.planType)
        subscription.totalPaid = subscription.amount
        subscription.paymentCount = 1
        subscription.lastPaymentDate = new Date()
        subscription.tempPlanId = undefined
        subscription.notes = `Activated manually due to Razorpay subscription creation failure: ${razorpayError.error?.description || razorpayError.message}`

        await subscription.save()

        // Create first donation record
        await this.createFirstDonationRecord(subscription, orderId, paymentId)

        // Update user stats
        await this.updateUserSubscriptionStats(subscription.clerkUserId)

        console.log(`[SUBSCRIPTION_ACTIVATED_MANUALLY] ${subscription._id}`)
        return { success: true, subscription: subscription.toObject() }
      }

      // Calculate actual amount paid for first payment
      let actualAmountPaid = subscription.amount
      if (subscription.planType === 'daily') {
        actualAmountPaid = subscription.amount * 7 // Weekly amount for daily plan
      }

      // Update subscription with Razorpay details
      subscription.razorpaySubscriptionId = razorpaySubscription.id // Replace temp ID with real ID
      subscription.razorpayPlanId = subscription.tempPlanId
      subscription.razorpayPaymentId = paymentId
      subscription.status = 'active'
      subscription.nextPaymentDate = this.calculateNextPaymentDate(new Date(), subscription.planType)
      subscription.totalPaid = actualAmountPaid
      subscription.paymentCount = 1
      subscription.lastPaymentDate = new Date()
      subscription.tempPlanId = undefined // Clear temp field

      await subscription.save()

      // Create first donation record
      await this.createFirstDonationRecord(subscription, orderId, paymentId)

      // Update user stats
      await this.updateUserSubscriptionStats(subscription.clerkUserId)

      // Send activation notification
      try {
        const { SubscriptionNotificationService } = await import('./subscription-notification.service')
        await SubscriptionNotificationService.sendSubscriptionCreated(subscription)
      } catch (notificationError) {
        console.warn('[SUBSCRIPTION_ACTIVATION_NOTIFICATION_FAILED]', notificationError)
      }

      console.log(`[SUBSCRIPTION_COMPLETED] ${subscription._id}`)
      return { success: true, subscription: subscription.toObject() }

    } catch (error) {
      console.error('Error completing subscription after payment:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to complete subscription' 
      }
    }
  }

  /**
   * Create first donation record
   */
  private static async createFirstDonationRecord(subscription: any, orderId: string, paymentId: string) {
    const sadqaProgram = await WelfareProgram.findOne({ 
      slug: 'sadqa',
      isActive: true 
    })

    if (sadqaProgram) {
      // Calculate actual amount paid
      let actualAmountPaid = subscription.amount
      if (subscription.planType === 'daily') {
        actualAmountPaid = subscription.amount * 7 // Weekly amount for daily plan
      }

      const donation = new CampaignDonation({
        programId: sadqaProgram._id,
        donorId: subscription.clerkUserId,
        donorName: subscription.userName,
        donorEmail: subscription.userEmail,
        donorPhone: subscription.userPhone,
        amount: actualAmountPaid,
        paymentMethod: 'online',
        status: 'completed',
        razorpayPaymentId: paymentId,
        razorpayOrderId: orderId,
        paymentVerified: true,
        paymentVerifiedAt: new Date(),
        // Subscription fields
        subscriptionId: subscription._id,
        isRecurring: true,
        recurringType: subscription.planType,
        paymentSequence: 1,
        receiptPreferences: { email: true, sms: true, razorpayManaged: false },
        // Add note for daily subscriptions
        notes: subscription.planType === 'daily' ? 
          `Weekly payment of ₹${actualAmountPaid} for daily ₹${subscription.amount} subscription` : 
          undefined
      })

      await donation.save()
    }
  }

  /**
   * Handle subscription activation (first payment successful)
   */
  private static async handleSubscriptionActivated(subscription: any, subscriptionEntity: any) {
    // Update subscription status to active
    subscription.status = 'active'
    subscription.nextPaymentDate = this.calculateNextPaymentDate(new Date(), subscription.planType)
    subscription.totalPaid = subscription.amount
    subscription.paymentCount = 1
    subscription.lastPaymentDate = new Date()

    await subscription.save()

    // Create first donation record
    const sadqaProgram = await WelfareProgram.findOne({ 
      slug: 'sadqa',
      isActive: true 
    })

    if (sadqaProgram) {
      const donation = new CampaignDonation({
        programId: sadqaProgram._id,
        donorId: subscription.clerkUserId,
        donorName: subscription.userName,
        donorEmail: subscription.userEmail,
        donorPhone: subscription.userPhone,
        amount: subscription.amount,
        paymentMethod: 'online',
        status: 'completed',
        paymentVerified: true,
        paymentVerifiedAt: new Date(),
        // Subscription fields
        subscriptionId: subscription._id,
        isRecurring: true,
        recurringType: subscription.planType,
        paymentSequence: 1,
        receiptPreferences: { email: true, sms: true, razorpayManaged: false }
      })

      await donation.save()
    }

    // Update user stats
    await this.updateUserSubscriptionStats(subscription.clerkUserId)

    // Send activation notification
    try {
      const { SubscriptionNotificationService } = await import('./subscription-notification.service')
      await SubscriptionNotificationService.sendSubscriptionCreated(subscription)
    } catch (notificationError) {
      console.warn('[SUBSCRIPTION_ACTIVATION_NOTIFICATION_FAILED]', notificationError)
    }

    console.log(`[SUBSCRIPTION_ACTIVATED] ${subscription._id}`)
  }

  /**
   * Sync subscription status with Razorpay
   */
  static async syncSubscriptionStatus(subscriptionId: string) {
    try {
      await connectDB()

      const subscription = await SadqaSubscription.findById(subscriptionId)
      if (!subscription || !subscription.razorpaySubscriptionId) {
        return { success: false, error: 'Subscription not found or not linked to Razorpay' }
      }

      // Skip sync for manual subscriptions
      if (subscription.razorpaySubscriptionId.startsWith('manual_') || subscription.razorpaySubscriptionId.startsWith('pending_')) {
        return { 
          success: true, 
          subscription: subscription.toObject(),
          statusChanged: false
        }
      }

      // Fetch current status from Razorpay
      let razorpaySubscription
      try {
        razorpaySubscription = await razorpay.subscriptions.fetch(subscription.razorpaySubscriptionId)
        if (!razorpaySubscription || !razorpaySubscription.status) {
          console.warn(`[RAZORPAY_SUBSCRIPTION_NOT_FOUND] ${subscription.razorpaySubscriptionId}`)
          return { success: false, error: 'Razorpay subscription not found' }
        }
      } catch (fetchError) {
        console.error(`[RAZORPAY_FETCH_ERROR] ${subscription.razorpaySubscriptionId}:`, fetchError)
        return { success: false, error: 'Failed to fetch subscription from Razorpay' }
      }

      const razorpayStatus = razorpaySubscription.status

      // Map Razorpay status to our status
      let newStatus = subscription.status
      if (razorpayStatus === 'active') {
        newStatus = 'active'
      } else if (razorpayStatus === 'halted') {
        newStatus = 'paused'
      } else if (razorpayStatus === 'cancelled') {
        newStatus = 'cancelled'
      } else if (razorpayStatus === 'expired') {
        newStatus = 'expired'
      } else if (razorpayStatus === 'created') {
        // Keep current status if Razorpay is still in created state
        // But add a note about the pending activation
        if (subscription.status === 'active') {
          newStatus = 'pending_payment'
          subscription.notes = 'Subscription created, waiting for Razorpay activation'
        }
      }

      // Update local status if different
      if (newStatus !== subscription.status) {
        subscription.status = newStatus as any
        if (newStatus === 'expired' || newStatus === 'cancelled') {
          subscription.endDate = new Date()
        }
        await subscription.save()
        
        console.log(`[SUBSCRIPTION_STATUS_SYNCED] ${subscriptionId}: ${subscription.status} -> ${newStatus}`)
      }

      return { 
        success: true, 
        subscription: subscription.toObject(),
        statusChanged: newStatus !== subscription.status
      }

    } catch (error) {
      console.error('Error syncing subscription status:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to sync subscription status'
      }
    }
  }

  /**
   * Update subscription status
   */
  static async updateSubscriptionStatus(
    subscriptionId: string, 
    status: string, 
    reason?: string,
    adminUserId?: string,
    adminNotes?: string
  ) {
    try {
      await connectDB()

      const subscription = await SadqaSubscription.findById(subscriptionId)
      if (!subscription) {
        return { success: false, error: 'Subscription not found' }
      }

      // First sync with Razorpay to get current status (only if we have a real Razorpay subscription ID)
      if (subscription.razorpaySubscriptionId && 
          !subscription.razorpaySubscriptionId.startsWith('manual_') && 
          !subscription.razorpaySubscriptionId.startsWith('pending_') &&
          subscription.status === 'active') { // Only sync if subscription is active in our system
        try {
          const syncResult = await this.syncSubscriptionStatus(subscriptionId)
          if (syncResult.success && syncResult.statusChanged) {
            // Refresh subscription data after sync
            const updatedSubscription = await SadqaSubscription.findById(subscriptionId)
            if (updatedSubscription) {
              Object.assign(subscription, updatedSubscription.toObject())
            }
          }
        } catch (syncError) {
          console.warn(`[SUBSCRIPTION_SYNC_FAILED] ${subscriptionId}:`, syncError)
          // Continue with local update even if sync fails
        }
      }

      const previousStatus = subscription.status

      // Check if the requested status change is valid
      if (subscription.status === 'expired' && status !== 'cancelled') {
        return { 
          success: false, 
          error: 'Cannot change status of expired subscription. Please cancel it instead.' 
        }
      }

      if (subscription.status === 'cancelled' && status !== 'cancelled') {
        return { 
          success: false, 
          error: 'Cannot reactivate cancelled subscription' 
        }
      }

      if (subscription.status === 'pending_payment') {
        // Check if this is a manual subscription that should be active
        if (subscription.razorpaySubscriptionId && subscription.razorpaySubscriptionId.startsWith('manual_')) {
          // This is a manual subscription, should be active
          subscription.status = 'active'
          await subscription.save()
        } else if (subscription.razorpayPaymentId) {
          // Payment was completed but status wasn't updated - fix it
          console.log('[AUTO_FIXING_STUCK_SUBSCRIPTION]', subscriptionId)
          subscription.status = 'active'
          subscription.totalPaid = subscription.amount * (subscription.planType === 'daily' ? 7 : 1)
          subscription.paymentCount = 1
          subscription.lastPaymentDate = new Date()
          subscription.nextPaymentDate = this.calculateNextPaymentDate(new Date(), subscription.planType)
          await subscription.save()
          console.log('[SUBSCRIPTION_AUTO_FIXED]', subscriptionId)
        } else {
          return { 
            success: false, 
            error: 'Subscription is pending payment. Please complete the payment first.' 
          }
        }
      }

      // Update Razorpay subscription if needed and subscription is not expired
      // Skip Razorpay operations for manual subscriptions
      if (subscription.razorpaySubscriptionId && 
          subscription.status !== 'expired' && 
          !subscription.razorpaySubscriptionId.startsWith('manual_') && 
          !subscription.razorpaySubscriptionId.startsWith('pending_')) {
        try {
          // Verify subscription exists before attempting operations
          const razorpaySubscription = await razorpay.subscriptions.fetch(subscription.razorpaySubscriptionId)
          if (!razorpaySubscription) {
            throw new Error('Razorpay subscription not found')
          }

          if (status === 'paused') {
            await (razorpay.subscriptions as any).pause(subscription.razorpaySubscriptionId, {
              pause_at: 'now'
            })
          } else if (status === 'active' && previousStatus === 'paused') {
            await (razorpay.subscriptions as any).resume(subscription.razorpaySubscriptionId, {
              resume_at: 'now'
            })
          } else if (status === 'cancelled') {
            await razorpay.subscriptions.cancel(subscription.razorpaySubscriptionId, true)
          }
        } catch (razorpayError: any) {
          console.error('[RAZORPAY_UPDATE_ERROR]', razorpayError)
          const errorDesc = razorpayError.error?.description || ''
          
          // Handle various Razorpay subscription states
          if (errorDesc.includes('expired') || errorDesc.includes('not cancellable')) {
            subscription.status = 'expired'
            subscription.endDate = new Date()
            await subscription.save()
            
            // For expired subscriptions, only allow marking as cancelled locally
            if (status === 'cancelled') {
              subscription.status = 'cancelled'
              subscription.cancelledReason = reason || 'Subscription expired'
              await subscription.save()
              
              return { 
                success: true, 
                subscription: subscription.toObject(),
                message: 'Expired subscription marked as cancelled'
              }
            }
            
            return { 
              success: false, 
              error: 'Subscription has expired and cannot be modified. You can only cancel it.' 
            }
          }
          
          // Handle created state or no billing cycle - subscription not properly active
          if (errorDesc.includes('created state') || errorDesc.includes('no billing cycle')) {
            console.warn(`[RAZORPAY_SUBSCRIPTION_NOT_ACTIVE] ${subscriptionId}: ${errorDesc}`)
            // Convert to manual subscription and continue with local update
            subscription.razorpaySubscriptionId = `manual_${Date.now()}_${subscriptionId}`
            subscription.notes = `Converted to manual subscription due to Razorpay issue: ${errorDesc}`
            // Continue with local update below
          }
          // Handle subscription not found - allow local update only
          else if (errorDesc.includes('not found') || razorpayError.message?.includes('not found')) {
            console.warn(`[RAZORPAY_SUBSCRIPTION_NOT_FOUND] Updating local status only for ${subscriptionId}`)
            // Continue with local update below
          } else {
            throw razorpayError
          }
        }
      }

      // Update subscription record (this should always work even if Razorpay fails)
      try {
        subscription.status = status as any
        if (status === 'paused') {
          subscription.pausedReason = reason
        } else if (status === 'cancelled') {
          subscription.cancelledReason = reason
          subscription.endDate = new Date()
        }

        // Add admin notes if provided
        if (adminUserId && adminNotes) {
          subscription.notes = `${subscription.notes || ''}\n[Admin ${adminUserId}]: ${adminNotes}`.trim()
        }

        await subscription.save()

        // Update user stats
        await this.updateUserSubscriptionStats(subscription.clerkUserId)

        // Send status change notification
        try {
          const { SubscriptionNotificationService } = await import('./subscription-notification.service')
          await SubscriptionNotificationService.sendStatusChange(subscription, previousStatus, status)
        } catch (notificationError) {
          console.warn('[SUBSCRIPTION_STATUS_NOTIFICATION_FAILED]', notificationError)
        }

        return { 
          success: true, 
          subscription: subscription.toObject() 
        }
      } catch (saveError) {
        console.error('Error saving subscription:', saveError)
        return { 
          success: false, 
          error: 'Failed to update subscription in database' 
        }
      }

    } catch (error) {
      console.error('Error updating subscription status:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update subscription status' 
      }
    }
  }

  /**
   * Get or create Razorpay customer
   */
  private static async getOrCreateCustomer(clerkUserId: string, customerData: any) {
    try {
      // Check if user already has a Razorpay customer ID
      const user = await User.findOne({ clerkUserId })
      
      if (user?.razorpayCustomerId) {
        // Verify the customer still exists in Razorpay
        try {
          await razorpay.customers.fetch(user.razorpayCustomerId)
          return user.razorpayCustomerId
        } catch (fetchError) {
          console.warn('[RAZORPAY_CUSTOMER_NOT_FOUND]', user.razorpayCustomerId)
          // Customer doesn't exist in Razorpay, clear the ID and create new
          user.razorpayCustomerId = undefined
          await user.save()
        }
      }

      // Try to create new Razorpay customer
      try {
        const customer = await razorpay.customers.create({
          name: customerData.name,
          email: customerData.email,
          contact: customerData.contact,
          notes: {
            clerkUserId,
            createdBy: 'sadqa-subscription-system'
          }
        })

        // Update user record with customer ID
        if (user) {
          user.razorpayCustomerId = customer.id
          await user.save()
        } else {
          // Create user record if it doesn't exist
          await User.create({
            clerkUserId,
            name: customerData.name,
            email: customerData.email,
            phone: customerData.contact,
            role: 'user',
            razorpayCustomerId: customer.id
          })
        }

        return customer.id

      } catch (createError: any) {
        // If customer already exists, try to find existing customer
        if (createError.statusCode === 400 && createError.error?.description?.includes('Customer already exists')) {
          console.log('[RAZORPAY_CUSTOMER_EXISTS]', 'Searching for existing customer')
          
          // Search for existing customer by email or contact
          try {
            const customers = await razorpay.customers.all({
              count: 100
            })
            
            const existingCustomer = customers.items.find((c: any) => 
              c.email === customerData.email || 
              c.contact === customerData.contact ||
              c.notes?.clerkUserId === clerkUserId
            )

            if (existingCustomer) {
              console.log('[RAZORPAY_CUSTOMER_FOUND]', existingCustomer.id)
              
              // Update user record with found customer ID
              if (user) {
                user.razorpayCustomerId = existingCustomer.id
                await user.save()
              } else {
                await User.create({
                  clerkUserId,
                  name: customerData.name,
                  email: customerData.email,
                  phone: customerData.contact,
                  role: 'user',
                  razorpayCustomerId: existingCustomer.id
                })
              }

              return existingCustomer.id
            }
          } catch (searchError) {
            console.error('[RAZORPAY_CUSTOMER_SEARCH_ERROR]', searchError)
          }
        }
        
        throw createError
      }
    } catch (error) {
      console.error('[GET_OR_CREATE_CUSTOMER_ERROR]', error)
      throw error
    }
  }

  /**
   * Get appropriate total_count for Razorpay subscription based on plan type
   */
  private static getTotalCountForPlan(planType: string): number {
    // Based on Razorpay limits and our actual plan intervals
    const totalCountLimits = {
      daily: 1200,   // Weekly period, interval 1 - max 1200 (23 years)
      weekly: 600,   // Weekly period, interval 2 (bi-weekly) - max 600 (23 years) 
      monthly: 1200, // Monthly period, interval 1 - max 1200 (100 years)
      yearly: 1200   // Yearly period, interval 1 - max 1200 (1200 years)
    }
    
    return totalCountLimits[planType as keyof typeof totalCountLimits] || 600
  }

  /**
   * Create Razorpay plan for subscription
   */
  private static async createRazorpayPlan(planType: string, amount: number, planDetails: any) {
    const intervalMap = {
      daily: { period: 'weekly', interval: 1 }, // Weekly (closest to daily due to Razorpay limits)
      weekly: { period: 'weekly', interval: 2 }, // Bi-weekly
      monthly: { period: 'monthly', interval: 1 },
      yearly: { period: 'yearly', interval: 1 }
    }

    const interval = intervalMap[planType as keyof typeof intervalMap]
    
    // Calculate the actual amount to charge based on plan type
    let actualAmount = amount
    if (planType === 'daily') {
      // For daily plans, charge 7x the amount since we're billing weekly
      actualAmount = amount * 7
    }

    return await razorpay.plans.create({
      period: interval.period as any,
      interval: interval.interval,
      item: {
        name: `Sadqa Subscription - ${planDetails.displayName}`,
        amount: actualAmount * 100, // Convert to paise
        currency: 'INR',
        description: planDetails.description
      },
      notes: {
        planType,
        dailyAmount: amount.toString(), // Store the original daily amount
        weeklyAmount: actualAmount.toString(), // Store the actual weekly amount
        createdBy: 'sadqa-subscription-system'
      }
    } as any)
  }

  /**
   * Calculate next payment date based on plan type
   */
  private static calculateNextPaymentDate(startDate: Date, planType: string): Date {
    const nextDate = new Date(startDate)
    
    switch (planType) {
      case 'daily':
        // Due to Razorpay limitations, "daily" is actually weekly
        nextDate.setDate(nextDate.getDate() + 7)
        break
      case 'weekly':
        // Bi-weekly (every 2 weeks)
        nextDate.setDate(nextDate.getDate() + 14)
        break
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1)
        break
      case 'yearly':
        nextDate.setFullYear(nextDate.getFullYear() + 1)
        break
    }
    
    return nextDate
  }

  /**
   * Handle successful recurring payment
   */
  private static async handleSuccessfulPayment(subscription: any, paymentEntity: any) {
    // Find Sadqa welfare program
    const sadqaProgram = await WelfareProgram.findOne({ 
      slug: 'sadqa',
      isActive: true 
    })

    if (!sadqaProgram) {
      console.error('[SADQA_PROGRAM_NOT_FOUND]')
      return
    }

    // Calculate actual amount paid for recurring payment
    let recurringAmountPaid = subscription.amount
    if (subscription.planType === 'daily') {
      recurringAmountPaid = subscription.amount * 7 // Weekly amount for daily plan
    }

    // Create donation record
    const donation = new CampaignDonation({
      programId: sadqaProgram._id,
      donorId: subscription.clerkUserId,
      donorName: subscription.userName,
      donorEmail: subscription.userEmail,
      donorPhone: subscription.userPhone,
      amount: recurringAmountPaid,
      paymentMethod: 'online',
      status: 'completed',
      razorpayPaymentId: paymentEntity?.id,
      paymentVerified: true,
      paymentVerifiedAt: new Date(),
      // Subscription fields
      subscriptionId: subscription._id,
      isRecurring: true,
      recurringType: subscription.planType,
      subscriptionPaymentId: paymentEntity?.id,
      paymentSequence: subscription.paymentCount + 1,
      receiptPreferences: { email: true, sms: true, razorpayManaged: false },
      // Add note for daily subscriptions
      notes: subscription.planType === 'daily' ? 
        `Weekly payment of ₹${recurringAmountPaid} for daily ₹${subscription.amount} subscription` : 
        undefined
    })

    await donation.save()

    // Update subscription payment tracking
    subscription.totalPaid += recurringAmountPaid
    subscription.paymentCount += 1
    subscription.lastPaymentDate = new Date()
    subscription.nextPaymentDate = this.calculateNextPaymentDate(new Date(), subscription.planType)
    subscription.failedPaymentCount = 0 // Reset failed count on success

    await subscription.save()

    // Update user stats
    await this.updateUserSubscriptionStats(subscription.clerkUserId)

    // Send receipt and notifications
    try {
      const { SubscriptionNotificationService } = await import('./subscription-notification.service')
      await SubscriptionNotificationService.sendPaymentReceipt(donation, subscription)
    } catch (notificationError) {
      console.warn('[SUBSCRIPTION_PAYMENT_NOTIFICATION_FAILED]', notificationError)
    }
  }

  /**
   * Handle failed recurring payment
   */
  private static async handleFailedPayment(subscription: any, _paymentEntity: any) {
    subscription.failedPaymentCount += 1

    // Auto-pause after 3 consecutive failures
    if (subscription.failedPaymentCount >= 3) {
      subscription.status = 'paused'
      subscription.pausedReason = 'Multiple payment failures'
      
      // Pause Razorpay subscription
      try {
        await (razorpay.subscriptions as any).pause(subscription.razorpaySubscriptionId, {
          pause_at: 'now'
        })
      } catch (razorpayError) {
        console.error('[RAZORPAY_PAUSE_ERROR]', razorpayError)
      }
    }

    await subscription.save()

    // Send failure notification
    try {
      const { SubscriptionNotificationService } = await import('./subscription-notification.service')
      await SubscriptionNotificationService.sendPaymentFailed(subscription, subscription.failedPaymentCount)
    } catch (notificationError) {
      console.warn('[SUBSCRIPTION_FAILURE_NOTIFICATION_FAILED]', notificationError)
    }
  }

  /**
   * Handle subscription cancellation
   */
  private static async handleSubscriptionCancelled(subscription: any) {
    subscription.status = 'cancelled'
    subscription.endDate = new Date()
    subscription.cancelledReason = subscription.cancelledReason || 'Cancelled via Razorpay'

    await subscription.save()

    // Update user stats
    await this.updateUserSubscriptionStats(subscription.clerkUserId)
  }





  /**
   * Get user subscriptions with status sync
   */
  static async getUserSubscriptions(clerkUserId: string) {
    try {
      await connectDB()
      const subscriptions = await SadqaSubscription.find({ clerkUserId }).sort({ createdAt: -1 })
      return { success: true, subscriptions }

    } catch (error) {
      console.error('Error fetching user subscriptions:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch subscriptions' 
      }
    }
  }

  /**
   * Update user subscription statistics
   */
  private static async updateUserSubscriptionStats(clerkUserId: string) {
    const stats = await SadqaSubscription.aggregate([
      { $match: { clerkUserId } },
      {
        $group: {
          _id: null,
          totalSubscriptions: { $sum: 1 },
          activeSubscriptions: { 
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } 
          },
          totalRecurringDonated: { $sum: '$totalPaid' },
          longestSubscriptionDays: {
            $max: {
              $divide: [
                { $subtract: [new Date(), '$startDate'] },
                1000 * 60 * 60 * 24
              ]
            }
          }
        }
      }
    ])

    const userStats = stats[0] || {
      totalSubscriptions: 0,
      activeSubscriptions: 0,
      totalRecurringDonated: 0,
      longestSubscriptionDays: 0
    }

    await User.findOneAndUpdate(
      { clerkUserId },
      { 
        $set: { 
          subscriptionStats: userStats 
        }
      },
      { upsert: true }
    )
  }
}