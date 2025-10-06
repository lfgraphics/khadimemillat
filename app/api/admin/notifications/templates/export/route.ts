import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import connectDB from "@/lib/db"
import User from "@/models/User"
import NotificationTemplate from "@/models/NotificationTemplate"

// GET /api/admin/notifications/templates/export - Export templates
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    // Check if user is admin
    const user = await User.findOne({ clerkUserId: userId })
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'json'
    const category = searchParams.get('category')
    const isActive = searchParams.get('isActive')

    // Build query
    const query: any = {}
    if (category && category !== 'all') {
      query.category = category
    }
    if (isActive !== null && isActive !== undefined) {
      query.isActive = isActive === 'true'
    }

    const templates = await NotificationTemplate.find(query)
      .sort({ createdAt: -1 })
      .select('-__v')

    if (format === 'csv') {
      // Convert to CSV format
      const csvHeaders = [
        'ID',
        'Name',
        'Title',
        'Message',
        'Channels',
        'Target Roles',
        'Category',
        'Is Active',
        'Usage Count',
        'Created At',
        'Updated At'
      ]

      const csvRows = templates.map(template => [
        template._id.toString(),
        `"${template.name.replace(/"/g, '""')}"`,
        `"${template.title.replace(/"/g, '""')}"`,
        `"${template.message.replace(/"/g, '""')}"`,
        `"${template.channels.join(', ')}"`,
        `"${template.targetRoles.join(', ')}"`,
        template.category,
        template.isActive,
        template.usageCount,
        template.createdAt.toISOString(),
        template.updatedAt.toISOString()
      ])

      const csvContent = [csvHeaders.join(','), ...csvRows.map(row => row.join(','))].join('\n')

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="notification-templates-${new Date().toISOString().split('T')[0]}.csv"`
        }
      })
    }

    // Default JSON format
    return NextResponse.json({
      templates,
      exportedAt: new Date().toISOString(),
      count: templates.length,
      filters: { category, isActive }
    })
  } catch (error) {
    console.error("Error exporting templates:", error)
    return NextResponse.json(
      { error: "Failed to export templates" },
      { status: 500 }
    )
  }
}