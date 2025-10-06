import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import connectDB from "@/lib/db"
import User from "@/models/User"
import AudienceSegment from "@/models/AudienceSegment"
import { userFilterSchema } from "@/lib/validators/audience.validator"
import { ZodError } from "zod"
import mongoose from "mongoose"

// GET /api/admin/notifications/audience/segments/[id]/users - Get users matching segment criteria
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    // Check if user is admin or moderator
    const user = await User.findOne({ clerkUserId: userId })
    if (!user || !['admin', 'moderator'].includes(user.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

  const { id } = await context.params

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid segment ID" }, { status: 400 })
    }

    // Find segment (user can access their own segments or shared segments)
    const segment = await AudienceSegment.findOne({
      _id: id,
      $or: [
        { createdBy: userId },
        { isShared: true }
      ]
    })

    if (!segment) {
      return NextResponse.json({ error: "Segment not found" }, { status: 404 })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
  const queryParams: Record<string, any> = Object.fromEntries(searchParams.entries())
    
    // Handle array parameters
    if (typeof queryParams.channels === 'string') {
      queryParams.channels = queryParams.channels.split(',')
    }

    const filters = userFilterSchema.parse(queryParams)

    // Get matching users with pagination
    const skip = (filters.page - 1) * filters.limit
    const users = await segment.getMatchingUsers(filters.limit, skip)

    // Get total count
    const totalCount = await segment.calculateUserCount()

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / filters.limit)
    const hasNextPage = filters.page < totalPages
    const hasPrevPage = filters.page > 1

    // Format user data (hide sensitive information)
    const formattedUsers = users.map((user: any) => ({
      id: user.clerkUserId,
      email: user.email ? `${user.email.substring(0, 3)}***@${user.email.split('@')[1]}` : null,
      phone: user.phone ? `***${user.phone.slice(-4)}` : null,
      role: user.role,
      location: user.location,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      hasEmail: !!user.email,
      hasPhone: !!user.phone,
      activityStatus: determineActivityStatus(user.lastLoginAt, user.createdAt)
    }))

    // Calculate demographics for this page
    const demographics: {
      roles: Record<string | number, number>,
      locations: Record<string | number, number>,
      activityStatus: { active: number, inactive: number, new: number },
      contactMethods: { email: number, phone: number, both: number, none: number }
    } = {
      roles: {},
      locations: {},
      activityStatus: {
        active: 0,
        inactive: 0,
        new: 0
      },
      contactMethods: {
        email: 0,
        phone: 0,
        both: 0,
        none: 0
      }
    }

  formattedUsers.forEach((user: { role: string | number; location: string | number; activityStatus: 'active'|'inactive'|'new'; hasEmail: boolean; hasPhone: boolean }) => {
      // Count roles
      demographics.roles[user.role] = (demographics.roles[user.role] || 0) + 1
      
      // Count locations
      if (user.location) {
        demographics.locations[user.location] = (demographics.locations[user.location] || 0) + 1
      }
      
      // Count activity status
  demographics.activityStatus[user.activityStatus]++
      
      // Count contact methods
      if (user.hasEmail && user.hasPhone) {
        demographics.contactMethods.both++
      } else if (user.hasEmail) {
        demographics.contactMethods.email++
      } else if (user.hasPhone) {
        demographics.contactMethods.phone++
      } else {
        demographics.contactMethods.none++
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        segment: {
          id: segment._id,
          name: segment.name,
          description: segment.description,
          criteria: segment.criteria,
          userCount: segment.userCount,
          lastUpdated: segment.lastUpdated
        },
        users: formattedUsers,
        demographics,
        pagination: {
          page: filters.page,
          limit: filters.limit,
          totalCount,
          totalPages,
          hasNextPage,
          hasPrevPage
        }
      }
    })

  } catch (error) {
    console.error("Error fetching segment users:", error)
    
    if (error instanceof ZodError) {
      return NextResponse.json({
        error: "Invalid query parameters",
        details: error.message
      }, { status: 400 })
    }

    return NextResponse.json(
      { error: "Failed to fetch segment users" },
      { status: 500 }
    )
  }
}

// Helper function to determine activity status
function determineActivityStatus(lastLoginAt: Date | null, createdAt: Date): 'active' | 'inactive' | 'new' {
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  
  // Check if user is new (created within last 7 days)
  if (createdAt >= sevenDaysAgo) {
    return 'new'
  }
  
  // Check if user is active (logged in within last 30 days)
  if (lastLoginAt && lastLoginAt >= thirtyDaysAgo) {
    return 'active'
  }
  
  // Otherwise user is inactive
  return 'inactive'
}