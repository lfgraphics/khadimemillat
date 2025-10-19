import connectDB from '@/lib/db'
import Purchase from '@/models/Purchase'
import ScrapItem from '@/models/ScrapItem'
import User from '@/models/User'
import { Types } from 'mongoose'
import { verifyPaymentSignature } from './razorpay.service'
import { closeConversation, sendSystemMessage } from './conversation.service'
import Conversation from '@/models/Conversation'
import { notificationService } from './notification.service'

export async function createPurchase(params: { scrapItemId: string; buyerId: string; buyerName: string; buyerEmail?: string; buyerPhone?: string; quantity?: number; unitPrice: number; paymentMethod: 'online' | 'cash' | 'offline'; conversationId?: string; razorpayOrderId?: string }) {
  await connectDB()
  const { scrapItemId, buyerId, buyerName, buyerEmail, buyerPhone, quantity = 1, unitPrice, paymentMethod, conversationId, razorpayOrderId } = params
  if (!Types.ObjectId.isValid(scrapItemId)) throw new Error('Invalid scrapItemId')
  
  const item = await ScrapItem.findById(scrapItemId)
  if (!item) throw new Error('Item not found')
  if (item.availableQuantity < quantity) throw new Error(`Only ${item.availableQuantity} items available`)
  if (item.marketplaceListing?.sold && item.availableQuantity === 0) throw new Error('Item completely sold out')

  const totalAmount = unitPrice * quantity

  const purchase = await Purchase.create({
    scrapItemId: new Types.ObjectId(scrapItemId),
    buyerId,
    buyerName,
    buyerEmail,
    buyerPhone,
    quantity,
    unitPrice,
    totalAmount,
    paymentMethod,
    conversationId: conversationId && Types.ObjectId.isValid(conversationId) ? new Types.ObjectId(conversationId) : undefined,
    razorpayOrderId,
    paymentStatus: 'pending'
  })
  return purchase
}

