import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import connectDB from '@/lib/db'
import SadqaSubscription from '@/models/SadqaSubscription'
import CampaignDonation from '@/models/CampaignDonation'
import { checkRole } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const hasPermission = await checkRole(['admin'])
    if (!hasPermission) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '30' // days
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - parseInt(period))

    await connectDB()

    // Revenue analytics
    const revenueData = await CampaignDonation.aggregate([
      {
        $match: {
          isRecurring: true,
          status: 'completed',
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          dailyRevenue: { $sum: '$amount' },
          transactionCount: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ])

    // Subscription growth analytics
    const growthData = await SadqaSubscription.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          newSubscriptions: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ])

    // Plan type distribution
    const planDistribution = await SadqaSubscription.aggregate([
      {
        $group: {
          _id: '$planType',
          count: { $sum: 1 },
          totalRevenue: { $sum: '$totalPaid' },
          avgAmount: { $avg: '$amount' }
        }
      }
    ])

    // Payment success/failure rates
    const paymentStats = await CampaignDonation.aggregate([
      {
        $match: {
          isRecurring: true,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ])

    // User engagement metrics
    const engagementStats = await SadqaSubscription.aggregate([
      {
        $group: {
          _id: '$clerkUserId',
          subscriptionCount: { $sum: 1 },
          totalDonated: { $sum: '$totalPaid' },
          avgSubscriptionDuration: { 
            $avg: { 
              $divide: [
                { $subtract: ['$lastPaymentDate', '$startDate'] },
                1000 * 60 * 60 * 24 // Convert to days
              ]
            }
          }
        }
      },
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          avgSubscriptionsPerUser: { $avg: '$subscriptionCount' },
          avgDonationPerUser: { $avg: '$totalDonated' },
          avgRetentionDays: { $avg: '$avgSubscriptionDuration' }
        }
      }
    ])

    // Churn analysis
    const churnData = await SadqaSubscription.aggregate([
      {
        $match: {
          status: { $in: ['cancelled', 'expired'] },
          endDate: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$endDate' },
            month: { $month: '$endDate' },
            day: { $dayOfMonth: '$endDate' }
          },
          churnedSubscriptions: { $sum: 1 },
          churnedRevenue: { $sum: '$amount' }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ])

    return NextResponse.json({
      success: true,
      analytics: {
        revenue: {
          daily: revenueData,
          total: revenueData.reduce((sum, day) => sum + day.dailyRevenue, 0),
          transactions: revenueData.reduce((sum, day) => sum + day.transactionCount, 0)
        },
        growth: {
          daily: growthData,
          totalNewSubscriptions: growthData.reduce((sum, day) => sum + day.newSubscriptions, 0)
        },
        planDistribution,
        paymentStats: {
          success: paymentStats.find(s => s._id === 'completed')?.count || 0,
          failed: paymentStats.find(s => s._id === 'failed')?.count || 0,
          pending: paymentStats.find(s => s._id === 'pending')?.count || 0,
          successRate: paymentStats.length > 0 ? 
            ((paymentStats.find(s => s._id === 'completed')?.count || 0) / 
             paymentStats.reduce((sum, s) => sum + s.count, 0)) * 100 : 0
        },
        engagement: engagementStats[0] || {
          totalUsers: 0,
          avgSubscriptionsPerUser: 0,
          avgDonationPerUser: 0,
          avgRetentionDays: 0
        },
        churn: {
          daily: churnData,
          totalChurned: churnData.reduce((sum, day) => sum + day.churnedSubscriptions, 0)
        }
      }
    })

  } catch (error) {
    console.error('Error fetching subscription analytics:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch analytics' 
      },
      { status: 500 }
    )
  }
}