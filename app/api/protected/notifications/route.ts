import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { notificationService } from '../../../../lib/services/notification.service'
import { createNotificationSchema } from '../../../../lib/validators/notification.validator'

export async function GET(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) return new NextResponse('Unauthorized', { status: 401 })
    const url = new URL(req.url)
    const page = parseInt(url.searchParams.get('page') || '1', 10)
    const limit = parseInt(url.searchParams.get('limit') || '20', 10)
    const unreadOnly = (url.searchParams.get('unreadOnly') || url.searchParams.get('unread')) === 'true'
    const type = url.searchParams.get('type') || undefined
    const { items, total } = await notificationService.listNotifications(userId, { page, limit, unreadOnly, type })
    // Always include unread count for bell badge UX
    const { total: unreadCount } = await notificationService.listNotifications(userId, { page: 1, limit: 1, unreadOnly: true })
    return NextResponse.json({ items, total, page, limit, unreadCount })
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
    const json = await req.json()

    // Web push subscription can be routed here (legacy catch) but should use dedicated endpoint; ignore if detected
    if (json?.action === 'subscribe-web-push') {
      await notificationService.subscribeToWebPush(userId, json.subscription)
      return NextResponse.json({ success: true })
    }

    if (!['admin','moderator'].includes(role)) return new NextResponse('Forbidden', { status: 403 })
    const parsed = createNotificationSchema.safeParse(json)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    const created = await notificationService.createNotification(parsed.data.recipient, parsed.data)
    return NextResponse.json({ success: true, notification: created })
  } catch (e) {
    console.error(e)
    return new NextResponse('Server error', { status: 500 })
  }
}
