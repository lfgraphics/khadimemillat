import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { SponsorshipSyncService } from '@/lib/services/sponsorship-sync.service'

export async function POST() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Fix stuck sponsorships for this user
    const result = await SponsorshipSyncService.fixStuckSponsorships(userId)
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        fixedCount: result.fixedCount
      })
    } else {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Error fixing sponsorship status:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fix sponsorship status'
    }, { status: 500 })
  }
}