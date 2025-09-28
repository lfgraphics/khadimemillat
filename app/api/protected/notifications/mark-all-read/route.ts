import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const runtime = 'nodejs'
import { auth } from '@clerk/nextjs/server'
import { markAllAsRead } from '@/lib/services/notification.service'

export async function POST(_req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return new NextResponse('Unauthorized', { status: 401 })
    await markAllAsRead(userId)
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[NOTIFICATIONS_MARK_ALL_READ_ERROR]', e)
    return new NextResponse('Server error', { status: 500 })
  }
}

export async function GET() { return new NextResponse('Method not allowed', { status: 405 }) }