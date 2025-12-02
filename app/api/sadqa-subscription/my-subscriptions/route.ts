import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import connectDB from '@/lib/db'
import SadqaSubscription from '@/models/SadqaSubscription'
import { SadqaSubscriptionService } from '@/lib/services/sadqa-subscription.service'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    // Get subscriptions
    const result = await SadqaSubscriptionService.getUserSubscriptions(userId)
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    let subscriptions = result.subscriptions || []

    // Apply status filter if provided
    if (status && ['active', 'paused', 'cancelled', 'expired', 'pending_payment'].includes(status)) {
      subscriptions = subscriptions.filter(sub => sub.status === status)
    }

    // Apply pagination
    const total = subscriptions.length
    subscriptions = subscriptions.slice(skip, skip + limit)

    // Calculate subscription statistics from synced data
    const allSubscriptions = result.subscriptions || []
    const subscriptionStats = {
      total: allSubscriptions.length,
      active: allSubscriptions.filter(s => s.status === 'active').length,
      paused: allSubscriptions.filter(s => s.status === 'paused').length,
      cancelled: allSubscriptions.filter(s => s.status === 'cancelled').length,
      expired: allSubscriptions.filter(s => s.status === 'expired').length,
      pending_payment: allSubscriptions.filter(s => s.status === 'pending_payment').length,
      totalDonated: allSubscriptions.reduce((sum, s) => sum + (s.totalPaid || 0), 0)
    }

    return NextResponse.json({
      success: true,
      subscriptions,
      stats: subscriptionStats,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Error fetching user subscriptions:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch subscriptions' 
      },
      { status: 500 }
    )
  }
}