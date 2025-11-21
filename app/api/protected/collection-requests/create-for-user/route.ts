import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'
import { collectionRequestService } from '@/lib/services/collectionRequest.service'
import { notificationService } from '@/lib/services/notification.service'
import { clerkClient } from '@clerk/nextjs/server'

// Remove wrapper function - clerkClient is ready to use directly

// Schema for creating donation request for a specific user
const createDonationRequestForUserSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  pickupTime: z.string().refine(val => {
    // Accept both local datetime format and ISO strings
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(val)) return true
    return !isNaN(Date.parse(val))
  }, { message: 'Invalid pickup time format' }),
  items: z.string().optional(),
  notes: z.string().optional()
})

export async function POST(req: NextRequest) {
  let targetUserId: string | undefined;

  try {
    const { userId: clerkUserId } = await auth()

    // Only admins can create donation requests for other users
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const client = await clerkClient()
    const currentUser = await client.users.getUser(clerkUserId)
    const role = currentUser.publicMetadata?.role as string

    if (!['admin'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = createDonationRequestForUserSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: parsed.error.flatten()
      }, { status: 400 })
    }

    const { userId: targetUserIdParsed, pickupTime, items, notes } = parsed.data
    targetUserId = targetUserIdParsed

    // Get the target user's information from Clerk
    let targetUser
    try {
      targetUser = await client.users.getUser(targetUserId!)
    } catch (error) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Extract user information for the donation request
    const userPhone = targetUser.privateMetadata?.phone as string
    const userAddress = targetUser.publicMetadata?.address as string
    const userName = `${targetUser.firstName || ''} ${targetUser.lastName || ''}`.trim() || targetUser.username || 'Unknown'

    if (!userPhone) {
      return NextResponse.json({
        error: 'User phone number is required but not found'
      }, { status: 400 })
    }

    if (!userAddress) {
      return NextResponse.json({
        error: 'User address is required but not found'
      }, { status: 400 })
    }

    // Create the collection request with 'verified' status
    const collectionRequest = await collectionRequestService.createCollectionRequest({
      donor: targetUserId!,
      requestedPickupTime: new Date(pickupTime),
      address: userAddress,
      phone: userPhone,
      notes: notes ? `Items: ${items || 'Not specified'}\nNotes: ${notes}` : `Items: ${items || 'Not specified'}`,
      status: 'verified' // Pre-verified as per requirements
    })

    // Get all field executives for notification
    const fieldExecutives = await collectionRequestService.getAllFieldExecutives()
    const fieldExecutiveIds = fieldExecutives.map((fieldExecutive: any) => fieldExecutive.id)

    // Send notifications to all field executives with detailed information
    if (fieldExecutiveIds.length > 0) {
      const pickupDate = new Date(pickupTime).toLocaleString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })

      await notificationService.notifyUsers(fieldExecutiveIds, {
        title: 'New Verified Collection Request',
        body: `${userName} - ${pickupDate}\nAddress: ${userAddress}\nPhone: ${userPhone}${items ? `\nItems: ${items}` : ''}`,
        url: '/field-executive/assigned',
        type: 'collection_assigned'
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Donation request created successfully',
      request: {
        id: collectionRequest._id,
        userId: targetUserId!,
        userName,
        userAddress,
        userPhone,
        pickupTime: new Date(pickupTime),
        status: 'verified',
        items: items || 'Not specified',
        notes: notes || '',
        fieldExecutiveNotificationsSent: fieldExecutiveIds.length
      }
    })

  } catch (error) {
    console.error('[CREATE_DONATION_REQUEST_FOR_USER_ERROR]', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      userId: targetUserId || 'unknown',
    })

    // Provide specific error messages based on error type
    let errorMessage = 'Internal server error'
    let statusCode = 500

    if (error instanceof Error) {
      if (error.message.includes('validation') || error.message.includes('Invalid')) {
        errorMessage = 'Invalid request data. Please check all fields and try again.'
        statusCode = 400
      } else if (error.message.includes('not found') || error.message.includes('User not found')) {
        errorMessage = 'User not found. Please verify the user exists.'
        statusCode = 404
      } else if (error.message.includes('permission') || error.message.includes('Forbidden')) {
        errorMessage = 'You do not have permission to perform this action.'
        statusCode = 403
      } else if (error.message.includes('network') || error.message.includes('timeout')) {
        errorMessage = 'Network error. Please try again.'
        statusCode = 503
      }
    }

    return NextResponse.json({
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
    }, { status: statusCode })
  }
}