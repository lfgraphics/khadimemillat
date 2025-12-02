import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import { verifyWebhookSignature } from '@/lib/services/razorpay.service'
import { addBreadcrumb, captureException } from '@/lib/observability/sentry'
import CampaignDonation from '@/models/CampaignDonation'
import { purchaseService } from '@/lib/services/purchase.service'
import WebhookEvent from '@/models/WebhookEvent'

export async function POST(req: NextRequest) {
  let raw: string | Buffer = ''
  try {
    raw = await req.text()
    const signature = req.headers.get('x-razorpay-signature') || ''
    if (!signature) return NextResponse.json({ error: 'Signature missing' }, { status: 400 })
  const ok = verifyWebhookSignature({ rawBody: raw, signature })
    if (!ok) return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })

    const event = JSON.parse(raw.toString())
  addBreadcrumb({ category: 'payments', message: 'webhook received', level: 'info', data: { event: event.event } })
    await connectDB()

    // Idempotency: upsert event id; if already processed, no-op
    const processed = await WebhookEvent.findOneAndUpdate(
      { id: event.id },
      { $setOnInsert: { id: event.id, receivedAt: new Date() } },
      { upsert: true, new: false }
    )
    if (processed) return NextResponse.json({ received: true })

    const eventType: string = event.event
    const payment = event.payload?.payment?.entity
    const order = event.payload?.order?.entity
    const subscription = event.payload?.subscription?.entity

    // Handle subscription events
    if (eventType === 'subscription.activated' || eventType === 'subscription.charged' || eventType === 'subscription.halted' || eventType === 'subscription.cancelled') {
      try {
        const { SadqaSubscriptionService } = await import('@/lib/services/sadqa-subscription.service')
        await SadqaSubscriptionService.processSubscriptionWebhook(event)
        addBreadcrumb({ 
          category: 'subscriptions', 
          message: `subscription event processed: ${eventType}`, 
          level: 'info', 
          data: { subscriptionId: subscription?.id } 
        })
      } catch (subscriptionError) {
        console.error('[SUBSCRIPTION_WEBHOOK_ERROR]', subscriptionError)
        captureException(subscriptionError, { 
          route: 'razorpay-webhook-subscription',
          extra: { eventType, subscriptionId: subscription?.id }
        })
      }
    }

    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const orderId = order?.id || payment?.order_id
      const paymentId = payment?.id
      const receipt: string | undefined = order?.receipt
      if (receipt?.startsWith('donation_')) {
        const donationId = receipt.replace('donation_', '')
        const donation = await CampaignDonation.findById(donationId)
        if (donation) {
          donation.razorpayOrderId = orderId
          donation.razorpayPaymentId = paymentId
          donation.paymentVerified = true
          donation.paymentVerifiedAt = new Date()
          donation.status = 'completed'
          donation.processedAt = donation.processedAt || new Date()
          await donation.save()
          addBreadcrumb({ category: 'payments', message: 'donation marked completed via webhook', level: 'info', data: { donationId } })
          
          // Send thank you notifications after successful donation
          try {
            const { sendDonationThankYouNotifications } = await import('@/lib/services/donation-notification.service')
            await sendDonationThankYouNotifications(donation)
          } catch (notifyError) {
            console.warn('[DONATION_NOTIFICATION_FAILED_WEBHOOK]', notifyError)
            // Don't fail the webhook processing if notifications fail
          }
        }
      } else if (receipt?.startsWith('scrap_')) {
        const scrapItemId = receipt.replace('scrap_', '')
        try {
          const completed = await purchaseService.completePurchaseFromWebhook({ scrapItemId, razorpayOrderId: orderId, razorpayPaymentId: paymentId, completedBy: 'system' })
          addBreadcrumb({ category: 'payments', message: 'purchase completed via webhook', level: 'info', data: { purchaseId: String(completed._id), scrapItemId } })
        } catch (e) {
          // If already processed, ignore; else log
          addBreadcrumb({ category: 'payments', message: 'webhook completion error', level: 'warning', data: { error: (e as any)?.message, scrapItemId } })
        }
      }
    }

    // For other events, accept and ignore
    return NextResponse.json({ received: true })
  } catch (e) {
    console.error('[RAZORPAY_WEBHOOK]', e)
    captureException(e, { route: 'razorpay-webhook' })
    // Always return 200 to prevent retries storm, but include error info
    return NextResponse.json({ received: true, error: 'logged' })
  }
}
