import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import connectDB from "@/lib/db"
import User from "@/models/User"
import { TemplateService } from "@/lib/services/template.service"

// GET /api/admin/notifications/templates/popular - Get popular templates
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
    const limit = parseInt(searchParams.get('limit') || '10')

    if (limit > 50) {
      return NextResponse.json(
        { error: "Limit cannot exceed 50" },
        { status: 400 }
      )
    }

    const templates = await TemplateService.getPopularTemplates(limit)

    return NextResponse.json({
      templates,
      count: templates.length
    })
  } catch (error) {
    console.error("Error fetching popular templates:", error)
    return NextResponse.json(
      { error: "Failed to fetch popular templates" },
      { status: 500 }
    )
  }
}