export async function completePurchase(params: { purchaseId: string; razorpayPaymentId?: string; razorpaySignature?: string; completedBy: string; completedByRole?: 'system' | 'user' | 'admin' | 'moderator' }) {
  await connectDB()
  const { purchaseId, razorpayPaymentId, razorpaySignature, completedBy } = params
  if (!Types.ObjectId.isValid(purchaseId)) throw new Error('Invalid purchaseId')
  
  // Atomic claim using lock fields to prevent duplicates
  const claim = await Purchase.findOneAndUpdate(
    { _id: purchaseId, paymentStatus: 'pending', lockedAt: { $exists: false } },
    { $set: { lockedAt: new Date(), lockedBy: completedBy } },
    { new: true }
  )
  const purchase = claim
  if (!purchase) throw new Error('Purchase already processed or not found')

  // Verify item availability before completing
  const item = await ScrapItem.findById(purchase.scrapItemId)
  if (!item) throw new Error('Item not found')
  if (item.availableQuantity < purchase.quantity) {
    throw new Error(`Insufficient quantity available. Only ${item.availableQuantity} items left`)
  }

  if (purchase.paymentMethod === 'online') {
    // If webhook already marked the payment as verified, skip HMAC enforcement
    if (purchase.paymentVerified === true) {
      // Backfill refs if provided
      if (razorpayPaymentId && !purchase.razorpayPaymentId) purchase.razorpayPaymentId = razorpayPaymentId
      if (razorpaySignature && !purchase.razorpaySignature) purchase.razorpaySignature = razorpaySignature
    } else {
      if (!purchase.razorpayOrderId || !razorpayPaymentId || !razorpaySignature) throw new Error('Missing Razorpay verification params')
      const ok = verifyPaymentSignature({ orderId: purchase.razorpayOrderId, paymentId: razorpayPaymentId, signature: razorpaySignature })
      if (!ok) throw new Error('Payment verification failed')
      purchase.razorpayPaymentId = razorpayPaymentId
      purchase.razorpaySignature = razorpaySignature
      purchase.paymentVerified = true
    }
  }

  purchase.paymentStatus = 'completed'
  purchase.completedAt = new Date()
  purchase.completedBy = completedBy
  await purchase.save()

  // Update item quantity atomically
  const newAvailableQuantity = item.availableQuantity - purchase.quantity
  const update: any = {
    availableQuantity: newAvailableQuantity
  }

  // If this was the last item, mark as sold
  if (newAvailableQuantity === 0) {
    update['marketplaceListing.sold'] = true
    update['marketplaceListing.soldAt'] = new Date()
    update['marketplaceListing.soldBy'] = completedBy
  }

  // Update sale price and buyer info for the latest purchase
  update['marketplaceListing.salePrice'] = purchase.unitPrice
  update['marketplaceListing.soldToUserId'] = purchase.buyerId
  update['marketplaceListing.soldToName'] = purchase.buyerName

  // Set soldVia if not already set
  if (!item.marketplaceListing?.soldVia) {
    update['marketplaceListing.soldVia'] = purchase.paymentMethod === 'online' ? 'online' : 'offline'
  }

  if (purchase.conversationId) {
    update['marketplaceListing.conversationId'] = purchase.conversationId
  }

  await ScrapItem.findByIdAndUpdate(purchase.scrapItemId, { $set: update })

  // Add to user purchases (if exists in our User cache)
  await User.findOneAndUpdate({ clerkUserId: purchase.buyerId }, { $addToSet: { purchases: purchase._id } })

  // Close conversations only if item is completely sold
  if (newAvailableQuantity === 0) {
    try {
      const convos = await Conversation.find({ scrapItemId: purchase.scrapItemId, status: 'active' }).lean()
      for (const c of convos) {
        await closeConversation({ conversationId: String((c as any)._id), userId: completedBy, status: 'completed' })
      }
    } catch (e) { console.warn('[CLOSE_CONVERSATIONS_FAILED]', e) }
  }

  // Emit payment completed chat message if a conversation is available
  try {
    let convoId: string | undefined
    if ((purchase as any).conversationId) {
      convoId = String((purchase as any).conversationId)
    } else {
      const convo: any = await Conversation.findOne({ scrapItemId: purchase.scrapItemId, buyerId: purchase.buyerId, status: { $in: ['active', 'completed'] } }).sort({ updatedAt: -1 }).select('_id').lean()
      if (convo && convo._id) convoId = String(convo._id)
    }
    if (convoId) {
      const buyerName = purchase.buyerId ? (await User.findOne({ clerkUserId: purchase.buyerId }))?.name || 'Buyer' : 'Buyer'
      await sendSystemMessage({ 
        conversationId: convoId, 
        content: `${buyerName} has completed the purchase of ${purchase.quantity}x ${item.name} for ₹${purchase.totalAmount}. Thank you!`, 
        metadata: { type: 'payment_completed', purchaseId: String(purchase._id), scrapItemId: String(purchase.scrapItemId), amount: purchase.totalAmount, quantity: purchase.quantity } 
      })
    }
  } catch (e) { console.warn('[SEND_PAYMENT_COMPLETED_MESSAGE_FAILED]', e) }

  // Notify buyer about payment completion
  try {
    await notificationService.paymentCompleted({ buyerId: purchase.buyerId, purchaseId: purchase._id.toString(), scrapItemId: String(purchase.scrapItemId), amount: purchase.totalAmount })
    if (purchase.paymentMethod === 'online') {
      await notificationService.itemSoldToBuyer({ buyerId: purchase.buyerId, scrapItemId: String(purchase.scrapItemId), salePrice: purchase.totalAmount })
    }
  } catch (e) { console.warn('[NOTIFY_PAYMENT_COMPLETED_FAILED]', e) }

  return purchase
}

