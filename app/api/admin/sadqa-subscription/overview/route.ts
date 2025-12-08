import { NextResponse } from 'next/server'
import { checkRole } from '@/utils/roles'
import connectDB from '@/lib/db'
import SadqaSubscription from '@/models/SadqaSubscription'

export async function GET() {
  try {
    // Check if user is admin or moderator
    const isAdmin = await checkRole('admin')
    const isModerator = await checkRole('moderator')
    
    if (!isAdmin && !isModerator) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    await connectDB()

    // Get subscription statistics
    const totalSubscriptions = await SadqaSubscription.countDocuments()
    const activeSubscriptions = await SadqaSubscription.countDocuments({ status: 'active' })
    const pausedSubscriptions = await SadqaSubscription.countDocuments({ status: 'paused' })
    const cancelledSubscriptions = await SadqaSubscription.countDocuments({ status: 'cancelled' })
    const expiredSubscriptions = await SadqaSubscription.countDocuments({ status: 'expired' })
    const pendingPaymentSubscriptions = await SadqaSubscription.countDocuments({ status: 'pending_payment' })

    // Calculate revenue statistics
    const revenueStats = await SadqaSubscription.aggregate([
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalPaid' },
          monthlyRevenue: { 
            $sum: { 
              $cond: [
                { $eq: ['$status', 'active'] },
                '$amount',
                0
              ]
            }
          },
          averageAmount: { $avg: '$amount' }
        }
      }
    ])

    const stats = {
      total: totalSubscriptions,
      active: activeSubscriptions,
      paused: pausedSubscriptions,
      cancelled: cancelledSubscriptions,
      expired: expiredSubscriptions,
      pending_payment: pendingPaymentSubscriptions,
      totalRevenue: revenueStats[0]?.totalRevenue || 0,
      monthlyRevenue: revenueStats[0]?.monthlyRevenue || 0,
      averageAmount: revenueStats[0]?.averageAmount || 0
    }

    // Get recent subscriptions with user details
    const subscriptions = await SadqaSubscription.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .lean()

    // Enrich with user details
    const enrichedSubscriptions = await Promise.all(
      subscriptions.map(async (subscription) => {
        return {
          ...subscription,
          userName: subscription.userName || 'Unknown User',
          userEmail: subscription.userEmail || 'No email',
          userPhone: subscription.userPhone
        }
      })
    )

    return NextResponse.json({
      success: true,
      stats,
      subscriptions: enrichedSubscriptions
    })

  } catch (error) {
    console.error('Error fetching admin subscription overview:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch subscription overview' 
      },
      { status: 500 }
    )
  }
}