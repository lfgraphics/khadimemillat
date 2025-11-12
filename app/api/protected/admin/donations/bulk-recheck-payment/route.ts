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
    const { donationIds } = body

    if (!donationIds || !Array.isArray(donationIds) || donationIds.length === 0) {
      return NextResponse.json(
        { error: 'Missing or invalid donationIds array' },
        { status: 400 }
      )
    }

    // Create a readable stream for real-time progress updates
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const total = donationIds.length
          let completed = 0

          // Send initial progress
          controller.enqueue(
            encoder.encode(
              JSON.stringify({ 
                type: 'progress', 
                completed: 0, 
                total,
                message: 'Starting bulk payment recheck...' 
              }) + '\n'
            )
          )

          // Process donations in batches
          const batchSize = 5
          const allResults = []

          for (let i = 0; i < donationIds.length; i += batchSize) {
            const batch = donationIds.slice(i, i + batchSize)
            
            // Send batch start update
            controller.enqueue(
              encoder.encode(
                JSON.stringify({ 
                  type: 'progress', 
                  completed, 
                  total,
                  message: `Processing batch ${Math.floor(i / batchSize) + 1}...` 
                }) + '\n'
              )
            )

            const batchResults = await razorpayPaymentSyncService.bulkRecheckPayments(
              batch,
              userId
            )

            allResults.push(...batchResults)
            completed += batch.length

            // Send progress update
            controller.enqueue(
              encoder.encode(
                JSON.stringify({ 
                  type: 'progress', 
                  completed, 
                  total,
                  message: `Completed ${completed} of ${total} donations` 
                }) + '\n'
              )
            )

            // Small delay between batches to avoid overwhelming the client
            if (i + batchSize < donationIds.length) {
              await new Promise(resolve => setTimeout(resolve, 100))
            }
          }

          // Send completion message
          controller.enqueue(
            encoder.encode(
              JSON.stringify({ 
                type: 'complete', 
                results: allResults,
                summary: {
                  total: allResults.length,
                  successful: allResults.filter(r => r.recheckSuccess).length,
                  failed: allResults.filter(r => !r.recheckSuccess).length
                }
              }) + '\n'
            )
          )

          controller.close()
        } catch (error) {
          console.error('Error in bulk payment recheck:', error)
          controller.enqueue(
            encoder.encode(
              JSON.stringify({ 
                type: 'error', 
                error: (error as Error).message 
              }) + '\n'
            )
          )
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

  } catch (error) {
    console.error('Error starting bulk payment recheck:', error)
    return NextResponse.json(
      { 
        error: 'Failed to start bulk payment recheck',
        details: (error as Error).message
      },
      { status: 500 }
    )
  }
}