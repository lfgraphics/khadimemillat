import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@clerk/nextjs/server'
import connectDB from '@/lib/db'
import ConversationActivity from '@/models/ConversationActivity'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { sessionClaims } = getAuth(req) as any
    const userId = sessionClaims?.sub
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    const body = await req.json()
    const { active } = body
    
    await connectDB()
    
    if (active) {
      // Mark user as active in this conversation
      await ConversationActivity.findOneAndUpdate(
        { conversationId: id, userId },
        { 
          conversationId: id, 
          userId, 
          isActive: true, 
          lastActiveAt: new Date(),
          expiresAt: new Date(Date.now() + 2 * 60 * 1000) // 2 minutes
        },
        { upsert: true, new: true }
      )
    } else {
      // Mark user as inactive
      await ConversationActivity.deleteOne({ conversationId: id, userId })
    }
    
    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('[CONVERSATION_ACTIVITY]', e)
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}