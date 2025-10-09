import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@clerk/nextjs/server'
import connectDB from '@/lib/db'
import CampaignDonation from '@/models/CampaignDonation'
import { verifyPaymentSignature, fetchOrderDetails, fetchPaymentDetails } from '@/lib/services/razorpay.service'
import { purchaseService } from '@/lib/services/purchase.service'
import { sendSystemMessage } from '@/lib/services/conversation.service'
import { sendDonationThankYouNotifications } from '@/lib/services/donation-notification.service'
import ScrapItem from '@/models/ScrapItem'
import { Types } from 'mongoose'
import { addBreadcrumb as _addBreadcrumb, captureException as _captureException } from '@/lib/observability/sentry'
let addBreadcrumb = _addBreadcrumb
let captureException = _captureException
try { /* using provided shims if available */ } catch {}
import { rateLimit as _rateLimit, getClientKeyFromRequest as _getClientKeyFromRequest } from '@/lib/utils/rateLimiter'
const rateLimit = _rateLimit || ((_: any) => ({ allowed: true })) as any
const getClientKeyFromRequest = _getClientKeyFromRequest || ((req: Request, extra?: string) => `${extra || 'key'}`)

export async function POST(req: NextRequest) {
    try {
        // Rate limit per IP+UA for verify attempts
        const key = getClientKeyFromRequest(req as any, 'verify-payment')
        const rl = rateLimit({ key, limit: 30, windowMs: 60_000 })
        if (!rl.allowed) {
            return NextResponse.json({ error: 'Too many verification attempts, please retry shortly' }, { status: 429 })
        }
        const { sessionClaims } = getAuth(req) as any
        const body = await req.json()
        const { type, orderId, paymentId, signature, referenceId } = body || {}
        if (!type || !orderId || !paymentId || !signature || !referenceId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        await connectDB()

        addBreadcrumb({ category: 'payments', message: 'verify start', level: 'info', data: { type, orderId, referenceId } })
        const ok = verifyPaymentSignature({ orderId, paymentId, signature })
        if (!ok) return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 })

        if (type === 'donation') {
            const donation = await CampaignDonation.findById(referenceId)
            if (!donation) return NextResponse.json({ error: 'Donation not found' }, { status: 404 })
            // Idempotency: if already verified and completed, return success early
            if ((donation as any).paymentVerified === true && (donation as any).status === 'completed') {
                return NextResponse.json({ success: true, donationId: donation._id })
            }
            // Cross-validate order paid amount and payment status
            try {
                const order = await fetchOrderDetails({ orderId })
                const payment = await fetchPaymentDetails({ paymentId })
                // Prefer amount_paid from order (paise), else payment.amount (paise)
                const paidPaise = (typeof (order as any).amount_paid === 'number' && (order as any).amount_paid > 0)
                    ? (order as any).amount_paid
                    : (typeof (payment as any)?.amount === 'number' ? (payment as any).amount : 0)
                const expectedPaise = Math.round((donation as any).amount * 100)
                if (paidPaise !== expectedPaise) {
                    addBreadcrumb({ category: 'payments', message: 'donation amount mismatch', level: 'warning', data: { donationId: String(donation._id), paidPaise, expectedPaise } })
                    return NextResponse.json({ error: 'Paid amount (paise) does not match expected donation amount' }, { status: 400 })
                }
                if (!payment || payment.status !== 'captured' || payment.order_id !== orderId) {
                    return NextResponse.json({ error: 'Payment not captured or order mismatch' }, { status: 400 })
                }
                    } catch (e) {
                        // Friendly pending response: signature verified but upstream fetch failed
                        captureException(e, { step: 'donation-amount-check', orderId })
                        addBreadcrumb({ category: 'payments', message: 'donation pending verification fallback', level: 'warning', data: { orderId, donationId: String(donation._id) } })
                        return NextResponse.json({ status: 'pending', message: 'Payment received. Verification is pending; you will receive a confirmation shortly.' }, { status: 202 })
                    }
            donation.razorpayOrderId = orderId
            donation.razorpayPaymentId = paymentId
            donation.razorpaySignature = signature
            donation.paymentVerified = true
            donation.paymentVerifiedAt = new Date()
            donation.status = 'completed'
            donation.processedAt = new Date()
            await donation.save()
            
            // Send thank you notifications after successful donation
            try {
                await sendDonationThankYouNotifications(donation)
            } catch (notifyError) {
                console.warn('[DONATION_NOTIFICATION_FAILED]', notifyError)
                // Don't fail the payment verification if notifications fail
            }
            
            return NextResponse.json({ success: true, donationId: donation._id })
        }

        if (type === 'purchase') {
            const userId = sessionClaims?.sub
            if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
            // referenceId is expected to be scrapItemId
            if (!Types.ObjectId.isValid(referenceId)) return NextResponse.json({ error: 'Invalid item reference' }, { status: 400 })
            const item: any = await ScrapItem.findById(referenceId).lean()
            if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 })
            const PurchaseModel = (await import('@/models/Purchase')).default
            // Idempotency: if a completed purchase already exists for this buyer+item+payment, return success
            if (paymentId) {
                const already = await PurchaseModel.findOne({ scrapItemId: referenceId, buyerId: userId, status: 'completed', razorpayPaymentId: paymentId }).select('_id').lean()
                if (already) return NextResponse.json({ success: true, purchaseId: String((already as any)._id) })
            }
            if (item.marketplaceListing?.sold) {
                // If webhook already completed for this buyer+item, treat as success to avoid false error
                const done = await PurchaseModel.findOne({ scrapItemId: referenceId, buyerId: userId, status: 'completed' }).select('_id').lean()
                if (done) return NextResponse.json({ success: true, purchaseId: String((done as any)._id) })
                return NextResponse.json({ error: 'Item already sold' }, { status: 400 })
            }

            // Cross-check order details to derive amount and linkage to item via receipt
            let amountPaid = 0
            let paidPaise = 0
            try {
                const order = await fetchOrderDetails({ orderId })
                const payment = await fetchPaymentDetails({ paymentId })
                // Prefer amount_paid from order (paise), fallback to payment.amount (paise)
                paidPaise = (order as any)?.amount_paid ?? (payment as any)?.amount ?? 0
                amountPaid = (paidPaise || 0) / 100
                const receipt = String(order.receipt || '')
                // Strictly enforce receipt matches the item
                if (receipt !== `scrap_${referenceId}`) {
                    return NextResponse.json({ error: 'Order receipt mismatch for item' }, { status: 400 })
                }
                addBreadcrumb({ category: 'payments', message: 'order fetched', level: 'debug', data: { amountPaid, paidPaise, receipt } })
                if (!payment || payment.status !== 'captured' || payment.order_id !== orderId) {
                    return NextResponse.json({ error: 'Payment not captured or order mismatch' }, { status: 400 })
                }
            } catch (e) {
                console.warn('[FETCH_ORDER_DETAILS_FAILED]', e)
                captureException(e, { step: 'fetchOrderDetails', orderId })
            }

            // Must have a pending purchase linked to this orderId for this user and item
            let purchase = await PurchaseModel.findOne({ scrapItemId: referenceId, buyerId: userId, status: 'pending', razorpayOrderId: orderId })
            if (!purchase) {
                // As a last resort, if a pending purchase exists without orderId but matches user+item, link it (rare edge during race) then continue
                const fallback = await PurchaseModel.findOne({ scrapItemId: referenceId, buyerId: userId, status: 'pending', $or: [{ razorpayOrderId: { $exists: false } }, { razorpayOrderId: '' }] }).sort({ createdAt: -1 })
                if (!fallback) {
                    return NextResponse.json({ error: 'Purchase not found for this order' }, { status: 404 })
                }
                fallback.razorpayOrderId = orderId
                if (!fallback.salePrice && amountPaid) fallback.salePrice = amountPaid
                await fallback.save()
                purchase = fallback
            }
            addBreadcrumb({ category: 'payments', message: 'purchase found for order', level: 'info', data: { purchaseId: String(purchase._id) } })

            // Reservation expiry handling: a pending reservation is valid for 30 minutes from reservedAt
            const reservedAt = (purchase as any).reservedAt ? new Date((purchase as any).reservedAt).getTime() : (purchase as any).createdAt?.getTime?.() || Date.now()
            const expiresAt = new Date(reservedAt + 30 * 60 * 1000)
            if (Date.now() > expiresAt.getTime()) {
                // If another completed purchase exists for the same item, report item sold
                const otherDone = await PurchaseModel.findOne({ scrapItemId: referenceId, status: 'completed' }).select('_id').lean()
                if (otherDone) return NextResponse.json({ error: 'Item already sold', expiresAt }, { status: 400 })
                return NextResponse.json({ error: 'Reservation expired', expiresAt }, { status: 409 })
            }

            // Sanity-check paid amount vs expected salePrice using paise-level comparison
            if (
                paidPaise &&
                (purchase as any).salePrice &&
                paidPaise !== Math.round((purchase as any).salePrice * 100)
            ) {
                return NextResponse.json({ error: 'Paid amount (paise) does not match expected sale price' }, { status: 400 })
            }
            const completed = await purchaseService.completePurchase({ purchaseId: purchase._id.toString(), razorpayPaymentId: paymentId, razorpaySignature: signature, completedBy: 'system' })
            // Rely on purchaseService to emit a single payment_completed system message if conversationId exists
            addBreadcrumb({ category: 'payments', message: 'purchase completed', level: 'info', data: { purchaseId: String(completed._id) } })
            return NextResponse.json({ success: true, purchaseId: completed._id })
        }

        return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    } catch (e: any) {
        console.error('[RAZORPAY_VERIFY_PAYMENT]', e)
        captureException(e, { route: 'verify-payment' })
        return NextResponse.json({ error: e.message || 'Failed to verify payment' }, { status: 500 })
    }
}
