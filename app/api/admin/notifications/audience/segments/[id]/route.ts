import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import connectDB from "@/lib/db"
import User from "@/models/User"
import AudienceSegment from "@/models/AudienceSegment"
import { updateSegmentSchema } from "@/lib/validators/audience.validator"
import { ZodError } from "zod"
import mongoose from "mongoose"

// GET /api/admin/notifications/audience/segments/[id] - Get segment details
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
    }).lean()

    if (!segment) {
      return NextResponse.json({ error: "Segment not found" }, { status: 404 })
    }

    // Get query parameters for additional data
    const { searchParams } = new URL(request.url)
    const includeUsers = searchParams.get('includeUsers') === 'true'
    const refreshCount = searchParams.get('refreshCount') === 'true'

    const seg = segment as any

    let segmentData: any = {
      ...seg,
      criteriaSummary: generateCriteriaSummary(seg.criteria),
      canEdit: seg.createdBy === userId || user.role === 'admin',
      needsCountUpdate: seg.lastUpdated < new Date(Date.now() - 60 * 60 * 1000)
    }

    // Refresh user count if requested
    if (refreshCount) {
      try {
        const segmentDoc = await AudienceSegment.findById(id)
        if (segmentDoc) {
          const newCount = await segmentDoc.calculateUserCount()
          segmentData.userCount = newCount
          segmentData.lastUpdated = new Date()
          segmentData.needsCountUpdate = false
        }
      } catch (error) {
        console.error("Error refreshing user count:", error)
      }
    }

    // Include sample users if requested
    if (includeUsers) {
      try {
        const segmentDoc = await AudienceSegment.findById(id)
        if (segmentDoc) {
          const sampleUsers = await segmentDoc.getMatchingUsers(10, 0)
          segmentData.sampleUsers = sampleUsers.map((user: any) => ({
            id: user.clerkUserId,
            email: user.email ? `${user.email.substring(0, 3)}***@${user.email.split('@')[1]}` : null,
            role: user.role,
            location: user.location,
            createdAt: user.createdAt,
            lastLoginAt: user.lastLoginAt
          }))
        }
      } catch (error) {
        console.error("Error fetching sample users:", error)
        segmentData.sampleUsers = []
      }
    }

    return NextResponse.json({
      success: true,
      data: segmentData
    })

  } catch (error) {
    console.error("Error fetching segment:", error)
    return NextResponse.json(
      { error: "Failed to fetch segment" },
      { status: 500 }
    )
  }
}

// PUT /api/admin/notifications/audience/segments/[id] - Update segment
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
      return NextResponse.json({ error: "Invalid segment ID" }, { status: 400 })
    }

    // Find existing segment
    const existingSegment = await AudienceSegment.findById(id)
    if (!existingSegment) {
      return NextResponse.json({ error: "Segment not found" }, { status: 404 })
    }

    // Check if user can edit this segment
    if (existingSegment.createdBy !== userId && user.role !== 'admin') {
      return NextResponse.json({ error: "Cannot edit this segment" }, { status: 403 })
    }

    const body = await request.json()
    
    // Validate request body
    const validatedData = updateSegmentSchema.parse(body)

    // Check if new name conflicts with existing segments (if name is being changed)
    if (validatedData.name && validatedData.name !== existingSegment.name) {
      const nameConflict = await AudienceSegment.findOne({
        name: validatedData.name,
        createdBy: existingSegment.createdBy,
        _id: { $ne: id }
      })

      if (nameConflict) {
        return NextResponse.json({
          error: "A segment with this name already exists"
        }, { status: 400 })
      }
    }

    // Update segment
    const updatedSegment = await AudienceSegment.findByIdAndUpdate(
      id,
      {
        ...validatedData,
        lastUpdated: new Date()
      },
      { 
        new: true, 
        runValidators: true 
      }
    )

    // Recalculate user count if criteria changed
    if (validatedData.criteria) {
      try {
        await updatedSegment.calculateUserCount()
      } catch (error) {
        console.error("Error recalculating user count:", error)
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...updatedSegment.toObject(),
        criteriaSummary: generateCriteriaSummary(updatedSegment.criteria),
        canEdit: true
      }
    })

  } catch (error) {
    console.error("Error updating segment:", error)
    
    if (error instanceof ZodError) {
      return NextResponse.json({
        error: "Invalid segment data",
        details: error.issues
      }, { status: 400 })
    }

    if (error instanceof Error && error.name === 'ValidationError') {
      return NextResponse.json({
        error: "Segment validation failed",
        details: error.message
      }, { status: 400 })
    }

    return NextResponse.json(
      { error: "Failed to update segment" },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/notifications/audience/segments/[id] - Delete segment
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
      return NextResponse.json({ error: "Invalid segment ID" }, { status: 400 })
    }

    // Find existing segment
    const existingSegment = await AudienceSegment.findById(id)
    if (!existingSegment) {
      return NextResponse.json({ error: "Segment not found" }, { status: 404 })
    }

    // Check if user can delete this segment
    if (existingSegment.createdBy !== userId && user.role !== 'admin') {
      return NextResponse.json({ error: "Cannot delete this segment" }, { status: 403 })
    }

    // TODO: Check if segment is being used in any active campaigns
    // This would require checking NotificationCampaign collection
    // For now, we'll allow deletion

    // Delete segment
    await AudienceSegment.findByIdAndDelete(id)

    return NextResponse.json({
      success: true,
      message: "Segment deleted successfully"
    })

  } catch (error) {
    console.error("Error deleting segment:", error)
    return NextResponse.json(
      { error: "Failed to delete segment" },
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