// Webhook-driven completion that trusts verified webhook signature (event-level) and skips payment HMAC requirement
export async function completePurchaseFromWebhook(params: { scrapItemId: string; razorpayOrderId?: string; razorpayPaymentId?: string; completedBy?: string }) {
  await connectDB()
  const { scrapItemId, razorpayOrderId, razorpayPaymentId, completedBy = 'system' } = params
  if (!Types.ObjectId.isValid(scrapItemId)) throw new Error('Invalid scrapItemId')
  // Prefer the pending purchase for this item to avoid selecting historical records
  const purchase = await Purchase.findOne({ scrapItemId, paymentStatus: 'pending' })
  if (!purchase) {
    console.warn('[WEBHOOK_NO_PENDING_PURCHASE]', { scrapItemId, razorpayOrderId, razorpayPaymentId })
    // Notify staff for manual reconciliation
    try {
      const staff = await User.find({ role: { $in: ['admin', 'moderator'] } }).select('clerkUserId').lean()
      await notificationService.itemSold({ staffIds: staff.map(s => s.clerkUserId), scrapItemId: String(scrapItemId), salePrice: 0 })
    } catch (e) { console.warn('[NOTIFY_WEBHOOK_NO_PENDING_FAILED]', e) }
    // No-op to avoid throwing; caller can log
    return null as any
  }
  // Idempotency: if already verified/completed, no-op
  if (purchase.paymentStatus !== 'pending') return purchase

  // Set payment refs if provided
  if (razorpayOrderId && !purchase.razorpayOrderId) purchase.razorpayOrderId = razorpayOrderId
  if (razorpayPaymentId) purchase.razorpayPaymentId = razorpayPaymentId
  purchase.paymentVerified = true

  // Finalize
  return await completePurchase({ purchaseId: purchase._id.toString(), completedBy })
}

export async function getPurchaseById({ purchaseId }: { purchaseId: string }) {
  await connectDB()
  if (!Types.ObjectId.isValid(purchaseId)) return null
  return Purchase.findById(purchaseId).populate('scrapItemId').lean()
}

export async function getUserPurchases({ userId }: { userId: string }) {
  await connectDB()
  return Purchase.find({ buyerId: userId }).populate('scrapItemId').sort({ createdAt: -1 }).lean()
}

export async function cancelPurchase({ purchaseId, reason }: { purchaseId: string; reason?: string }) {
  await connectDB()
  if (!Types.ObjectId.isValid(purchaseId)) throw new Error('Invalid purchaseId')
  const purchase = await Purchase.findByIdAndUpdate(purchaseId, { $set: { status: 'cancelled', notes: reason } }, { new: true })
  return purchase
}

export async function markItemSoldOffline(params: { scrapItemId: string; unitPrice: number; quantity?: number; soldBy: string; buyerName?: string; buyerId?: string; notes?: string; conversationId?: string }) {
  await connectDB()
  const { scrapItemId, unitPrice, quantity = 1, soldBy, buyerName = 'Offline Buyer', buyerId = 'offline', notes, conversationId } = params
  
  // Verify item availability
  const item = await ScrapItem.findById(scrapItemId)
  if (!item) throw new Error('Item not found')
  if (item.availableQuantity < quantity) {
    throw new Error(`Only ${item.availableQuantity} items available`)
  }

  const totalAmount = unitPrice * quantity

  const purchase = await Purchase.create({
    scrapItemId: new Types.ObjectId(scrapItemId),
    buyerId,
    buyerName,
    quantity,
    unitPrice,
    totalAmount,
    paymentMethod: 'offline',
    paymentStatus: 'pending',
    notes,
    ...(conversationId && Types.ObjectId.isValid(conversationId) ? { conversationId: new Types.ObjectId(conversationId) } : {})
  })

  const completed = await completePurchase({ purchaseId: purchase._id.toString(), completedBy: soldBy })

  // Notify staff about item sold (admins/moderators)
  try {
    const staff = await User.find({ role: { $in: ['admin', 'moderator'] } }).select('clerkUserId').lean()
    await notificationService.itemSold({ staffIds: staff.map(s => s.clerkUserId), scrapItemId, salePrice: totalAmount })
  } catch (e) { console.warn('[NOTIFY_ITEM_SOLD_FAILED]', e) }
  return completed
}

export const purchaseService = {
  createPurchase,
  completePurchase,
  completePurchaseFromWebhook,
  getPurchaseById,
  getUserPurchases,
  cancelPurchase,
  markItemSoldOffline
}
