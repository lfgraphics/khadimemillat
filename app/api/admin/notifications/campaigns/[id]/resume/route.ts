import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import connectDB from "@/lib/db"
import User from "@/models/User"
import NotificationCampaign from "@/models/NotificationCampaign"
import { resumeCampaignSchema } from "@/lib/validators/campaign.validator"
import { ZodError } from "zod"
import mongoose from "mongoose"

// POST /api/admin/notifications/campaigns/[id]/resume - Resume campaign
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
    const { reason } = resumeCampaignSchema.parse(body)

    // Find campaign
    const campaign = await NotificationCampaign.findById(id)
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
    }

    // Check if campaign can be resumed
    if (!campaign.canTransitionTo('running')) {
      return NextResponse.json({
        error: `Cannot resume campaign with status: ${campaign.status}`
      }, { status: 400 })
    }

    // Get the last pause information
    const pauseHistory = campaign.metadata?.pauseHistory || []
    const lastPause = pauseHistory[pauseHistory.length - 1]

    // Calculate remaining work
    const remaining = campaign.progress.total - campaign.progress.sent - campaign.progress.failed
    
    if (remaining <= 0) {
      return NextResponse.json({
        error: "Campaign has no remaining notifications to send"
      }, { status: 400 })
    }

    // Store resume metadata
    const resumeSnapshot = {
      resumedAt: new Date(),
      resumedBy: userId,
      resumeReason: reason,
      remainingToSend: remaining,
      pausedDuration: lastPause ? new Date().getTime() - new Date(lastPause.pausedAt).getTime() : 0
    }

    // Update campaign status
    campaign.status = 'running'
    campaign.progress.inProgress = remaining

    // Add resume metadata
    if (!campaign.metadata) {
      campaign.metadata = {}
    }
    campaign.metadata.resumeHistory = campaign.metadata.resumeHistory || []
    campaign.metadata.resumeHistory.push(resumeSnapshot)

    await campaign.save()

    // TODO: In a real implementation, you would:
    // 1. Restart background job processing for this campaign
    // 2. Re-queue remaining notifications
    // 3. Update job queue to resume processing
    // 4. Recalculate target audience (some users might have opted out during pause)
    // 5. Send notifications to relevant stakeholders about the resume

    console.log(`Campaign ${campaign.name} resumed by ${user.name || userId}${reason ? ` - Reason: ${reason}` : ''}`)

    // Simulate continued processing for demo purposes
    setTimeout(async () => {
      try {
        const updatedCampaign = await NotificationCampaign.findById(id)
        if (updatedCampaign && updatedCampaign.status === 'running') {
          // Simulate processing the remaining notifications
          const successRate = 0.85 + Math.random() * 0.1 // 85-95% success rate
          const additionalSent = Math.floor(remaining * successRate)
          const additionalFailed = remaining - additionalSent
          
          updatedCampaign.progress.sent += additionalSent
          updatedCampaign.progress.failed += additionalFailed
          updatedCampaign.progress.inProgress = 0
          updatedCampaign.status = 'completed'
          
          await updatedCampaign.save()
          console.log(`Resumed campaign ${campaign.name} completed: ${additionalSent} additional sent, ${additionalFailed} additional failed`)
        }
      } catch (error) {
        console.error('Error updating resumed campaign progress:', error)
      }
    }, 3000) // Simulate 3 second processing time for remaining notifications

    return NextResponse.json({
      success: true,
      data: campaign,
      message: "Campaign resumed successfully",
      resumeSnapshot,
      remainingToSend: remaining
    })

  } catch (error) {
    console.error("Error resuming campaign:", error)
    
    if (error instanceof ZodError) {
      return NextResponse.json({
        error: "Invalid request data",
        details: error.message
      }, { status: 400 })
    }

    return NextResponse.json(
      { error: "Failed to resume campaign" },
      { status: 500 }
    )
  }
}