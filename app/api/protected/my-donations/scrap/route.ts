import { auth } from '@clerk/nextjs/server'
import dbConnect from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { DonationEntry } from '@/models'

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

    // Find all scrap donations for the current user
    const donations = await DonationEntry.find({ donor: userId })
      .populate('collectionRequest', 'address phone notes')
      .sort({ createdAt: -1 })
      .lean()

    return NextResponse.json({
      success: true,
      donations
    })

  } catch (error) {
    console.error('Error fetching scrap donations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch donations' },
      { status: 500 }
    )
  }
}