import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import connectDB from "@/lib/db"
import User from "@/models/User"
import NotificationTemplate from "@/models/NotificationTemplate"
import mongoose from "mongoose"

// GET /api/admin/notifications/templates/[id] - Get template by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid template ID" }, { status: 400 })
    }

    const template = await NotificationTemplate.findById(id)

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 })
    }

    return NextResponse.json({ template })
  } catch (error) {
    console.error("Error fetching template:", error)
    return NextResponse.json(
      { error: "Failed to fetch template" },
      { status: 500 }
    )
  }
}

// PUT /api/admin/notifications/templates/[id] - Update template
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid template ID" }, { status: 400 })
    }

    const body = await request.json()
    const { 
      name, 
      title, 
      message, 
      channels, 
      targetRoles,
      category,
      isActive
    } = body

    // Find existing template
    const existingTemplate = await NotificationTemplate.findById(id)
    if (!existingTemplate) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 })
    }

    // Check if user owns the template or is admin
    if (existingTemplate.createdBy !== userId && user.role !== 'admin') {
      return NextResponse.json({ error: "Can only edit your own templates" }, { status: 403 })
    }

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
    const validRoles = ['admin', 'moderator', 'field_executive', 'accountant' , 'user', 'everyone']
    const invalidRoles = targetRoles.filter((r: string) => !validRoles.includes(r))
    if (invalidRoles.length > 0) {
      return NextResponse.json(
        { error: `Invalid roles: ${invalidRoles.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate category if provided
    if (category) {
      const validCategories = ['campaign', 'system', 'custom']
      if (!validCategories.includes(category)) {
        return NextResponse.json(
          { error: `Invalid category. Must be one of: ${validCategories.join(', ')}` },
          { status: 400 }
        )
      }
    }

    // Check for duplicate name (excluding current template)
    if (name !== existingTemplate.name) {
      const duplicateTemplate = await NotificationTemplate.findOne({
        name,
        createdBy: existingTemplate.createdBy,
        _id: { $ne: id }
      })

      if (duplicateTemplate) {
        return NextResponse.json(
          { error: "Template with this name already exists" },
          { status: 409 }
        )
      }
    }

    // Update template
    const updatedTemplate = await NotificationTemplate.findByIdAndUpdate(
      id,
      {
        name,
        title,
        message,
        channels,
        targetRoles,
        ...(category && { category }),
        ...(isActive !== undefined && { isActive })
      },
      { new: true, runValidators: true }
    )

    return NextResponse.json({
      success: true,
      template: updatedTemplate
    })
  } catch (error) {
    console.error("Error updating template:", error)
    return NextResponse.json(
      { error: "Failed to update template" },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/notifications/templates/[id] - Delete template
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid template ID" }, { status: 400 })
    }

    // Find existing template
    const existingTemplate = await NotificationTemplate.findById(id)
    if (!existingTemplate) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 })
    }

    // Check if user owns the template or is admin
    if (existingTemplate.createdBy !== userId && user.role !== 'admin') {
      return NextResponse.json({ error: "Can only delete your own templates" }, { status: 403 })
    }

    await NotificationTemplate.findByIdAndDelete(id)

    return NextResponse.json({
      success: true,
      message: "Template deleted successfully"
    })
  } catch (error) {
    console.error("Error deleting template:", error)
    return NextResponse.json(
      { error: "Failed to delete template" },
      { status: 500 }
    )
  }
}