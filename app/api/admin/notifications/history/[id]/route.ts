import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import connectDB from '@/lib/db'
import NotificationLog from '@/models/NotificationLog'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has admin role (you may need to implement role checking)
    // For now, we'll assume the route is protected by middleware

    await connectDB()

    const { id } = await params
    const notificationId = id

    // Get detailed notification with recipient information
    const notification = await NotificationLog.findById(notificationId).lean()

    if (!notification) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(notification)
  } catch (error) {
    console.error('Error fetching detailed notification:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notification details' },
      { status: 500 }
    )
  }
}