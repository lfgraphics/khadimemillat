import { auth } from '@clerk/nextjs/server'
import dbConnect from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { razorpayPaymentSyncService } from '@/lib/services/razorpay-payment-sync.service'

export async function POST(request: NextRequest) {
  try {
    const { userId, sessionClaims } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is admin
    const userRole = (sessionClaims as any)?.metadata?.role || 'user'
    
    if (userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    await dbConnect()

    const body = await request.json()
    const { donationId, paymentId } = body

    if (!donationId || !paymentId) {
      return NextResponse.json(
        { error: 'Missing required fields: donationId and paymentId' },
        { status: 400 }
      )
    }

    // Perform payment recheck
    const result = await razorpayPaymentSyncService.recheckPaymentStatus(
      donationId,
      paymentId,
      userId
    )

    return NextResponse.json({
      success: true,
      result
    })

  } catch (error) {
    console.error('Error rechecking payment:', error)
    return NextResponse.json(
      { 
        error: 'Failed to recheck payment status',
        details: (error as Error).message
      },
      { status: 500 }
    )
  }
}