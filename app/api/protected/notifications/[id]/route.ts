import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { markAsRead } from '@/lib/services/notification.service'
import User from '@/models/User'
import connectDB from '@/lib/db'

export async function PATCH(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) return new NextResponse('Unauthorized', { status: 401 })
    await connectDB()
  const mongoUser = await User.findOne({ clerkUserId }).select('_id').lean() as { _id: any } | null
  if (!mongoUser || !mongoUser._id) return new NextResponse('User not provisioned', { status: 404 })
  const updated = await markAsRead(params.id, String(mongoUser._id))
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
