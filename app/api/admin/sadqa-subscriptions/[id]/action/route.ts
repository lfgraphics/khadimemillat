import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import connectDB from '@/lib/db'
import SadqaSubscription from '@/models/SadqaSubscription'
import { SadqaSubscriptionService } from '@/lib/services/sadqa-subscription.service'
import { checkRole } from '@/lib/auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const hasPermission = await checkRole(['admin'])
    if (!hasPermission) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { action, reason, adminNotes } = body

    if (!action || !['pause', 'resume', 'cancel'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be: pause, resume, or cancel' },
        { status: 400 }
      )
    }

    if (!reason) {
      return NextResponse.json(
        { error: 'Reason is required for admin actions' },
        { status: 400 }
      )
    }

    await connectDB()

    const subscription = await SadqaSubscription.findById(id)
    if (!subscription) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      )
    }

    // Map action to status
    const statusMap: Record<string, string> = {
      pause: 'paused',
      resume: 'active',
      cancel: 'cancelled'
    }

    const newStatus = statusMap[action]

    // Validate status transition
    if (action === 'resume' && subscription.status !== 'paused') {
      return NextResponse.json(
        { error: 'Can only resume paused subscriptions' },
        { status: 400 }
      )
    }

    if (action === 'pause' && subscription.status !== 'active') {
      return NextResponse.json(
        { error: 'Can only pause active subscriptions' },
        { status: 400 }
      )
    }

    if (action === 'cancel' && subscription.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Subscription is already cancelled' },
        { status: 400 }
      )
    }

    // Use service to update subscription status
    const result = await SadqaSubscriptionService.updateSubscriptionStatus(
      id,
      newStatus,
      reason,
      userId, // Admin user ID
      adminNotes
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
      message: `Subscription ${action}d successfully by admin`
    })

  } catch (error) {
    console.error('Error performing admin action on subscription:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to perform admin action' 
      },
      { status: 500 }
    )
  }
}