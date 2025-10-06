import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import connectDB from "@/lib/db"
import User from "@/models/User"
import { TemplateService } from "@/lib/services/template.service"

// POST /api/admin/notifications/templates/import - Import templates
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { templates, overwriteExisting = false } = body

    if (!templates || !Array.isArray(templates)) {
      return NextResponse.json(
        { error: "Templates array is required" },
        { status: 400 }
      )
    }

    const results = {
      imported: 0,
      skipped: 0,
      errors: [] as string[]
    }

    for (const templateData of templates) {
      try {
        // Validate required fields
        if (!templateData.name || !templateData.title || !templateData.message) {
          results.errors.push(`Template missing required fields: ${templateData.name || 'unnamed'}`)
          continue
        }

        // Check if template already exists
        const existingTemplate = await TemplateService.getTemplatesByUser(userId, {
          page: 1,
          limit: 1
        })

        const exists = existingTemplate.templates.some(t => t.name === templateData.name)

        if (exists && !overwriteExisting) {
          results.skipped++
          continue
        }

        // Create template data
        const createData = {
          name: templateData.name,
          title: templateData.title,
          message: templateData.message,
          channels: templateData.channels || ['web_push', 'email'],
          targetRoles: templateData.targetRoles || ['everyone'],
          category: templateData.category || 'custom',
          createdBy: userId
        }

        if (exists && overwriteExisting) {
          // Find and update existing template
          const existing = existingTemplate.templates.find(t => t.name === templateData.name)
          if (existing) {
            await TemplateService.updateTemplate(
              existing._id.toString(),
              createData,
              userId,
              true
            )
          }
        } else {
          // Create new template
          await TemplateService.createTemplate(createData)
        }

        results.imported++
      } catch (error) {
        results.errors.push(`Error importing template "${templateData.name}": ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    return NextResponse.json({
      success: true,
      results,
      message: `Import completed. ${results.imported} imported, ${results.skipped} skipped, ${results.errors.length} errors.`
    })
  } catch (error) {
    console.error("Error importing templates:", error)
    return NextResponse.json(
      { error: "Failed to import templates" },
      { status: 500 }
    )
  }
}