import connectDB from '@/lib/db'
import Conversation from '@/models/Conversation'
import Message from '@/models/Message'
import ScrapItem from '@/models/ScrapItem'
import User from '@/models/User'
import { Types } from 'mongoose'
import { notificationService } from './notification.service'

// Simple in-memory cache for moderator/admin clerk IDs
const modCache: { ids: string[]; ts: number } = { ids: [], ts: 0 }
const MOD_CACHE_TTL_MS = 5 * 60 * 1000

async function getModeratorIds(): Promise<string[]> {
  const now = Date.now()
  if (modCache.ids.length && now - modCache.ts < MOD_CACHE_TTL_MS) return modCache.ids
  const mods = await User.find({ role: { $in: ['moderator', 'admin'] } }).select('clerkUserId').lean()
  modCache.ids = mods.map(u => u.clerkUserId)
  modCache.ts = now
  return modCache.ids
}

export async function createOrGetConversation({ scrapItemId, buyerId, buyerName }: { scrapItemId: string; buyerId: string; buyerName: string }) {
  await connectDB()
  if (!Types.ObjectId.isValid(scrapItemId)) throw new Error('Invalid scrapItemId')

  const existing = await Conversation.findOne({ scrapItemId, buyerId })
  if (existing) {
    // Ensure buyer is in participants list
    if (!(existing.participants || []).includes(buyerId)) {
      await Conversation.updateOne({ _id: existing._id }, { $addToSet: { participants: buyerId } })
      existing.participants = Array.from(new Set([...(existing.participants || []), buyerId])) as any
    }
    return existing
  }

  const item = await ScrapItem.findById(scrapItemId)
  if (!item) throw new Error('Item not found')
  if (item.marketplaceListing?.sold) throw new Error('Item already sold')

  const moderatorIds = await getModeratorIds()
  const participants = Array.from(new Set([buyerId, ...moderatorIds]))

  const convo = await Conversation.create({
    scrapItemId: new Types.ObjectId(scrapItemId),
    buyerId,
    participants,
    status: 'active',
    lastMessageAt: new Date()
  })

  await Message.create({
    conversationId: convo._id,
    senderId: 'system',
    senderName: 'System',
    senderRole: 'system',
    content: `${buyerName} is interested in purchasing this item`,
    type: 'system',
    readBy: []
  })

  // Notify moderators/admins of purchase inquiry
  try {
    const moderatorIds = await getModeratorIds()
    await notificationService.purchaseInquiry({
      moderatorIds,
      itemName: item.name,
      scrapItemId: String(item._id),
      conversationId: String(convo._id),
      buyerName
    })
  } catch (e) {
    console.warn('[NOTIFY_PURCHASE_INQUIRY_FAILED]', e)
  }

  return convo
}

export async function getConversationById({ conversationId, userId }: { conversationId: string; userId: string }) {
  await connectDB()
  if (!Types.ObjectId.isValid(conversationId)) return null
  const doc = await Conversation.findById(conversationId).populate('scrapItemId')
  if (!doc) return null
  const participants: string[] = (doc as any).participants || []
  if (!participants.includes(userId)) return null
  return doc.toObject()
}

