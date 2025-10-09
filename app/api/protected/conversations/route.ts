import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@clerk/nextjs/server'
import { createOrGetConversation, getUserConversations } from '@/lib/services/conversation.service'
import { rateLimit, getClientKeyFromRequest } from '@/lib/utils/rateLimiter'

export async function GET(req: NextRequest) {
  try {
    const rl = rateLimit({ key: getClientKeyFromRequest(req, 'conversations:list'), limit: 60, windowMs: 60_000 })
    if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    const { sessionClaims } = getAuth(req) as any
    const userId = sessionClaims?.sub
    const role = sessionClaims?.metadata?.role || 'user'
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const page = Math.max(1, Number(searchParams.get('page') || 1))
  const limit = Math.min(200, Math.max(1, Number(searchParams.get('limit') || 50)))
  const convos = await getUserConversations({ userId, role, page, limit })
    return NextResponse.json({ conversations: convos })
  } catch (e: any) {
    console.error('[CONVERSATIONS_GET]', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const rl = rateLimit({ key: getClientKeyFromRequest(req, 'conversations:create'), limit: 20, windowMs: 60_000 })
    if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    const { sessionClaims } = getAuth(req) as any
    const userId = sessionClaims?.sub
    const body = await req.json()
    const { scrapItemId, buyerName } = body || {}
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!scrapItemId) return NextResponse.json({ error: 'scrapItemId is required' }, { status: 400 })
    const convo = await createOrGetConversation({ scrapItemId, buyerId: userId, buyerName: buyerName || 'Buyer' })
    return NextResponse.json({ success: true, conversation: convo })
  } catch (e: any) {
    console.error('[CONVERSATIONS_POST]', e)
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
