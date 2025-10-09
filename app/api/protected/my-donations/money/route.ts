import { auth } from '@clerk/nextjs/server'
import dbConnect from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { CampaignDonation } from '@/models'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    await dbConnect()

    // Find all money donations for the current user
    const donations = await CampaignDonation.find({ donorId: userId })
      .populate('campaignId', 'title')
      .populate('programId', 'title')
      .sort({ createdAt: -1 })
      .lean()

    return NextResponse.json({
      success: true,
      donations
    })

  } catch (error) {
    console.error('Error fetching money donations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch donations' },
      { status: 500 }
    )
  }
}