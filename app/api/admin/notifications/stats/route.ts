import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import connectDB from '@/lib/db'
import NotificationLog from '@/models/NotificationLog'
import { ConfigValidator } from '@/lib/services/config-validator.service'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has admin role (you may need to implement role checking)
    // For now, we'll assume the route is protected by middleware

    await connectDB()

    // Get overall statistics
    const totalStats = await NotificationLog.aggregate([
      {
        $group: {
          _id: null,
          totalSent: { $sum: '$totalSent' },
          totalFailed: { $sum: '$totalFailed' }
        }
      }
    ])

    // Get recent notifications (last 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const recentCount = await NotificationLog.countDocuments({
      createdAt: { $gte: twentyFourHoursAgo }
    })

    // Get active channels from service configuration
    const serviceAvailability = ConfigValidator.getServiceAvailability()
    const activeChannels = Object.entries(serviceAvailability)
      .filter(([_, isActive]) => isActive)
      .map(([service, _]) => {
        // Map service names to channel names
        switch (service) {
          case 'webPush': return 'web_push'
          case 'email': return 'email'
          case 'whatsapp': return 'whatsapp'
          case 'sms': return 'sms'
          default: return service
        }
      })

    const stats = {
      totalSent: totalStats[0]?.totalSent || 0,
      totalFailed: totalStats[0]?.totalFailed || 0,
      recentNotifications: recentCount,
      activeChannels
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching notification stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notification statistics' },
      { status: 500 }
    )
  }
}