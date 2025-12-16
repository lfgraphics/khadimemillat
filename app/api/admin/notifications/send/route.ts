import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { NotificationService } from '@/lib/services/notification.service'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has admin role (you may need to implement role checking)
    // For now, we'll assume the route is protected by middleware

    const body = await request.json()
    const { title, message, channels, targetRoles } = body

    // Validate required fields
    if (!title || !message || !channels || !targetRoles) {
      return NextResponse.json(
        { error: 'Missing required fields: title, message, channels, targetRoles' },
        { status: 400 }
      )
    }

    if (!Array.isArray(channels) || channels.length === 0) {
      return NextResponse.json(
        { error: 'At least one channel must be selected' },
        { status: 400 }
      )
    }

    if (!Array.isArray(targetRoles) || targetRoles.length === 0) {
      return NextResponse.json(
        { error: 'At least one target role must be selected' },
        { status: 400 }
      )
    }

    // Send notification using the notification service
    const result = await NotificationService.sendNotification({
      title,
      message,
      channels,
      targetRoles,
      sentBy: userId,
      metadata: {
        source: 'admin_dashboard',
        timestamp: new Date().toISOString()
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in notification send API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}