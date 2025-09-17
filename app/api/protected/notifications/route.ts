import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { notificationService } from '@/lib/services/notification.service'
import { createNotificationSchema } from '@/lib/validators/notification.validator'
import User from '@/models/User'
import connectDB from '@/lib/db'

export async function GET(req: Request) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) return new NextResponse('Unauthorized', { status: 401 })
    const url = new URL(req.url)
    const page = parseInt(url.searchParams.get('page') || '1', 10)
    const limit = parseInt(url.searchParams.get('limit') || '20', 10)
    const unreadOnly = url.searchParams.get('unread') === 'true'
    const type = url.searchParams.get('type') || undefined

    await connectDB()
    const mongoUser = await User.findOne({ clerkUserId }).select('_id').lean<{ _id?: string }>() as { _id?: string } | null
    // If the authed Clerk user has no Mongo user yet, return empty list gracefully
    if (!mongoUser?._id) {
      return NextResponse.json({ items: [], total: 0, page, limit })
    }

    const { items, total } = await notificationService.listNotifications(String(mongoUser._id), { page, limit, unreadOnly, type })
    return NextResponse.json({ items, total, page, limit })
  } catch (e) {
    console.error('[NOTIFICATIONS_GET_ERROR]', e)
    return new NextResponse('Server error', { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { userId, sessionClaims } = await auth()
    if (!userId) return new NextResponse('Unauthorized', { status: 401 })
    const role = (sessionClaims as any)?.metadata?.role || 'user'
    if (!['admin','moderator'].includes(role)) return new NextResponse('Forbidden', { status: 403 })
    const json = await req.json()
    const parsed = createNotificationSchema.safeParse(json)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    const created = await notificationService.createNotification(parsed.data)
    return NextResponse.json({ success: true, notification: created })
  } catch (e) {
    console.error(e)
    return new NextResponse('Server error', { status: 500 })
  }
}
