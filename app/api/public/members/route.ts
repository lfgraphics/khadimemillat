import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import MembershipRequest from '@/models/MembershipRequest'

export async function GET(request: NextRequest) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')
    const skip = (page - 1) * limit

    // Get approved members with privacy protection
    const members = await MembershipRequest.find({ 
      status: 'approved' 
    })
    .select('membershipId membershipStartDate fullName userId currentAddress')
    .sort({ membershipStartDate: -1 })
    .skip(skip)
    .limit(limit)
    .lean()

    const total = await MembershipRequest.countDocuments({ status: 'approved' })

    // Get profile images from Clerk for each member
    const { clerkClient } = await import('@clerk/nextjs/server')
    const client = await clerkClient()
    
    const formattedMembers = await Promise.all(
      members.map(async (member: any) => {
        let profileImage = null
        
        try {
          // Get user profile from Clerk
          const clerkUser = await client.users.getUser(member.userId)
          profileImage = clerkUser.imageUrl || null
        } catch (clerkError) {
          console.warn(`Failed to get Clerk profile for user ${member.userId}:`, clerkError)
        }

        return {
          membershipId: member.membershipId,
          name: member.fullName,
          profileImage,
          location: `${member.currentAddress?.city || 'Unknown'}, ${member.currentAddress?.state || 'India'}`,
          memberSince: member.membershipStartDate?.toISOString() || null,
          joinedYear: member.membershipStartDate ? new Date(member.membershipStartDate).getFullYear() : null
        }
      })
    )

    return NextResponse.json({
      success: true,
      members: formattedMembers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    })

  } catch (error) {
    console.error('Members directory API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch members directory' 
      },
      { status: 500 }
    )
  }
}