export async function getUserConversations({ userId, role, page = 1, limit = 50 }: { userId: string; role: string; page?: number; limit?: number }) {
  await connectDB()
  // Staff can view all conversations; users see their own
  const query: any = (role === 'admin' || role === 'moderator') ? {} : (role === 'user' ? { buyerId: userId } : { participants: userId })
  const convos = await Conversation.find(query)
    .populate('scrapItemId', 'name photos marketplaceListing')
    .sort({ lastMessageAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean()
  // Attach last message preview via single extra query per page
  const ids = convos.map((c: any) => c._id)
  const Message = (await import('@/models/Message')).default
  const lastByConvo = await Message.aggregate([
    { $match: { conversationId: { $in: ids } } },
    { $sort: { createdAt: -1 } },
    { $group: { _id: '$conversationId', last: { $first: '$$ROOT' } } }
  ])
  const map = new Map<string, any>()
  for (const row of lastByConvo) map.set(String(row._id), row.last)
  return convos.map((c: any) => ({
    ...c,
    lastMessage: map.get(String(c._id)) ? {
      _id: map.get(String(c._id))._id,
      type: map.get(String(c._id)).type,
      content: map.get(String(c._id)).content,
      senderName: map.get(String(c._id)).senderName,
      createdAt: map.get(String(c._id)).createdAt
    } : null
  }))
}

export async function getConversationMessages({ conversationId, userId }: { conversationId: string; userId: string }) {
  await connectDB()
  if (!Types.ObjectId.isValid(conversationId)) throw new Error('Invalid conversationId')
  const convo = await Conversation.findById(conversationId)
  if (!convo) throw new Error('Conversation not found')
  if (!convo.participants.includes(userId)) throw new Error('Forbidden')
  // Guard: ensure buyer is a participant as well
  if (!convo.participants.includes(convo.buyerId)) {
    await Conversation.updateOne({ _id: convo._id }, { $addToSet: { participants: convo.buyerId } })
  }

  const messages = await Message.find({ conversationId }).sort({ createdAt: 1 }).lean()
  // mark read
  await Message.updateMany({ conversationId, readBy: { $ne: userId } }, { $addToSet: { readBy: userId } })
  await Conversation.findByIdAndUpdate(conversationId, { $set: { lastMessageAt: new Date() } })
  return messages
}

export async function sendMessage(params: { conversationId: string; senderId: string; senderName: string; senderRole: 'user' | 'moderator' | 'admin' | 'scrapper'; content: string; type?: 'text' | 'system' | 'payment_request' | 'payment_completed'; metadata?: any }) {
  await connectDB()
  const { conversationId, senderId, senderName, senderRole, content, type = 'text', metadata } = params
  if (!Types.ObjectId.isValid(conversationId)) throw new Error('Invalid conversationId')
  const convo = await Conversation.findById(conversationId)
  if (!convo) throw new Error('Conversation not found')
  if (!convo.participants.includes(senderId)) throw new Error('Forbidden')
  // Content validation
  const MAX_LEN = 2000
  const safeContent = String(content || '').slice(0, MAX_LEN)

  if (type === 'payment_request') {
    const amt = Number((metadata || {}).amount)
    if (!amt || amt <= 0) throw new Error('Invalid payment amount')
  }
  // For payment_request, allow empty content by substituting a default message
  let contentToSave = safeContent
  if (type === 'payment_request' && (!safeContent || !safeContent.trim())) {
    const amt = Number((metadata || {}).amount) || 0
    contentToSave = amt > 0 ? `Payment requested for ₹${amt}` : 'Payment requested'
  }
  const msg = await Message.create({ conversationId, senderId, senderName, senderRole, content: contentToSave, type, metadata, readBy: [senderId] })
  await Conversation.findByIdAndUpdate(conversationId, { $set: { lastMessageAt: new Date() } })

  // If this is a payment request, notify the buyer
  if (type === 'payment_request') {
    try {
      const buyerId = convo.buyerId
      const amount = Number(metadata?.amount) || 0
      await notificationService.paymentRequest({ buyerId, amount, conversationId, scrapItemId: String(convo.scrapItemId) })
    } catch (e) {
      console.warn('[NOTIFY_PAYMENT_REQUEST_FAILED]', e)
    }
  }

  // Notify all participants except sender about new message (only for regular text messages)
  if (type === 'text') {
    try {
      const otherParticipants = convo.participants.filter((p: string) => p !== senderId)
      if (otherParticipants.length > 0) {
        // Check which users are currently active in this conversation
        const ConversationActivity = (await import('@/models/ConversationActivity')).default
        const activeUsers = await ConversationActivity.find({
          conversationId,
          userId: { $in: otherParticipants },
          isActive: true,
          lastActiveAt: { $gte: new Date(Date.now() - 2 * 60 * 1000) } // Active within last 2 minutes
        }).select('userId').lean()

        const activeUserIds = activeUsers.map((a: any) => a.userId)
        const inactiveParticipants = otherParticipants.filter((p: string) => !activeUserIds.includes(p))

        // Only notify inactive users with web push only (no email for chat messages)
        if (inactiveParticipants.length > 0) {
          const ScrapItem = (await import('@/models/ScrapItem')).default
          const item = await ScrapItem.findById(convo.scrapItemId).select('name').lean()
          await notificationService.notifyUsersWebPushOnly(inactiveParticipants, {
            title: `New message from ${senderName}`,
            body: `"${contentToSave.length > 50 ? contentToSave.slice(0, 50) + '...' : contentToSave}"`,
            url: `/conversations/${conversationId}`,
            type: 'new_message'
          })
        }
      }
    } catch (e) {
      console.warn('[NOTIFY_NEW_MESSAGE_FAILED]', e)
    }
  }

  return msg
}

export async function markMessagesSeen({ conversationId, userId, messageIds }: { conversationId: string; userId: string; messageIds: string[] }) {
  await connectDB()
  if (!Types.ObjectId.isValid(conversationId)) throw new Error('Invalid conversationId')
  
  // Verify user is participant in conversation
  const convo = await Conversation.findById(conversationId)
  if (!convo) throw new Error('Conversation not found')
  if (!convo.participants.includes(userId)) throw new Error('Forbidden')
  
  // Update messages to mark them as seen by this user
  const validMessageIds = messageIds.filter(id => Types.ObjectId.isValid(id))
  
  await Message.updateMany(
    {
      _id: { $in: validMessageIds.map(id => new Types.ObjectId(id)) },
      conversationId: new Types.ObjectId(conversationId),
      senderId: { $ne: userId }, // Don't mark own messages as seen
      'seenBy.userId': { $ne: userId } // Only update if not already seen
    },
    {
      $push: {
        seenBy: {
          userId,
          seenAt: new Date()
        }
      }
    }
  )
  
  return true
}

export async function sendSystemMessage({ conversationId, content, metadata }: { conversationId: string; content: string; metadata?: any }) {
  await connectDB()
  if (!Types.ObjectId.isValid(conversationId)) throw new Error('Invalid conversationId')
  const msgType = metadata?.type === 'payment_completed' ? 'payment_completed' : 'system'
  const msg = await Message.create({ conversationId, senderId: 'system', senderName: 'System', senderRole: 'system', content, type: msgType, metadata, readBy: [] })
  await Conversation.findByIdAndUpdate(conversationId, { $set: { lastMessageAt: new Date() } })
  return msg
}

export async function closeConversation({ conversationId, userId, status }: { conversationId: string; userId: string; status: 'completed' | 'cancelled' }) {
  await connectDB()
  if (!Types.ObjectId.isValid(conversationId)) throw new Error('Invalid conversationId')
  let actor: any = null
  if (userId !== 'system') {
    const actorDoc = await User.findOne({ clerkUserId: userId })
    actor = actorDoc ? actorDoc.toObject() as any : null
    if (!actor || (actor.role !== 'admin' && actor.role !== 'moderator')) throw new Error('Forbidden')
  } else {
    actor = { name: 'System', role: 'system' }
  }
  const convo = await Conversation.findByIdAndUpdate(conversationId, { $set: { status } }, { new: true })
  if (convo) {
    await Message.create({ conversationId, senderId: userId, senderName: actor.name, senderRole: actor.role, content: `Conversation ${status}`, type: 'system', readBy: [] })
  }
  return convo
}

export const conversationService = {
  createOrGetConversation,
  getConversationById,
  getUserConversations,
  getConversationMessages,
  sendMessage,
  markMessagesSeen,
  sendSystemMessage,
  closeConversation
}
