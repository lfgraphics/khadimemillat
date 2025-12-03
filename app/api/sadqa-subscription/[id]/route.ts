import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import connectDB from '@/lib/db'
import SadqaSubscription from '@/models/SadqaSubscription'
import { SadqaSubscriptionService } from '@/lib/services/sadqa-subscription.service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    await connectDB()

    const subscription = await SadqaSubscription.findOne({
      _id: id,
      clerkUserId: userId
    }).lean()

    if (!subscription) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      subscription
    })

  } catch (error) {
    console.error('Error fetching subscription:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch subscription' 
      },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const { status, pausedReason, cancelledReason } = body

    if (!status || !['paused', 'cancelled', 'active'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be: paused, cancelled, or active' },
        { status: 400 }
      )
    }

    await connectDB()

    const subscription = await SadqaSubscription.findOne({
      _id: id,
      clerkUserId: userId
    })

    if (!subscription) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      )
    }

    // Use service to update subscription status
    const result = await SadqaSubscriptionService.updateSubscriptionStatus(
      id,
      status,
      status === 'paused' ? pausedReason : cancelledReason
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      subscription: result.subscription,
      message: `Subscription ${status} successfully`
    })

  } catch (error) {
    console.error('Error updating subscription:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update subscription' 
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    let cancelReason = 'Removed by user'
    
    // Try to parse body if it exists, otherwise use default
    try {
      const body = await request.json()
      cancelReason = body.cancelReason || cancelReason
    } catch (error) {
      // No body or invalid JSON, use default reason
    }

    await connectDB()

    const subscription = await SadqaSubscription.findOne({
      _id: id,
      clerkUserId: userId
    })

    if (!subscription) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      )
    }

    // If subscription is already cancelled or expired, just remove it from the list
    if (subscription.status === 'cancelled' || subscription.status === 'expired') {
      // For cancelled/expired subscriptions, we can safely delete the record
      await SadqaSubscription.findByIdAndDelete(id)
      
      return NextResponse.json({
        success: true,
        message: 'Subscription removed successfully'
      })
    }

    // Use service to cancel subscription
    const result = await SadqaSubscriptionService.updateSubscriptionStatus(
      id,
      'cancelled',
      cancelReason
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Subscription cancelled successfully'
    })

  } catch (error) {
    console.error('Error cancelling subscription:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to cancel subscription' 
      },
      { status: 500 }
    )
  }
}