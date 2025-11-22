import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@clerk/nextjs/server'
import connectDB from '@/lib/db'
import ScrapItem from '@/models/ScrapItem'
import Conversation from '@/models/Conversation'
import User from '@/models/User'
import { Types } from 'mongoose'
import { createDonationOrder, createPurchaseOrder } from '@/lib/services/razorpay.service'
import Purchase from '@/models/Purchase'
import { purchaseService } from '@/lib/services/purchase.service'
import { addBreadcrumb as _addBreadcrumb, captureException as _captureException } from '@/lib/observability/sentry'
let addBreadcrumb = _addBreadcrumb
let captureException = _captureException
try { /* no-op, using provided shims */ } catch {}
import { rateLimit as _rateLimit, getClientKeyFromRequest as _getClientKeyFromRequest } from '@/lib/utils/rateLimiter'
const rateLimit = _rateLimit || ((_: any) => ({ allowed: true })) as any
const getClientKeyFromRequest = _getClientKeyFromRequest || ((req: Request, extra?: string) => `${extra || 'key'}`)

export async function POST(req: NextRequest) {
    try {
        const { sessionClaims } = getAuth(req) as any
        const body = await req.json()
        const { type, amount, referenceId, email, phone, receiptPreferences } = body || {}
        if (!type || !amount || !referenceId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }
        if (typeof amount !== 'number' || amount <= 0) {
            return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
        }

        await connectDB()

        // Basic rate limit per IP+UA per endpoint
        const key = getClientKeyFromRequest(req, 'create-order')
        const rl = rateLimit({ key, limit: 20, windowMs: 60_000 })
        if (!rl.allowed) {
            return NextResponse.json({ error: 'Too many requests, please try again shortly' }, { status: 429 })
        }

        let order
        if (type === 'donation') {
            // Email is optional for donations
            order = await createDonationOrder({ 
                amount, 
                currency: 'INR', 
                donationId: referenceId, 
                donorEmail: email, 
                donorPhone: phone,
                receiptPreferences: receiptPreferences || { email: true, sms: false, razorpayManaged: false }
            })
            // Persist order id onto the donation with retry
            try {
                const CampaignDonation = (await import('@/models/CampaignDonation')).default
                let attempts = 0
                let ok = false
                while (attempts < 3 && !ok) {
                    attempts++
                    try {
                        await CampaignDonation.findByIdAndUpdate(referenceId, { $set: { razorpayOrderId: order.id } })
                        ok = true
                    } catch (err) {
                        if (attempts >= 3) throw err
                        await new Promise(res => setTimeout(res, attempts * 250))
                    }
                }
            } catch (e) {
                captureException(e, { step: 'persist-donation-order-id', donationId: referenceId, orderId: order.id })
                return NextResponse.json({ error: 'Failed to prepare donation for payment' }, { status: 500 })
            }
        } else if (type === 'purchase') {
            const userId = sessionClaims?.sub
            if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
            // referenceId can be conversationId or scrapItemId
            let scrapItemId = referenceId
            let resolvedConversationId: string | undefined = undefined
            addBreadcrumb({ category: 'payments', message: 'create-order start', level: 'info', data: { type, amount, referenceId } })
            if (Types.ObjectId.isValid(referenceId)) {
                const convo = await Conversation.findById(referenceId).lean()
                if (convo) {
                    addBreadcrumb({ category: 'payments', message: 'conversation resolved', level: 'debug', data: { conversationId: referenceId, buyerId: (convo as any).buyerId } })
                    // Validate conversation belongs to user and is active
                    if ((convo as any).buyerId !== userId || (convo as any).status !== 'active') {
                        return NextResponse.json({ error: 'Invalid conversation for purchase' }, { status: 400 })
                    }
                    scrapItemId = String((convo as any).scrapItemId)
                    resolvedConversationId = String((convo as any)._id)
                }
            }
            const item: any = await ScrapItem.findById(scrapItemId).lean()
            if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 })
            if (item.marketplaceListing?.sold) return NextResponse.json({ error: 'Item already sold' }, { status: 400 })
            addBreadcrumb({ category: 'payments', message: 'item available', level: 'debug', data: { scrapItemId } })

            // Validate amount vs demandedPrice in integer paise unless a staff payment_request in this conversation matches override
            const demanded = Number(item?.marketplaceListing?.demandedPrice) || 0
            const demandedPaise = Math.round(demanded * 100)
            const amountPaise = Math.round(amount * 100)
            if (demandedPaise > 0) {
                let allowOverride = false
                if (resolvedConversationId) {
                    try {
                        const Message = (await import('@/models/Message')).default
                        const latestReq: any = await Message.findOne({ conversationId: resolvedConversationId, type: 'payment_request' }).sort({ createdAt: -1 }).lean()
                        const reqAmt = Number((latestReq as any)?.metadata?.amount) || 0
                        const reqAmtPaise = Math.round(reqAmt * 100)
                        // Only trust staff initiated requests
                        if (reqAmt > 0 && ['admin', 'moderator', 'system'].includes((latestReq as any)?.senderRole)) {
                            allowOverride = reqAmtPaise === amountPaise
                        }
                    } catch { /* ignore */ }
                }
                if (!allowOverride && amountPaise !== demandedPaise) {
                    return NextResponse.json({ error: 'Amount does not match demanded price' }, { status: 400 })
                }
            }

            // Determine buyer email preference: provided -> session -> cached user
            let buyerEmail: string = email || sessionClaims?.email || ''
            if (!buyerEmail) {
                const user = await User.findOne({ clerkUserId: userId }).lean<{ email?: string }>() as { email?: string } | null
                if (user?.email) buyerEmail = user.email
            }
            order = await createPurchaseOrder({ amount, currency: 'INR', scrapItemId, buyerEmail: buyerEmail || '', buyerPhone: phone })
            addBreadcrumb({ category: 'payments', message: 'order created', level: 'info', data: { orderId: order.id, scrapItemId } })

            // Create or update a pending purchase with reservation expiry logic (30 minutes)
            const existing = await Purchase.findOne({ scrapItemId, status: 'pending' })
            const now = Date.now()
            const expiryMs = 30 * 60 * 1000
            if (existing) {
                const reservedAt = (existing as any).reservedAt ? new Date((existing as any).reservedAt).getTime() : (existing as any).createdAt?.getTime?.() || now
                const isExpired = now - reservedAt > expiryMs
                if (isExpired) {
                    // Proactively cancel expired reservation to reduce race conditions
                    await Purchase.findByIdAndUpdate(existing._id, { $set: { status: 'cancelled', notes: 'Auto-cancelled due to reservation expiry' } })
                } else if (String((existing as any).buyerId) !== userId) {
                    const expiresAt = new Date(reservedAt + expiryMs)
                    return NextResponse.json({ error: 'Item is currently reserved by another buyer', reservedAt: new Date(reservedAt), expiresAt }, { status: 409 })
                }
                // If expired or same-buyer, refresh reservation to current user
                // If no conversationId yet, try to resolve active conversation for this buyer+item
                let convoIdToSet = resolvedConversationId
                if (!convoIdToSet) {
                    const activeConvo = await Conversation.findOne({ scrapItemId, buyerId: userId, status: 'active' }).select('_id').lean()
                    let cid: string | undefined
                    if (activeConvo && (activeConvo as any)._id) {
                        cid = String((activeConvo as any)._id)
                    }
                    if (cid) convoIdToSet = cid
                }
                const targetId = existing._id
                await Purchase.findByIdAndUpdate(targetId, { $set: { buyerId: userId, salePrice: amount, paymentMethod: 'online', razorpayOrderId: order.id, reservedAt: new Date(), status: 'pending', ...(convoIdToSet ? { conversationId: new Types.ObjectId(convoIdToSet) } : {}) } })
                addBreadcrumb({ category: 'payments', message: 'purchase linked/refreshed to order', level: 'info', data: { purchaseId: String(targetId), orderId: order.id, expired: isExpired } })
            } else {
                // Try to resolve an active conversation so payment completion will emit system message in chat
                let convoIdToSet = resolvedConversationId
                if (!convoIdToSet) {
                    const activeConvo = await Conversation.findOne({ scrapItemId, buyerId: userId, status: 'active' }).select('_id').lean()
                    let cid2: string | undefined
                    if (activeConvo && (activeConvo as any)._id) {
                        cid2 = String((activeConvo as any)._id)
                    }
                    if (cid2) convoIdToSet = cid2
                }
                // Get item details to calculate unit price and quantity
                const item = await ScrapItem.findById(scrapItemId).select('marketplaceListing').lean() as { marketplaceListing?: { demandedPrice?: number } } | null
                const unitPrice = item?.marketplaceListing?.demandedPrice || (amount / 1) // fallback to total amount if no unit price
                const quantity = Math.round(amount / unitPrice) || 1
                
                const created = await purchaseService.createPurchase({ 
                    scrapItemId, 
                    buyerId: userId, 
                    buyerName: sessionClaims?.name || 'Buyer', 
                    buyerEmail, 
                    buyerPhone: phone, 
                    quantity,
                    unitPrice, 
                    paymentMethod: 'online', 
                    conversationId: convoIdToSet, 
                    razorpayOrderId: order.id 
                })
                addBreadcrumb({ category: 'payments', message: 'purchase created and linked', level: 'info', data: { purchaseId: String(created._id), orderId: order.id } })
            }
        } else {
            return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
        }

        const publicKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID
        if (!publicKey) {
            return NextResponse.json({ error: 'Razorpay public key is not configured' }, { status: 500 })
        }
        return NextResponse.json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId: publicKey
        })
    } catch (e: any) {
        console.error('[RAZORPAY_CREATE_ORDER]', e)
        return NextResponse.json({ error: e.message || 'Failed to create order' }, { status: 500 })
    }
}
