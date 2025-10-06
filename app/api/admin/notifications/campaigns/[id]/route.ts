import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import connectDB from "@/lib/db"
import User from "@/models/User"
import NotificationCampaign from "@/models/NotificationCampaign"
import { updateCampaignSchema } from "@/lib/validators/campaign.validator"
import { ZodError } from "zod"
import mongoose from "mongoose"

// GET /api/admin/notifications/campaigns/[id] - Get campaign details
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
      return NextResponse.json({ error: "Invalid campaign ID" }, { status: 400 })
    }

    // Find campaign
    const campaign = await NotificationCampaign.findById(id)
      .populate('templateId', 'name category description')
      .lean()

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: campaign
    })

  } catch (error) {
    console.error("Error fetching campaign:", error)
    return NextResponse.json(
      { error: "Failed to fetch campaign" },
      { status: 500 }
    )
  }
}

// PUT /api/admin/notifications/campaigns/[id] - Update campaign
export async function PUT(
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
      return NextResponse.json({ error: "Invalid campaign ID" }, { status: 400 })
    }

    // Find existing campaign
    const existingCampaign = await NotificationCampaign.findById(id)
    if (!existingCampaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
    }

    // Check if campaign can be updated (only draft and scheduled campaigns can be fully updated)
    if (!['draft', 'scheduled'].includes(existingCampaign.status)) {
      return NextResponse.json({ 
        error: "Only draft and scheduled campaigns can be updated" 
      }, { status: 400 })
    }

    const body = await request.json()
    
    // Validate request body
    const validatedData = updateCampaignSchema.parse(body)

    // Handle status transitions
    if (validatedData.status && validatedData.status !== existingCampaign.status) {
      if (!existingCampaign.canTransitionTo(validatedData.status)) {
        return NextResponse.json({
          error: `Cannot transition from ${existingCampaign.status} to ${validatedData.status}`
        }, { status: 400 })
      }
    }

    // Convert date strings to Date objects
    const updateData = { ...validatedData }
    if (updateData.scheduling?.scheduledFor) {
      updateData.scheduling = {
        ...updateData.scheduling,
        scheduledFor: new Date(updateData.scheduling.scheduledFor) as any
      }
    }
    
    if (updateData.scheduling?.recurring?.endDate) {
      updateData.scheduling = {
        ...updateData.scheduling,
        recurring: {
          ...updateData.scheduling.recurring,
          endDate: new Date(updateData.scheduling.recurring.endDate) as any
        }
      }
    }

    // Update campaign
    const updatedCampaign = await NotificationCampaign.findByIdAndUpdate(
      id,
      {
        ...updateData,
        updatedAt: new Date()
      },
      { 
        new: true, 
        runValidators: true 
      }
    ).populate('templateId', 'name category description')

    return NextResponse.json({
      success: true,
      data: updatedCampaign
    })

  } catch (error) {
    console.error("Error updating campaign:", error)
    
    if (error instanceof ZodError) {
      return NextResponse.json({
        error: "Invalid campaign data",
        details: error.issues
      }, { status: 400 })
    }

    if (error instanceof Error && error.name === 'ValidationError') {
      return NextResponse.json({
        error: "Campaign validation failed",
        details: error.message
      }, { status: 400 })
    }

    if (error instanceof Error && error.name === 'CastError') {
      return NextResponse.json({
        error: "Invalid data format",
        details: error.message
      }, { status: 400 })
    }

    return NextResponse.json(
      { error: "Failed to update campaign" },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/notifications/campaigns/[id] - Delete campaign
export async function DELETE(
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
      return NextResponse.json({ error: "Invalid campaign ID" }, { status: 400 })
    }

    // Find existing campaign
    const existingCampaign = await NotificationCampaign.findById(id)
    if (!existingCampaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
    }

    // Check if campaign can be deleted (only draft, completed, and failed campaigns can be deleted)
    if (!['draft', 'completed', 'failed'].includes(existingCampaign.status)) {
      return NextResponse.json({ 
        error: "Only draft, completed, and failed campaigns can be deleted" 
      }, { status: 400 })
    }

    // Delete campaign
    await NotificationCampaign.findByIdAndDelete(id)

    return NextResponse.json({
      success: true,
      message: "Campaign deleted successfully"
    })

  } catch (error) {
    console.error("Error deleting campaign:", error)
    return NextResponse.json(
      { error: "Failed to delete campaign" },
      { status: 500 }
    )
  }
}