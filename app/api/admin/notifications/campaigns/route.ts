import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import connectDB from "@/lib/db"
import User from "@/models/User"
import NotificationCampaign from "@/models/NotificationCampaign"
import { createCampaignSchema, campaignFiltersSchema } from "@/lib/validators/campaign.validator"
import { ZodError } from "zod"

// GET /api/admin/notifications/campaigns - List campaigns with filtering
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
    const queryParams = Object.fromEntries(searchParams.entries())
    
    // Handle array parameters
    if (queryParams.channels && typeof queryParams.channels === 'string') {
      (queryParams as any).channels = queryParams.channels.split(',')
    }
    if (queryParams.roles && typeof queryParams.roles === 'string') {
      (queryParams as any).roles = queryParams.roles.split(',')
    }

    const filters = campaignFiltersSchema.parse(queryParams)

    // Build MongoDB query
    const query: any = {}
    
    if (filters.status) {
      query.status = filters.status
    }
    
    if (filters.createdBy) {
      query.createdBy = filters.createdBy
    }
    
    if (filters.channels && filters.channels.length > 0) {
      query.channels = { $in: filters.channels }
    }
    
    if (filters.roles && filters.roles.length > 0) {
      query['targeting.roles'] = { $in: filters.roles }
    }
    
    if (filters.dateFrom || filters.dateTo) {
      query.createdAt = {}
      if (filters.dateFrom) {
        query.createdAt.$gte = new Date(filters.dateFrom)
      }
      if (filters.dateTo) {
        query.createdAt.$lte = new Date(filters.dateTo)
      }
    }

    // Calculate pagination
    const skip = (filters.page - 1) * filters.limit
    
    // Build sort object
    const sort: any = {}
    sort[filters.sortBy] = filters.sortOrder === 'asc' ? 1 : -1

    // Execute query with pagination
    const [campaigns, totalCount] = await Promise.all([
      NotificationCampaign.find(query)
        .sort(sort)
        .skip(skip)
        .limit(filters.limit)
        .populate('templateId', 'name category')
        .lean(),
      NotificationCampaign.countDocuments(query)
    ])

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / filters.limit)
    const hasNextPage = filters.page < totalPages
    const hasPrevPage = filters.page > 1

    return NextResponse.json({
      success: true,
      data: campaigns,
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
    console.error("Error fetching campaigns:", error)
    
    if (error instanceof ZodError) {
      return NextResponse.json({
        error: "Invalid query parameters",
        details: error.message
      }, { status: 400 })
    }

    return NextResponse.json(
      { error: "Failed to fetch campaigns" },
      { status: 500 }
    )
  }
}

// POST /api/admin/notifications/campaigns - Create new campaign
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
    const validatedData = createCampaignSchema.parse(body)

    // Convert scheduledFor to Date if provided
    const schedulingData = { ...validatedData.scheduling }
    if (schedulingData.scheduledFor) {
      schedulingData.scheduledFor = new Date(schedulingData.scheduledFor) as any
    }
    
    if (schedulingData.recurring?.endDate) {
      schedulingData.recurring = {
        ...schedulingData.recurring,
        endDate: new Date(schedulingData.recurring.endDate) as any
      }
    }

    // Create campaign
    const campaign = new NotificationCampaign({
      ...validatedData,
      scheduling: schedulingData,
      createdBy: userId,
      status: 'draft',
      progress: {
        total: 0,
        sent: 0,
        failed: 0,
        inProgress: 0
      }
    })

    await campaign.save()

    // Populate template reference if exists
    await campaign.populate('templateId', 'name category')

    return NextResponse.json({
      success: true,
      data: campaign
    }, { status: 201 })

  } catch (error) {
    console.error("Error creating campaign:", error)
    
    if (error instanceof ZodError) {
      return NextResponse.json({
        error: "Invalid campaign data",
        details: error.message
      }, { status: 400 })
    }

    if ((error as any).name === 'ValidationError') {
      return NextResponse.json({
        error: "Campaign validation failed",
        details: (error as any).message
      }, { status: 400 })
    }

    return NextResponse.json(
      { error: "Failed to create campaign" },
      { status: 500 }
    )
  }
}