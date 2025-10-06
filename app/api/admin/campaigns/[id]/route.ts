import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import connectDB from "@/lib/db"
import { Campaign, WelfareProgram } from "@/models"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const {
      programId,
      title,
      slug,
      description,
      coverImage,
      goal,
      startDate,
      endDate,
      isFeatured,
      isActive
    } = body

    // Validate required fields
    if (!programId || !title || !description || !coverImage || !goal || !startDate) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    await connectDB()

    // Verify welfare program exists
    const program = await WelfareProgram.findById(programId)
    if (!program) {
      return NextResponse.json(
        { error: "Welfare program not found" },
        { status: 404 }
      )
    }

    // Find the campaign
    const campaign = await Campaign.findById(id)
    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      )
    }

    // Check if slug is unique (excluding current campaign)
    if (slug !== campaign.slug) {
      const existingCampaign = await Campaign.findOne({ slug, _id: { $ne: id } })
      if (existingCampaign) {
        return NextResponse.json(
          { error: "A campaign with this slug already exists" },
          { status: 400 }
        )
      }
    }

    // Update campaign
    campaign.programId = programId
    campaign.title = title
    campaign.slug = slug
    campaign.description = description
    campaign.coverImage = coverImage
    campaign.goal = parseFloat(goal)
    campaign.startDate = new Date(startDate)
    campaign.endDate = endDate ? new Date(endDate) : undefined
    campaign.isFeatured = Boolean(isFeatured)
    campaign.isActive = Boolean(isActive)
    campaign.updatedAt = new Date()

    await campaign.save()

    return NextResponse.json({
      message: "Campaign updated successfully",
      campaign: {
        _id: campaign._id.toString(),
        slug: campaign.slug
      }
    })

  } catch (error) {
    console.error("Error updating campaign:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    await connectDB()

    // Find the campaign
    const campaign = await Campaign.findById(id)
    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      )
    }

    // TODO: Check if campaign has donations before deleting
    // You might want to prevent deletion of campaigns with donations
    // or implement soft delete instead

    await Campaign.findByIdAndDelete(id)

    return NextResponse.json({
      message: "Campaign deleted successfully"
    })

  } catch (error) {
    console.error("Error deleting campaign:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}