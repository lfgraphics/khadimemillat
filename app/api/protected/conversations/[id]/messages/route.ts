import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@clerk/nextjs/server'
import { getConversationMessages, sendMessage, markMessagesSeen } from '@/lib/services/conversation.service'
import { rateLimit, getClientKeyFromRequest } from '@/lib/utils/rateLimiter'
import User from '@/models/User'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rl = rateLimit({ key: getClientKeyFromRequest(req, 'messages:list'), limit: 120, windowMs: 60_000 })
    if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    const { id } = await params
    const { sessionClaims } = getAuth(req) as any
    const userId = sessionClaims?.sub
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const messages = await getConversationMessages({ conversationId: id, userId })
    return NextResponse.json({ messages })
  } catch (e: any) {
    console.error('[CONVERSATION_MESSAGES_GET]', e)
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rl = rateLimit({ key: getClientKeyFromRequest(req, 'messages:create'), limit: 30, windowMs: 60_000 })
    if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    const { id } = await params
    const { sessionClaims } = getAuth(req) as any
    const userId = sessionClaims?.sub
    const role = sessionClaims?.metadata?.role || 'user'
    const body = await req.json()
    const content = body?.content as string
    const type = body?.type as 'text' | 'payment_request'
    const metadata = body?.metadata
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!content && type !== 'payment_request') return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    if (typeof content === 'string' && content.length > 2000) {
      return NextResponse.json({ error: 'Content too long (max 2000 chars)' }, { status: 400 })
    }
    if (type === 'payment_request' && !(role === 'admin' || role === 'moderator')) {
      return NextResponse.json({ error: 'Forbidden: only staff can request payments' }, { status: 403 })
    }
    if (type === 'payment_request') {
      const amt = Number(metadata?.amount)
      if (!amt || amt <= 0) return NextResponse.json({ error: 'Invalid payment amount' }, { status: 400 })
    }
    
    // Get actual user name instead of defaulting to 'User'
    let senderName = body?.senderName
    if (!senderName || senderName === 'User') {
      try {
        const user = await User.findOne({ clerkUserId: userId }).select('name').lean()
        senderName = (user as any)?.name || `${role.charAt(0).toUpperCase() + role.slice(1)}`
      } catch (e) {
        senderName = `${role.charAt(0).toUpperCase() + role.slice(1)}`
      }
    }
    
    const msg = await sendMessage({ conversationId: id, senderId: userId, senderName, senderRole: role, content: content || '', type: (type || 'text') as any, metadata })
    return NextResponse.json({ success: true, message: msg })
  } catch (e: any) {
    console.error('[CONVERSATION_MESSAGES_POST]', e)
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rl = rateLimit({ key: getClientKeyFromRequest(req, 'messages:seen'), limit: 60, windowMs: 60_000 })
    if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    
    const { id } = await params
    const { sessionClaims } = getAuth(req) as any
    const userId = sessionClaims?.sub
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    const body = await req.json()
    const messageIds = body?.messageIds as string[]
    
    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return NextResponse.json({ error: 'messageIds array is required' }, { status: 400 })
    }
    
    await markMessagesSeen({ conversationId: id, userId, messageIds })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('[CONVERSATION_MESSAGES_PATCH]', e)
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
