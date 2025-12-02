import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import connectDB from '@/lib/db'
import SadqaSubscription from '@/models/SadqaSubscription'
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
    const status = searchParams.get('status')
    const planType = searchParams.get('planType')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const skip = (page - 1) * limit

    await connectDB()

    // Build query
    const query: any = {}
    
    if (status && ['active', 'paused', 'cancelled', 'expired'].includes(status)) {
      query.status = status
    }
    
    if (planType && ['daily', 'weekly', 'monthly', 'yearly'].includes(planType)) {
      query.planType = planType
    }

    if (search) {
      query.$or = [
        { userName: { $regex: search, $options: 'i' } },
        { userEmail: { $regex: search, $options: 'i' } },
        { razorpaySubscriptionId: { $regex: search, $options: 'i' } }
      ]
    }

    if (startDate || endDate) {
      query.createdAt = {}
      if (startDate) query.createdAt.$gte = new Date(startDate)
      if (endDate) query.createdAt.$lte = new Date(endDate)
    }

    // Get subscriptions with pagination
    const subscriptions = await SadqaSubscription.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    const total = await SadqaSubscription.countDocuments(query)

    // Get overall statistics
    const stats = await SadqaSubscription.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalPaid' },
          avgAmount: { $avg: '$amount' }
        }
      }
    ])

    const planStats = await SadqaSubscription.aggregate([
      {
        $group: {
          _id: '$planType',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalPaid' }
        }
      }
    ])

    const overallStats = {
      total,
      byStatus: stats.reduce((acc, stat) => {
        acc[stat._id] = {
          count: stat.count,
          totalAmount: stat.totalAmount,
          avgAmount: stat.avgAmount
        }
        return acc
      }, {}),
      byPlanType: planStats.reduce((acc, stat) => {
        acc[stat._id] = {
          count: stat.count,
          totalAmount: stat.totalAmount
        }
        return acc
      }, {}),
      totalRevenue: stats.reduce((sum, stat) => sum + (stat.totalAmount || 0), 0)
    }

    return NextResponse.json({
      success: true,
      subscriptions,
      stats: overallStats,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Error fetching admin subscriptions:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch subscriptions' 
      },
      { status: 500 }
    )
  }
}