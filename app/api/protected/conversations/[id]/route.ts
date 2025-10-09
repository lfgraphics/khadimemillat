import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@clerk/nextjs/server'
import { getConversationById, closeConversation } from '@/lib/services/conversation.service'
import { rateLimit, getClientKeyFromRequest } from '@/lib/utils/rateLimiter'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rl = rateLimit({ key: getClientKeyFromRequest(req, 'conversation:get'), limit: 120, windowMs: 60_000 })
    if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    const { id } = await params
    const { sessionClaims } = getAuth(req) as any
    const userId = sessionClaims?.sub
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const convo = await getConversationById({ conversationId: id, userId })
    if (!convo) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ conversation: convo })
  } catch (e: any) {
    console.error('[CONVERSATION_GET]', e)
    return NextResponse.json({ error: e.message || 'Failed' }, { status: 400 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rl = rateLimit({ key: getClientKeyFromRequest(req, 'conversation:update'), limit: 60, windowMs: 60_000 })
    if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    const { id } = await params
    const { sessionClaims } = getAuth(req) as any
    const userId = sessionClaims?.sub
    const role = sessionClaims?.metadata?.role || 'user'
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!(role === 'admin' || role === 'moderator')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const body = await req.json().catch(() => ({}))
    const status = body?.status as 'completed' | 'cancelled'
    if (!status || !['completed', 'cancelled'].includes(status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    const updated = await closeConversation({ conversationId: id, userId, status })
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ success: true, conversation: updated })
  } catch (e: any) {
    console.error('[CONVERSATION_PATCH]', e)
    return NextResponse.json({ error: e.message || 'Failed' }, { status: 400 })
  }
}
