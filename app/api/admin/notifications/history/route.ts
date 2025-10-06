import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import connectDB from '@/lib/db'
import NotificationLog from '@/models/NotificationLog'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has admin role (you may need to implement role checking)
    // For now, we'll assume the route is protected by middleware

    await connectDB()

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''

    // Build query
    const query: any = {}
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } }
      ]
    }

    // Get notifications with pagination
    const notifications = await NotificationLog.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('title message channels targetRoles totalSent totalFailed sentBy createdAt')
      .lean()

    // Get total count for pagination
    const total = await NotificationLog.countDocuments(query)

    return NextResponse.json({
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching notification history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notification history' },
      { status: 500 }
    )
  }
}