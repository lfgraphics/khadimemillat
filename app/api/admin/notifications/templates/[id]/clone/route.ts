import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import connectDB from "@/lib/db"
import User from "@/models/User"
import NotificationTemplate from "@/models/NotificationTemplate"
import mongoose from "mongoose"

// POST /api/admin/notifications/templates/[id]/clone - Clone a template
export async function POST(
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

    // Find the template to clone
    const originalTemplate = await NotificationTemplate.findById(id)
    if (!originalTemplate) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 })
    }

    const body = await request.json()
    const { name } = body

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Name is required for cloned template" },
        { status: 400 }
      )
    }

    // Check for duplicate name
    const existingTemplate = await NotificationTemplate.findOne({
      name: name.trim(),
      createdBy: userId
    })

    if (existingTemplate) {
      return NextResponse.json(
        { error: "Template with this name already exists" },
        { status: 409 }
      )
    }

    // Create cloned template
    const clonedTemplate = new NotificationTemplate({
      name: name.trim(),
      title: originalTemplate.title,
      message: originalTemplate.message,
      channels: originalTemplate.channels,
      targetRoles: originalTemplate.targetRoles,
      category: originalTemplate.category,
      createdBy: userId,
      isActive: true,
      usageCount: 0
    })

    await clonedTemplate.save()

    return NextResponse.json({
      success: true,
      template: clonedTemplate,
      message: "Template cloned successfully"
    }, { status: 201 })
  } catch (error) {
    console.error("Error cloning template:", error)
    return NextResponse.json(
      { error: "Failed to clone template" },
      { status: 500 }
    )
  }
}