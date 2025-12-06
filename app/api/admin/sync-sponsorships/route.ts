import { NextResponse } from 'next/server'
import { checkRole } from '@/utils/roles'
import { SponsorshipSyncService } from '@/lib/services/sponsorship-sync.service'

export async function POST() {
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

    // Sync all sponsorships
    const result = await SponsorshipSyncService.syncAllSponsorships()
    
    return NextResponse.json(result)

  } catch (error) {
    console.error('Error syncing sponsorships:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Sync failed'
    }, { status: 500 })
  }
}

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

    // Fix stuck sponsorships
    const result = await SponsorshipSyncService.fixStuckSponsorships()
    
    return NextResponse.json(result)

  } catch (error) {
    console.error('Error fixing sponsorships:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Fix failed'
    }, { status: 500 })
  }
}