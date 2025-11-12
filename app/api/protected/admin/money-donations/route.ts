import { auth } from '@clerk/nextjs/server'
import dbConnect from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { CampaignDonation } from '@/models'

export async function GET(request: NextRequest) {
  try {
    const { userId, sessionClaims } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is admin or moderator
    const userRole = (sessionClaims as any)?.metadata?.role || 'user'
    
    if (!['admin', 'moderator'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    await dbConnect()

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const status = searchParams.get('status')
    const paymentVerified = searchParams.get('paymentVerified')
    const panProvided = searchParams.get('panProvided')
    const search = searchParams.get('search')
    const showAll = searchParams.get('showAll') === 'true' // Admin override parameter
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    // Build query with default audit filtering
    const query: any = {}
    const andConditions: any[] = []
    
    // Default filtering: only show verified and completed donations unless admin override
    if (!showAll) {
      query.status = 'completed'
      // Only set default paymentVerified if not explicitly filtered
      if (!paymentVerified || paymentVerified === 'all') {
        query.paymentVerified = true
      }
    } else {
      // Admin override: apply status filter if provided
      if (status && status !== 'all') {
        query.status = status
      }
    }

    // Apply payment verification filter
    if (paymentVerified && paymentVerified !== 'all') {
      if (paymentVerified === 'verified') {
        query.paymentVerified = true
      } else if (paymentVerified === 'unverified') {
        query.paymentVerified = { $ne: true }
      }
    }

    // Apply PAN provided filter
    if (panProvided && panProvided !== 'all') {
      if (panProvided === 'provided') {
        query.donorPAN = { $exists: true, $ne: null }
      } else if (panProvided === 'not_provided') {
        andConditions.push({
          $or: [
            { donorPAN: { $exists: false } },
            { donorPAN: null },
            { donorPAN: '' }
          ]
        })
      }
    }

    if (search) {
      andConditions.push({
        $or: [
          { donorName: { $regex: search, $options: 'i' } },
          { donorEmail: { $regex: search, $options: 'i' } }
        ]
      })
    }

    // Add date range filtering
    if (dateFrom || dateTo) {
      query.createdAt = {}
      if (dateFrom) {
        query.createdAt.$gte = new Date(dateFrom)
      }
      if (dateTo) {
        query.createdAt.$lte = new Date(dateTo)
      }
    }

    // Combine all AND conditions if any exist
    if (andConditions.length > 0) {
      query.$and = andConditions
    }

    // Find money donations with pagination
    const skip = (page - 1) * limit
    const donations = await CampaignDonation.find(query)
      .populate('campaignId', 'title')
      .populate('programId', 'title')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    const total = await CampaignDonation.countDocuments(query)

    return NextResponse.json({
      success: true,
      donations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      filters: {
        showAll,
        appliedFilters: showAll ? 'All donations with status indicators' : 'Verified and completed donations only'
      }
    })

  } catch (error) {
    console.error('Error fetching money donations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch donations' },
      { status: 500 }
    )
  }
}