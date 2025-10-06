import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import connectDB from "@/lib/db"
import User from "@/models/User"
import NotificationTemplate from "@/models/NotificationTemplate"

// GET /api/admin/notifications/templates - Get all templates
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

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const isActive = searchParams.get('isActive')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    // Build query
    const query: any = {}
    if (category && category !== 'all') {
      query.category = category
    }
    if (isActive !== null && isActive !== undefined) {
      query.isActive = isActive === 'true'
    }
    
    // Add search functionality
    if (search && search.trim()) {
      query.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { title: { $regex: search.trim(), $options: 'i' } },
        { message: { $regex: search.trim(), $options: 'i' } }
      ]
    }

    const templates = await NotificationTemplate.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)

    const total = await NotificationTemplate.countDocuments(query)

    return NextResponse.json({
      templates,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error("Error fetching templates:", error)
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 }
    )
  }
}

// POST /api/admin/notifications/templates - Create new template
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
    const { 
      name, 
      title, 
      message, 
      channels, 
      targetRoles,
      category = 'custom'
    } = body

    // Validation
    if (!name || !title || !message || !channels || !targetRoles) {
      return NextResponse.json(
        { error: "Missing required fields: name, title, message, channels, targetRoles" },
        { status: 400 }
      )
    }

    // Validate channels
    const validChannels = ['web_push', 'email', 'whatsapp', 'sms']
    const invalidChannels = channels.filter((c: string) => !validChannels.includes(c))
    if (invalidChannels.length > 0) {
      return NextResponse.json(
        { error: `Invalid channels: ${invalidChannels.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate target roles
    const validRoles = ['admin', 'moderator', 'scrapper', 'user', 'everyone']
    const invalidRoles = targetRoles.filter((r: string) => !validRoles.includes(r))
    if (invalidRoles.length > 0) {
      return NextResponse.json(
        { error: `Invalid roles: ${invalidRoles.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate category
    const validCategories = ['campaign', 'system', 'custom']
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${validCategories.join(', ')}` },
        { status: 400 }
      )
    }

    // Check for duplicate name by same user
    const existingTemplate = await NotificationTemplate.findOne({
      name,
      createdBy: userId
    })

    if (existingTemplate) {
      return NextResponse.json(
        { error: "Template with this name already exists" },
        { status: 409 }
      )
    }

    const template = new NotificationTemplate({
      name,
      title,
      message,
      channels,
      targetRoles,
      category,
      createdBy: userId
    })

    await template.save()

    return NextResponse.json({
      success: true,
      template
    }, { status: 201 })
  } catch (error) {
    console.error("Error creating template:", error)
    return NextResponse.json(
      { error: "Failed to create template" },
      { status: 500 }
    )
  }
}