import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { checkRole } from '@/lib/auth'
import connectDB from '@/lib/db'
import MembershipRequest from '@/models/MembershipRequest'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user has admin or moderator role
    const hasAccess = await checkRole(['admin', 'moderator'])
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    await connectDB()

    const { requestId } = await params
    const body = await request.json()
    const { action, comments } = body

    if (!['approve', 'reject', 'under_review'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      )
    }

    // Find the membership request
    const membershipRequest = await MembershipRequest.findById(requestId)
    if (!membershipRequest) {
      return NextResponse.json(
        { error: 'Membership request not found' },
        { status: 404 }
      )
    }

    // Map action to correct status value
    const statusMap = {
      'approve': 'approved',
      'reject': 'rejected',
      'under_review': 'under_review'
    } as const

    // Update the request status
    membershipRequest.status = statusMap[action as keyof typeof statusMap]
    membershipRequest.reviewedAt = new Date()
    membershipRequest.reviewedBy = userId
    
    if (comments) {
      membershipRequest.reviewComments = comments
    }

    await membershipRequest.save()

    // If approved, assign member role to user in Clerk
    if (action === 'approve') {
      try {
        const { clerkClient } = await import('@clerk/nextjs/server')
        const client = await clerkClient()
        await client.users.updateUserMetadata(membershipRequest.userId, {
          publicMetadata: {
            role: 'member',
            membershipId: membershipRequest.membershipId,
            membershipStartDate: membershipRequest.membershipStartDate
          }
        })
      } catch (clerkError) {
        console.error('Failed to update user role in Clerk:', clerkError)
        // Don't fail the entire operation if Clerk update fails
      }
    }

    // TODO: Send notification to user about the review decision
    // This can be implemented using the existing notification system

    return NextResponse.json({
      success: true,
      message: `Request ${action} successfully`,
      request: {
        id: membershipRequest._id,
        status: membershipRequest.status,
        membershipId: membershipRequest.membershipId
      }
    })

  } catch (error) {
    console.error('Review membership request error:', error)
    return NextResponse.json(
      { error: 'Failed to review membership request' },
      { status: 500 }
    )
  }
}