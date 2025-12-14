import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import connectDB from '@/lib/db'
import MembershipRequest from '@/models/MembershipRequest'
import { membershipRequestSchema } from '@/schemas/membership-schema'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    await connectDB()

    // Check if user already has a membership request
    const existingRequest = await MembershipRequest.findOne({ userId })
    if (existingRequest) {
      return NextResponse.json(
        { error: 'You already have a membership request. Please wait for review.' },
        { status: 400 }
      )
    }

    const body = await request.json()
    
    // Validate the request data
    const validatedData = membershipRequestSchema.parse(body)

    // Get user email from Clerk
    const { clerkClient } = await import('@clerk/nextjs/server')
    const client = await clerkClient()
    const user = await client.users.getUser(userId)
    if (!user?.emailAddresses?.[0]?.emailAddress) {
      return NextResponse.json(
        { error: 'User email not found' },
        { status: 400 }
      )
    }

    // Create membership request
    const membershipRequest = new MembershipRequest({
      userId,
      userEmail: user.emailAddresses[0].emailAddress,
      ...validatedData,
      status: 'pending',
      submittedAt: new Date()
    })

    await membershipRequest.save()

    // TODO: Send notification to admins/moderators about new membership request
    // This can be implemented using the existing notification system

    return NextResponse.json({
      success: true,
      message: 'Membership request submitted successfully',
      requestId: membershipRequest._id
    })

  } catch (error) {
    console.error('Membership request error:', error)
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid form data', details: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to submit membership request' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    await connectDB()

    // Get user's membership request
    const membershipRequest = await MembershipRequest.findOne({ userId })

    if (!membershipRequest) {
      return NextResponse.json(
        { error: 'No membership request found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      request: membershipRequest
    })

  } catch (error) {
    console.error('Get membership request error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch membership request' },
      { status: 500 }
    )
  }
}