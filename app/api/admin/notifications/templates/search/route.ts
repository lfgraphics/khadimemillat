import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import connectDB from "@/lib/db"
import User from "@/models/User"
import { TemplateService } from "@/lib/services/template.service"

// GET /api/admin/notifications/templates/search - Search templates
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
    const query = searchParams.get('q')
    const category = searchParams.get('category')
    const isActive = searchParams.get('isActive')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: "Search query must be at least 2 characters long" },
        { status: 400 }
      )
    }

    const options = {
      category: category || undefined,
      isActive: isActive !== null ? isActive === 'true' : undefined,
      page,
      limit
    }

    const result = await TemplateService.searchTemplates(
      query.trim(),
      undefined, // Don't filter by user - admins can search all templates
      options
    )

    return NextResponse.json({
      ...result,
      query: query.trim()
    })
  } catch (error) {
    console.error("Error searching templates:", error)
    return NextResponse.json(
      { error: "Failed to search templates" },
      { status: 500 }
    )
  }
}