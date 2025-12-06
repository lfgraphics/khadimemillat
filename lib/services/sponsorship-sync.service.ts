import connectDB from '@/lib/db'
import Sponsorship from '@/models/Sponsorship'
import { RazorpaySubscriptionService } from './razorpay-subscription.service'

export class SponsorshipSyncService {
  /**
   * Sync sponsorship status with Razorpay
   */
  static async syncSponsorshipStatus(sponsorshipId: string) {
    try {
      await connectDB()
      
      const sponsorship = await Sponsorship.findById(sponsorshipId)
      if (!sponsorship) {
        throw new Error('Sponsorship not found')
      }

      // Skip sync for manual sponsorships (those without Razorpay subscription ID)
      if (!sponsorship.razorpaySubscriptionId) {
        console.log(`[SPONSORSHIP_SYNC] Skipping sync for manual sponsorship: ${sponsorshipId}`)
        return { success: true, message: 'Manual sponsorship - no sync needed' }
      }

      // Get current status from Razorpay
      const result = await RazorpaySubscriptionService.getSubscription(sponsorship.razorpaySubscriptionId)
      
      if (!result.success) {
        console.error(`[SPONSORSHIP_SYNC] Failed to fetch Razorpay subscription: ${result.error}`)
        
        // If subscription not found in Razorpay, convert to manual
        if (result.error?.includes('not found') || result.error?.includes('does not exist')) {
          sponsorship.razorpaySubscriptionId = undefined
          sponsorship.status = 'active' // Keep as active but manual
          await sponsorship.save()
          
          return { 
            success: true, 
            message: 'Converted to manual sponsorship - Razorpay subscription not found',
            converted: true 
          }
        }
        
        return { success: false, error: result.error }
      }

      const razorpaySubscription = result.subscription
      if (!razorpaySubscription) {
        return { success: false, error: 'No subscription data received from Razorpay' }
      }

      let statusChanged = false

      // Map Razorpay status to our status
      const statusMapping: Record<string, string> = {
        'created': 'pending',
        'authenticated': 'pending', 
        'active': 'active',
        'paused': 'paused',
        'halted': 'paused',
        'cancelled': 'cancelled',
        'completed': 'completed',
        'expired': 'cancelled'
      }

      const newStatus = statusMapping[razorpaySubscription.status] || sponsorship.status

      if (sponsorship.status !== newStatus) {
        sponsorship.status = newStatus as any
        statusChanged = true
      }

      // Update next payment date if available
      if (razorpaySubscription.current_end) {
        const nextPaymentDate = new Date(razorpaySubscription.current_end * 1000)
        if (sponsorship.nextPaymentDate?.getTime() !== nextPaymentDate.getTime()) {
          sponsorship.nextPaymentDate = nextPaymentDate
          statusChanged = true
        }
      }

      if (statusChanged) {
        await sponsorship.save()
      }

      return {
        success: true,
        statusChanged,
        oldStatus: statusChanged ? statusMapping[razorpaySubscription.status] : sponsorship.status,
        newStatus: sponsorship.status,
        razorpayStatus: razorpaySubscription.status
      }

    } catch (error) {
      console.error('[SPONSORSHIP_SYNC] Error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Sync failed'
      }
    }
  }

  /**
   * Sync all active sponsorships
   */
  static async syncAllSponsorships() {
    try {
      await connectDB()
      
      const sponsorships = await Sponsorship.find({
        status: { $in: ['active', 'pending', 'paused'] },
        razorpaySubscriptionId: { $exists: true, $ne: null }
      }).select('_id razorpaySubscriptionId status')

      const results = []
      
      for (const sponsorship of sponsorships) {
        const result = await this.syncSponsorshipStatus(sponsorship._id.toString())
        results.push({
          sponsorshipId: sponsorship._id.toString(),
          ...result
        })
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      const successful = results.filter(r => r.success).length
      const failed = results.filter(r => !r.success).length
      const converted = results.filter(r => r.converted).length

      return {
        success: true,
        total: results.length,
        successful,
        failed,
        converted,
        results
      }

    } catch (error) {
      console.error('[SPONSORSHIP_SYNC_ALL] Error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Bulk sync failed'
      }
    }
  }

  /**
   * Fix stuck sponsorships by activating them locally
   */
  static async fixStuckSponsorships(userId?: string) {
    try {
      await connectDB()
      
      const query: any = {
        status: { $in: ['pending', 'created'] }
      }
      
      if (userId) {
        query.sponsorId = userId
      }

      const stuckSponsorships = await Sponsorship.find(query)
      
      let fixedCount = 0
      
      for (const sponsorship of stuckSponsorships) {
        try {
          // Try to sync with Razorpay first
          const syncResult = await this.syncSponsorshipStatus(sponsorship._id.toString())
          
          if (syncResult.success && syncResult.statusChanged) {
            fixedCount++
          } else if (!syncResult.success) {
            // If sync fails, activate locally
            sponsorship.status = 'active'
            sponsorship.nextPaymentDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
            await sponsorship.save()
            fixedCount++
          }
        } catch (error) {
          console.error(`[FIX_STUCK] Error fixing sponsorship ${sponsorship._id}:`, error)
        }
      }

      return {
        success: true,
        message: `Fixed ${fixedCount} stuck sponsorships`,
        fixedCount,
        totalFound: stuckSponsorships.length
      }

    } catch (error) {
      console.error('[FIX_STUCK_SPONSORSHIPS] Error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fix stuck sponsorships'
      }
    }
  }
}