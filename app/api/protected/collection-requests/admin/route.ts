import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'
import { collectionRequestService } from '@/lib/services/collectionRequest.service'
import { getClerkUserWithSupplementaryData } from '@/lib/services/user.service'

// Schema for admin collection request creation
const adminCollectionRequestSchema = z.object({
  donor: z.string().min(1, 'Donor ID is required'),
  address: z.string().min(10, 'Address must be at least 10 characters'),
  phone: z.string().min(1, 'Phone number is required').refine(val => {
    const digits = val.replace(/[^0-9]/g, '')
    return digits.length >= 10
  }, { message: 'Phone number must contain at least 10 digits' }),
  requestedPickupTime: z.string().refine(val => {
    // Support both datetime-local format and ISO strings
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(val)) return true
    return !isNaN(Date.parse(val))
  }, { message: 'Invalid pickup time format' }).refine(val => {
    const pickupDate = new Date(val)
    const now = new Date()
    return pickupDate > now
  }, { message: 'Pickup time must be in the future' }),
  notes: z.string().optional()
})

export async function POST(req: Request) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user has admin or moderator role
    const currentUser = await getClerkUserWithSupplementaryData(clerkUserId)
    const userRole = currentUser?.role
    
    if (!userRole || !['admin', 'moderator'].includes(userRole)) {
      return NextResponse.json({ 
        error: 'Forbidden: Only admins and moderators can create collection requests for users' 
      }, { status: 403 })
    }

    const json = await req.json()
    const parsed = adminCollectionRequestSchema.safeParse(json)
    
    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {}
      parsed.error.issues.forEach(issue => {
        const field = issue.path.join('.')
        if (!fieldErrors[field]) {
          fieldErrors[field] = []
        }
        fieldErrors[field].push(issue.message)
      })
      
      return NextResponse.json({ 
        error: 'Validation failed',
        details: fieldErrors
      }, { status: 400 })
    }

    const { donor, address, phone, requestedPickupTime, notes } = parsed.data

    // Verify the donor user exists and has required information
    try {
      const donorUser = await getClerkUserWithSupplementaryData(donor)
      if (!donorUser) {
        return NextResponse.json({ 
          error: 'Selected user is no longer available. Please search for the user again.' 
        }, { status: 400 })
      }

      // Check if user has required information (if not provided in form)
      if (!address && !donorUser.address) {
        return NextResponse.json({ 
          error: 'User missing required address information. Please provide an address.' 
        }, { status: 400 })
      }

      if (!phone && !donorUser.phone) {
        return NextResponse.json({ 
          error: 'User missing required phone information. Please provide a phone number.' 
        }, { status: 400 })
      }
    } catch (error: any) {
      console.error('[DONOR_VERIFICATION_ERROR]', error)
      
      if (error.status === 404) {
        return NextResponse.json({ 
          error: 'Selected user is no longer available. Please search for the user again.' 
        }, { status: 400 })
      } else if (error.status === 429) {
        return NextResponse.json({ 
          error: 'Too many requests. Please wait a moment and try again.' 
        }, { status: 429 })
      } else {
        return NextResponse.json({ 
          error: 'Unable to verify user information. Please try again.' 
        }, { status: 500 })
      }
    }

    // Create the collection request with verified status
    const collectionRequest = await collectionRequestService.createCollectionRequest({
      donor,
      requestedPickupTime: new Date(requestedPickupTime),
      address,
      phone,
      notes,
      status: 'verified', // Admin-created requests are automatically verified
      assignedFieldExecutives: [], // Will be populated when field executives are assigned
      createdBy: clerkUserId // Audit trail
    } as any)

    // Automatically assign to all field executives and notify them
    let fieldExecutiveNotificationsSent = 0
    try {
      const updatedRequest = await collectionRequestService.assignFieldExecutives(
        collectionRequest._id.toString()
      )
      
      if (updatedRequest && (updatedRequest as any).assignedFieldExecutives) {
        fieldExecutiveNotificationsSent = (updatedRequest as any).assignedFieldExecutives.length || 0
      }
    } catch (error) {
      console.error('Failed to assign field executives:', error)
      // Don't fail the request creation if field executive assignment fails
    }

    // Get donor details for response
    const donorDetails = await getClerkUserWithSupplementaryData(donor)

    return NextResponse.json({
      success: true,
      message: 'Collection request created successfully',
      data: {
        _id: collectionRequest._id,
        id: collectionRequest._id,
        donor,
        donorDetails,
        address,
        phone,
        requestedPickupTime: new Date(requestedPickupTime),
        notes,
        status: 'verified',
        fieldExecutiveNotificationsSent,
        createdBy: clerkUserId,
        createdAt: collectionRequest.createdAt
      }
    })

  } catch (error: any) {
    console.error('[ADMIN_COLLECTION_REQUEST_ERROR]', error)
    
    // Handle specific error types with detailed messages
    if (error instanceof Error) {
      if (error.message.includes('User missing required information')) {
        return NextResponse.json({ 
          error: 'User missing required information (phone or address). Please provide complete information.' 
        }, { status: 400 })
      }
      
      if (error.message.includes('Invalid pickup time')) {
        return NextResponse.json({ 
          error: 'Invalid pickup time provided. Please select a future date and time.' 
        }, { status: 400 })
      }

      if (error.message.includes('validation')) {
        return NextResponse.json({ 
          error: 'Invalid request data provided. Please check your inputs and try again.' 
        }, { status: 400 })
      }

      if (error.message.includes('duplicate')) {
        return NextResponse.json({ 
          error: 'A similar collection request already exists for this user and time.' 
        }, { status: 409 })
      }

      if (error.message.includes('connection') || error.message.includes('timeout')) {
        return NextResponse.json({ 
          error: 'Database connection failed. Please try again in a few moments.' 
        }, { status: 503 })
      }

      if (error.message.includes('network') || error.message.includes('fetch')) {
        return NextResponse.json({ 
          error: 'Network error occurred. Please check your connection and try again.' 
        }, { status: 502 })
      }
    }

    // Handle HTTP status codes
    if (error.status) {
      switch (error.status) {
        case 429:
          return NextResponse.json({ 
            error: 'Too many requests. Please wait a moment and try again.' 
          }, { status: 429 })
        case 503:
          return NextResponse.json({ 
            error: 'Service temporarily unavailable. Please try again in a few moments.' 
          }, { status: 503 })
        case 502:
        case 504:
          return NextResponse.json({ 
            error: 'Service temporarily unavailable. Please try again.' 
          }, { status: error.status })
        default:
          return NextResponse.json({ 
            error: 'Service temporarily unavailable, please try again' 
          }, { status: error.status })
      }
    }

    return NextResponse.json({ 
      error: 'Service temporarily unavailable, please try again' 
    }, { status: 500 })
  }
}