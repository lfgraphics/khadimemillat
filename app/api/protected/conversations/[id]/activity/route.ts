import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@clerk/nextjs/server'
import connectDB from '@/lib/db'
import ConversationActivity from '@/models/ConversationActivity'
import Conversation from '@/models/Conversation'

// POST: Update user activity in conversation
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { sessionClaims } = getAuth(req) as any
    const userId = sessionClaims?.sub
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    // Verify user is participant in conversation
    const conversation = await Conversation.findById(id)
    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    if (!conversation.participants.includes(userId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Update or create activity record
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 2 * 60 * 1000) // 2 minutes from now

    await ConversationActivity.findOneAndUpdate(
      { conversationId: id, userId },
      {
        isActive: true,
        lastActiveAt: now,
        expiresAt
      },
      { upsert: true, new: true }
    )

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[CONVERSATION_ACTIVITY_POST]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE: Mark user as inactive in conversation
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { sessionClaims } = getAuth(req) as any
    const userId = sessionClaims?.sub
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    // Mark user as inactive
    await ConversationActivity.findOneAndUpdate(
      { conversationId: id, userId },
      { isActive: false },
      { upsert: true }
    )

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[CONVERSATION_ACTIVITY_DELETE]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}