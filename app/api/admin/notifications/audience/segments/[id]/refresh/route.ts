import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import connectDB from "@/lib/db"
import User from "@/models/User"
import AudienceSegment from "@/models/AudienceSegment"
import mongoose from "mongoose"

// POST /api/admin/notifications/audience/segments/[id]/refresh - Refresh segment user count
export async function POST(
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

    // Find segment (user can refresh their own segments or shared segments)
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

    // Calculate new user count
    const previousCount = segment.userCount
    const newCount = await segment.calculateUserCount()
    const countChange = newCount - previousCount

    return NextResponse.json({
      success: true,
      data: {
        segmentId: segment._id,
        name: segment.name,
        previousCount,
        newCount,
        countChange,
        lastUpdated: segment.lastUpdated,
        percentageChange: previousCount > 0 ? Math.round(((countChange / previousCount) * 100) * 100) / 100 : 0
      },
      message: `Segment user count refreshed: ${newCount} users (${countChange >= 0 ? '+' : ''}${countChange})`
    })

  } catch (error) {
    console.error("Error refreshing segment user count:", error)
    return NextResponse.json(
      { error: "Failed to refresh segment user count" },
      { status: 500 }
    )
  }
}