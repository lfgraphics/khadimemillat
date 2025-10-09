import { auth } from '@clerk/nextjs/server'
import dbConnect from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { CampaignDonation } from '@/models'
import Razorpay from 'razorpay'

// Initialize Razorpay (you'll need to add these to your environment variables)
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!
})

export async function POST(request: NextRequest) {
  try {
    const { userId, sessionClaims } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is admin
    const userRole = (sessionClaims as any)?.metadata?.role || 'user'
    
    if (!['admin'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const { donationId, reason, amount } = await request.json()

    if (!donationId || !reason || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields: donationId, reason, amount' },
        { status: 400 }
      )
    }

    await dbConnect()

    // Find the donation
    const donation = await CampaignDonation.findById(donationId)
    if (!donation) {
      return NextResponse.json(
        { error: 'Donation not found' },
        { status: 404 }
      )
    }

    // Check if donation is in a refundable state
    if (donation.status !== 'completed') {
      return NextResponse.json(
        { error: 'Only completed donations can be refunded' },
        { status: 400 }
      )
    }

    if (donation.status === 'refunded') {
      return NextResponse.json(
        { error: 'Donation already refunded' },
        { status: 400 }
      )
    }

    // Check if we have a Razorpay payment ID for refund
    if (!donation.razorpayPaymentId) {
      return NextResponse.json(
        { error: 'No payment ID found for refund' },
        { status: 400 }
      )
    }

    try {
      // Process refund through Razorpay
      const refund = await razorpay.payments.refund(donation.razorpayPaymentId, {
        amount: amount * 100, // Razorpay expects amount in paise
        notes: {
          reason: reason,
          processed_by: userId,
          donation_id: donationId
        }
      })

      // Update donation status
      await CampaignDonation.findByIdAndUpdate(donationId, {
        status: 'refunded',
        refundReason: reason,
        refundProcessedAt: new Date(),
        refundDetails: {
          razorpayRefundId: refund.id,
          refundedAmount: amount,
          refundStatus: refund.status,
          processedBy: userId
        }
      })

      // You might want to send notification to the donor here
      // await sendRefundNotification(donation.donorEmail, amount, reason)

      return NextResponse.json({
        success: true,
        message: 'Refund processed successfully',
        refundId: refund.id
      })

    } catch (razorpayError: any) {
      console.error('Razorpay refund error:', razorpayError)
      
      // Handle specific Razorpay errors
      if (razorpayError.statusCode === 400) {
        return NextResponse.json(
          { error: 'Invalid refund request - ' + razorpayError.error.description },
          { status: 400 }
        )
      }
      
      return NextResponse.json(
        { error: 'Failed to process refund through payment gateway' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Error processing refund:', error)
    return NextResponse.json(
      { error: 'Failed to process refund' },
      { status: 500 }
    )
  }
}