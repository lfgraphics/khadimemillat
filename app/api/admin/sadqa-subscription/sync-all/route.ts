import { NextResponse } from 'next/server'
import { checkRole } from '@/utils/roles'
import connectDB from '@/lib/db'
import SadqaSubscription from '@/models/SadqaSubscription'
import { SadqaSubscriptionService } from '@/lib/services/sadqa-subscription.service'

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

    await connectDB()

    // Get all active subscriptions with Razorpay subscription IDs
    const subscriptions = await SadqaSubscription.find({
      status: { $in: ['active', 'pending_payment', 'paused'] },
      razorpaySubscriptionId: { $exists: true, $ne: null }
    }).select('_id razorpaySubscriptionId status')

    let syncedCount = 0
    let errorCount = 0
    const errors: string[] = []

    for (const subscription of subscriptions) {
      try {
        // Sync individual subscription status
        const result = await SadqaSubscriptionService.syncSubscriptionStatus(subscription._id.toString())
        
        if (result.success) {
          syncedCount++
        } else {
          errorCount++
          errors.push(`${subscription._id}: ${result.error}`)
        }
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        errorCount++
        errors.push(`${subscription._id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sync completed: ${syncedCount} successful, ${errorCount} errors`,
      syncedCount,
      errorCount,
      totalProcessed: subscriptions.length,
      errors: errors.slice(0, 10) // Limit error details
    })

  } catch (error) {
    console.error('Error syncing all subscriptions:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to sync subscriptions' 
      },
      { status: 500 }
    )
  }
}