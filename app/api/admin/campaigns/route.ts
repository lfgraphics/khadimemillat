import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import connectDB from "@/lib/db"
import { Campaign, WelfareProgram } from "@/models"

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin (you might want to implement proper role checking)
    // For now, assuming all authenticated users can create campaigns
    
    const body = await request.json()
    const {
      programId,
      title,
      description,
      coverImage,
      goal,
      startDate,
      endDate,
      isFeatured,
      notifyUsers
    } = body

    // Validate required fields
    if (!programId || !title || !description || !coverImage || !goal || !startDate) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Verify welfare program exists
    await connectDB()
    const program = await WelfareProgram.findById(programId)
    if (!program) {
      return NextResponse.json(
        { error: "Welfare program not found" },
        { status: 404 }
      )
    }

    // Generate slug from title
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()

    // Check if slug already exists
    const existingCampaign = await Campaign.findOne({ slug })
    if (existingCampaign) {
      return NextResponse.json(
        { error: "A campaign with this title already exists" },
        { status: 400 }
      )
    }

    // Create campaign
    const campaign = new Campaign({
      programId,
      title,
      slug,
      description,
      coverImage,
      goal: parseFloat(goal),
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : undefined,
      isFeatured: Boolean(isFeatured),
      isActive: true,
      createdBy: userId,
      lastUpdatedBy: userId
    })

    await campaign.save()

    // TODO: If notifyUsers is true, send notifications to all users
    if (notifyUsers) {
      // Implement notification logic here
      console.log('TODO: Send notifications to users about new campaign')
    }

    return NextResponse.json({
      message: "Campaign created successfully",
      campaign: {
        _id: campaign._id.toString(),
        slug: campaign.slug
      }
    })

  } catch (error) {
    console.error("Error creating campaign:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}