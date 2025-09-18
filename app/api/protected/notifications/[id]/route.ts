import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { markAsRead } from '@/lib/services/notification.service'
import connectDB from '@/lib/db'

// Mark a notification as read. Notification.recipient stores the Clerk user ID directly,
// so we should not translate to a Mongo _id. Previous implementation incorrectly looked up
// a User document and passed its _id, which would never match Notification.recipient (Clerk ID),
// resulting in markAsRead returning null and a client-side "Failed to mark read" error.
export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) return new NextResponse('Unauthorized', { status: 401 })
    await connectDB()
    const { id } = await params
    const updated = await markAsRead(id, clerkUserId)
    if (!updated) return new NextResponse('Forbidden', { status: 403 })
    return NextResponse.json({ success: true, notification: updated })
  } catch (e) {
    console.error('[NOTIFICATION_MARK_READ_ERROR]', e)
    return new NextResponse('Server error', { status: 500 })
  }
}

export async function DELETE() {
  return new NextResponse('Not implemented', { status: 405 })
}
