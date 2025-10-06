import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import connectDB from "@/lib/db"
import User from "@/models/User"
import mongoose from "mongoose"

// POST /api/admin/notifications/templates/[id]/use - Increment usage count
export async function POST(
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

    // Import and use the service
    const { TemplateService } = await import("@/lib/services/template.service")
    
    try {
      const template = await TemplateService.incrementUsageCount(id)

      return NextResponse.json({
        success: true,
        usageCount: template.usageCount,
        message: "Template usage count updated"
      })
    } catch (error) {
      if (error instanceof Error && error.message === 'Template not found') {
        return NextResponse.json({ error: "Template not found" }, { status: 404 })
      }
      throw error
    }
  } catch (error) {
    console.error("Error updating template usage:", error)
    return NextResponse.json(
      { error: "Failed to update template usage" },
      { status: 500 }
    )
  }
}