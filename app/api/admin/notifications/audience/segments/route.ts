import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import connectDB from "@/lib/db"
import User from "@/models/User"
import AudienceSegment from "@/models/AudienceSegment"
import { createSegmentSchema, segmentFiltersSchema } from "@/lib/validators/audience.validator"
import { ZodError } from "zod"

// GET /api/admin/notifications/audience/segments - List audience segments
export async function GET(request: NextRequest) {
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

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const queryParams: Record<string, any> = Object.fromEntries(searchParams.entries())
    
    // Handle array parameters
    if (typeof queryParams.roles === 'string') {
      queryParams.roles = queryParams.roles.split(',')
    }
    if (typeof queryParams.locations === 'string') {
      queryParams.locations = queryParams.locations.split(',')
    }

    const filters = segmentFiltersSchema.parse(queryParams)

    // Build MongoDB query
    const query: any = {
      $or: [
        { createdBy: userId }, // User's own segments
        { isShared: true }     // Shared segments
      ]
    }
    
    if (filters.createdBy) {
      query.createdBy = filters.createdBy
      delete query.$or // Override the default query if specific creator is requested
    }
    
    if (filters.isShared !== undefined) {
      if (filters.isShared) {
        query.isShared = true
        delete query.$or
      } else {
        query.createdBy = userId
        delete query.$or
      }
    }
    
    if (filters.roles && filters.roles.length > 0) {
      query['criteria.roles'] = { $in: filters.roles }
    }
    
    if (filters.locations && filters.locations.length > 0) {
      query['criteria.locations'] = { $in: filters.locations }
    }
    
    if (filters.search) {
      query.$text = { $search: filters.search }
    }

    // Calculate pagination
    const skip = (filters.page - 1) * filters.limit
    
    // Build sort object
    const sort: any = {}
    sort[filters.sortBy] = filters.sortOrder === 'asc' ? 1 : -1

    // Execute query with pagination
    const [segments, totalCount] = await Promise.all([
      AudienceSegment.find(query)
        .sort(sort)
        .skip(skip)
        .limit(filters.limit)
        .populate('createdBy', 'name email', 'User', { clerkUserId: 1 })
        .lean(),
      AudienceSegment.countDocuments(query)
    ])

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / filters.limit)
    const hasNextPage = filters.page < totalPages
    const hasPrevPage = filters.page > 1

    // Enhance segments with additional metadata
    const enhancedSegments = segments.map(segment => ({
      ...segment,
      needsCountUpdate: segment.lastUpdated < new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
      criteriaSummary: generateCriteriaSummary(segment.criteria),
      canEdit: segment.createdBy === userId || user.role === 'admin'
    }))

    return NextResponse.json({
      success: true,
      data: enhancedSegments,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        totalCount,
        totalPages,
        hasNextPage,
        hasPrevPage
      }
    })

  } catch (error) {
    console.error("Error fetching audience segments:", error)
    
    if (error instanceof ZodError) {
      return NextResponse.json({
        error: "Invalid query parameters",
        details: (error as any).message
      }, { status: 400 })
    }

    return NextResponse.json(
      { error: "Failed to fetch audience segments" },
      { status: 500 }
    )
  }
}

// POST /api/admin/notifications/audience/segments - Create new audience segment
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    
    // Validate request body
    const validatedData = createSegmentSchema.parse(body)

    // Check if segment name already exists for this user
    const existingSegment = await AudienceSegment.findOne({
      name: validatedData.name,
      createdBy: userId
    })

    if (existingSegment) {
      return NextResponse.json({
        error: "A segment with this name already exists"
      }, { status: 400 })
    }

    // Create segment
    const segment = new AudienceSegment({
      ...validatedData,
      createdBy: userId,
      userCount: 0,
      lastUpdated: new Date()
    })

    await segment.save()

    // Calculate initial user count
    try {
      await segment.calculateUserCount()
    } catch (error) {
      console.error("Error calculating initial user count:", error)
      // Continue even if count calculation fails
    }

    return NextResponse.json({
      success: true,
      data: {
        ...segment.toObject(),
        criteriaSummary: generateCriteriaSummary(segment.criteria),
        canEdit: true
      }
    }, { status: 201 })

  } catch (error) {
    console.error("Error creating audience segment:", error)
    
    if (error instanceof ZodError) {
      return NextResponse.json({
        error: "Invalid segment data",
        details: (error as any).errors
      }, { status: 400 })
    }

    if ((error as any).name === 'ValidationError') {
      return NextResponse.json({
        error: "Segment validation failed",
        details: (error as any).message
      }, { status: 400 })
    }

    return NextResponse.json(
      { error: "Failed to create audience segment" },
      { status: 500 }
    )
  }
}

// Helper function to generate criteria summary
function generateCriteriaSummary(criteria: any): string {
  const parts: string[] = []
  
  if (criteria.roles.includes('everyone')) {
    parts.push('All users')
  } else {
    parts.push(`Roles: ${criteria.roles.join(', ')}`)
  }
  
  if (criteria.locations && criteria.locations.length > 0) {
    parts.push(`Locations: ${criteria.locations.join(', ')}`)
  }
  
  if (criteria.activityStatus) {
    parts.push(`Activity: ${criteria.activityStatus}`)
  }
  
  return parts.join(` ${criteria.logic} `)
}