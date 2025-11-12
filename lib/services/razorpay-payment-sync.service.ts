import { razorpayService } from './razorpay.service'
import CampaignDonation from '@/models/CampaignDonation'
import { v4 as uuidv4 } from 'uuid'
import { addAuditLogEntry, updateDonationVisibility } from '@/lib/utils/audit-helpers'

export interface PaymentRecheckResult {
  paymentId: string
  previousStatus: string
  currentStatus: string
  razorpayResponse: any
  updatedAt: Date
  recheckSuccess: boolean
  errorMessage?: string
}

export class RazorpayPaymentSyncService {
  private maxRetries = 3
  private baseDelay = 1000 // 1 second

  async recheckPaymentStatus(
    donationId: string, 
    paymentId: string,
    userId: string
  ): Promise<PaymentRecheckResult> {
    let attempt = 0
    let lastError: Error | null = null

    while (attempt < this.maxRetries) {
      try {
        // Query Razorpay for current payment status
        const payment = await razorpayService.fetchPaymentDetails({ paymentId })
        
        // Update donation based on Razorpay response
        const result = await this.updateDonationFromRazorpay(
          donationId, 
          payment, 
          userId,
          attempt + 1
        )
        
        return result
      } catch (error) {
        lastError = error as Error
        attempt++
        
        if (attempt < this.maxRetries) {
          // Exponential backoff
          const delay = this.baseDelay * Math.pow(2, attempt - 1)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    // All retries failed
    await this.logFailedRecheck(donationId, paymentId, userId, lastError)
    throw new Error(`Payment recheck failed after ${this.maxRetries} attempts: ${lastError?.message}`)
  }

  private async updateDonationFromRazorpay(
    donationId: string,
    razorpayPayment: any,
    userId: string,
    retryAttempt: number
  ): Promise<PaymentRecheckResult> {
    const donation = await CampaignDonation.findById(donationId)
    if (!donation) {
      throw new Error('Donation not found')
    }

    const previousStatus = donation.status
    const previousPaymentVerified = donation.paymentVerified

    // Map Razorpay status to our system
    let newStatus = donation.status
    let newPaymentVerified = donation.paymentVerified

    switch (razorpayPayment.status) {
      case 'captured':
        newStatus = 'completed'
        newPaymentVerified = true
        break
      case 'failed':
        newStatus = 'failed'
        newPaymentVerified = false
        break
      case 'cancelled':
        newStatus = 'cancelled'
        newPaymentVerified = false
        break
      case 'created':
      case 'authorized':
        newStatus = 'pending'
        newPaymentVerified = false
        break
    }

    const recheckId = uuidv4()

    // Update donation if status changed
    if (newStatus !== previousStatus || newPaymentVerified !== previousPaymentVerified) {
      donation.status = newStatus
      donation.paymentVerified = newPaymentVerified
      
      if (newPaymentVerified) {
        donation.paymentVerifiedAt = new Date()
      }
      
      // Add audit log entry
      addAuditLogEntry(donation, {
        action: 'payment_rechecked',
        performedBy: userId,
        details: `Payment status rechecked with Razorpay. Status: ${razorpayPayment.status}`,
        previousValues: {
          status: previousStatus,
          paymentVerified: previousPaymentVerified
        }
      })

      // Update visibility based on new status (this will also log the visibility change)
      updateDonationVisibility(
        donation, 
        userId, 
        `Visibility updated after payment recheck. Payment verified: ${newPaymentVerified}`
      )

      // Add recheck history entry
      if (!donation.paymentRecheckHistory) {
        donation.paymentRecheckHistory = []
      }
      donation.paymentRecheckHistory.push({
        recheckId,
        performedBy: userId,
        performedAt: new Date(),
        razorpayPaymentId: razorpayPayment.id,
        previousStatus,
        newStatus,
        razorpayResponse: razorpayPayment,
        success: true,
        retryAttempt
      })

      await donation.save()
    } else {
      // Even if no status change, log the recheck attempt
      if (!donation.paymentRecheckHistory) {
        donation.paymentRecheckHistory = []
      }
      donation.paymentRecheckHistory.push({
        recheckId,
        performedBy: userId,
        performedAt: new Date(),
        razorpayPaymentId: razorpayPayment.id,
        previousStatus,
        newStatus,
        razorpayResponse: razorpayPayment,
        success: true,
        retryAttempt
      })

      await donation.save()
    }

    return {
      paymentId: razorpayPayment.id,
      previousStatus,
      currentStatus: newStatus,
      razorpayResponse: razorpayPayment,
      updatedAt: new Date(),
      recheckSuccess: true
    }
  }

  async bulkRecheckPayments(
    donationIds: string[],
    userId: string
  ): Promise<PaymentRecheckResult[]> {
    const results: PaymentRecheckResult[] = []
    
    // Process in batches to avoid overwhelming Razorpay API
    const batchSize = 5
    for (let i = 0; i < donationIds.length; i += batchSize) {
      const batch = donationIds.slice(i, i + batchSize)
      
      const batchPromises = batch.map(async (donationId) => {
        try {
          const donation = await CampaignDonation.findById(donationId)
          if (!donation?.razorpayPaymentId) {
            throw new Error('No Razorpay payment ID found')
          }
          
          return await this.recheckPaymentStatus(
            donationId, 
            donation.razorpayPaymentId, 
            userId
          )
        } catch (error) {
          return {
            paymentId: '',
            previousStatus: 'unknown',
            currentStatus: 'error',
            razorpayResponse: null,
            updatedAt: new Date(),
            recheckSuccess: false,
            errorMessage: (error as Error).message
          }
        }
      })

      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)
      
      // Small delay between batches
      if (i + batchSize < donationIds.length) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    return results
  }

  private async logFailedRecheck(
    donationId: string,
    paymentId: string,
    userId: string,
    error: Error | null
  ) {
    try {
      const donation = await CampaignDonation.findById(donationId)
      if (donation) {
        const recheckId = uuidv4()
        
        addAuditLogEntry(donation, {
          action: 'payment_rechecked',
          performedBy: userId,
          details: `Payment recheck failed: ${error?.message || 'Unknown error'}`,
          previousValues: { paymentId }
        })

        if (!donation.paymentRecheckHistory) {
          donation.paymentRecheckHistory = []
        }
        donation.paymentRecheckHistory.push({
          recheckId,
          performedBy: userId,
          performedAt: new Date(),
          razorpayPaymentId: paymentId,
          previousStatus: donation.status,
          newStatus: donation.status,
          razorpayResponse: null,
          success: false,
          errorMessage: error?.message || 'Unknown error',
          retryAttempt: this.maxRetries
        })

        await donation.save()
      }
    } catch (logError) {
      console.error('Failed to log recheck failure:', logError)
    }
  }
}

export const razorpayPaymentSyncService = new RazorpayPaymentSyncService()