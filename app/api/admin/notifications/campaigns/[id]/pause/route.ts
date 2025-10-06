import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import connectDB from "@/lib/db"
import User from "@/models/User"
import NotificationCampaign from "@/models/NotificationCampaign"
import { pauseCampaignSchema } from "@/lib/validators/campaign.validator"
import { ZodError } from "zod"
import mongoose from "mongoose"

// POST /api/admin/notifications/campaigns/[id]/pause - Pause campaign
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
      return NextResponse.json({ error: "Invalid campaign ID" }, { status: 400 })
    }

    // Parse request body
    const body = await request.json().catch(() => ({}))
    const { reason } = pauseCampaignSchema.parse(body)

    // Find campaign
    const campaign = await NotificationCampaign.findById(id)
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
    }

    // Check if campaign can be paused
    if (!campaign.canTransitionTo('paused')) {
      return NextResponse.json({
        error: `Cannot pause campaign with status: ${campaign.status}`
      }, { status: 400 })
    }

    // Store current progress before pausing
    const progressSnapshot = {
      total: campaign.progress.total,
      sent: campaign.progress.sent,
      failed: campaign.progress.failed,
      inProgress: campaign.progress.inProgress,
      pausedAt: new Date(),
      pausedBy: userId,
      pauseReason: reason
    }

    // Update campaign status
    campaign.status = 'paused'
    
    // Add pause metadata (this would typically be stored in a separate audit log)
    if (!campaign.metadata) {
      campaign.metadata = {}
    }
    campaign.metadata.pauseHistory = campaign.metadata.pauseHistory || []
    campaign.metadata.pauseHistory.push(progressSnapshot)

    await campaign.save()

    // TODO: In a real implementation, you would:
    // 1. Stop any running background jobs for this campaign
    // 2. Cancel any queued notifications that haven't been sent yet
    // 3. Update job queue to pause processing
    // 4. Send notifications to relevant stakeholders about the pause

    console.log(`Campaign ${campaign.name} paused by ${user.name || userId}${reason ? ` - Reason: ${reason}` : ''}`)

    return NextResponse.json({
      success: true,
      data: campaign,
      message: "Campaign paused successfully",
      progressSnapshot
    })

  } catch (error) {
    console.error("Error pausing campaign:", error)
    
    if (error instanceof ZodError) {
      return NextResponse.json({
        error: "Invalid request data",
        details: error.message
      }, { status: 400 })
    }

    return NextResponse.json(
      { error: "Failed to pause campaign" },
      { status: 500 }
    )
  }
}