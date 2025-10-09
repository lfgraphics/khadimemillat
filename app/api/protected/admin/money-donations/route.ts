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
    const search = searchParams.get('search')

    // Build query
    const query: any = {}
    
    if (status && status !== 'all') {
      query.status = status
    }

    if (search) {
      query.$or = [
        { donorName: { $regex: search, $options: 'i' } },
        { donorEmail: { $regex: search, $options: 'i' } }
      ]
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