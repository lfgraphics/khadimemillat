import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import { getAuth } from '@clerk/nextjs/server'
import CampaignDonation from "@/models/CampaignDonation"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const { paymentReference, paymentMethod, razorpayPaymentId } = body || {}

    await connectDB()

    const donation = await CampaignDonation.findById(id)
    if (!donation) {
      return NextResponse.json({ error: 'Donation not found' }, { status: 404 })
    }

    // If already verified via Razorpay, just mark completed if not yet
    if (donation.paymentVerified) {
      donation.status = 'completed'
      donation.processedAt = donation.processedAt || new Date()
      await donation.save()
      return NextResponse.json({ success: true })
    }

    // If Razorpay flow present but not verified, block
    if (razorpayPaymentId || donation.razorpayOrderId) {
      return NextResponse.json({ error: 'Payment needs verification via /api/razorpay/verify-payment' }, { status: 400 })
    }

    // Allow non-Razorpay (cash/bank_transfer) completions only for admins/moderators
    const { sessionClaims } = getAuth(request) as any
    const role = sessionClaims?.metadata?.role
    if (donation.paymentMethod !== 'online') {
      if (role !== 'admin' && role !== 'moderator') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }
    // Proceed to complete
    donation.status = 'completed'
    if (paymentReference) donation.paymentReference = paymentReference
    if (paymentMethod) donation.paymentMethod = paymentMethod
    donation.processedAt = new Date()
    await donation.save()

    // Send thank you notifications for completed donations
    if (donation.status === 'completed' && (paymentMethod === 'online' || donation.paymentMethod === 'online')) {
      try {
        const { sendDonationThankYouNotifications } = await import('@/lib/services/donation-notification.service')
        await sendDonationThankYouNotifications(donation)
      } catch (notifyError) {
        console.warn('[DONATION_COMPLETION_NOTIFICATION_FAILED]', notifyError)
        // Don't fail the completion if notifications fail
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DONATION_COMPLETE_BY_ID]', error)
    return NextResponse.json({ error: 'Failed to complete donation' }, { status: 500 })
  }
}
