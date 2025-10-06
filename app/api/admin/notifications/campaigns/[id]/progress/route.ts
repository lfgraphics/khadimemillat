import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import connectDB from "@/lib/db"
import User from "@/models/User"
import NotificationCampaign from "@/models/NotificationCampaign"
import mongoose from "mongoose"

// GET /api/admin/notifications/campaigns/[id]/progress - Get real-time campaign progress
export async function GET(
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

    // Find campaign
    const campaignDoc = await NotificationCampaign.findById(id).lean()
    if (!campaignDoc) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
    }

    // Calculate progress metrics
    const campaign = campaignDoc as any
    const progress = campaign.progress
    const completionPercentage = progress.total > 0 ? Math.round((progress.sent / progress.total) * 100) : 0
    const successRate = (progress.sent + progress.failed) > 0 
      ? Math.round((progress.sent / (progress.sent + progress.failed)) * 100) 
      : 0

    // Estimate completion time for running campaigns
    let estimatedCompletionTime: Date | null = null
  if (campaign.status === 'running' && progress.inProgress > 0) {
      // Simple estimation based on current progress rate
  const elapsedTime = new Date().getTime() - new Date(campaign.updatedAt).getTime()
      const processedCount = progress.sent + progress.failed
      
      if (processedCount > 0 && elapsedTime > 0) {
        const processingRate = processedCount / (elapsedTime / 1000) // notifications per second
        const remainingTime = progress.inProgress / processingRate // seconds
        estimatedCompletionTime = new Date(Date.now() + remainingTime * 1000)
      }
    }

    // Get recent activity/logs (this would typically come from a separate logs collection)
    const recentActivity = [
      {
        timestamp: campaign.updatedAt,
        event: `Campaign status: ${campaign.status}`,
        details: `${progress.sent} sent, ${progress.failed} failed, ${progress.inProgress} in progress`
      }
    ]

    // Add pause/resume history if available
    if (campaign.metadata?.pauseHistory) {
      (campaign.metadata.pauseHistory as any[]).forEach((pause: any) => {
        recentActivity.push({
          timestamp: pause.pausedAt,
          event: 'Campaign paused',
          details: pause.pauseReason || 'No reason provided'
        })
      })
    }

    if (campaign.metadata?.resumeHistory) {
      (campaign.metadata.resumeHistory as any[]).forEach((resume: any) => {
        recentActivity.push({
          timestamp: resume.resumedAt,
          event: 'Campaign resumed',
          details: resume.resumeReason || 'No reason provided'
        })
      })
    }

    // Sort activity by timestamp (most recent first)
    recentActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    // Channel-specific progress (this would be more detailed in a real implementation)
    const channelProgress = (campaign.channels as any[]).map((channel: any) => ({
      channel,
      sent: Math.floor(progress.sent / campaign.channels.length), // Simplified distribution
      failed: Math.floor(progress.failed / campaign.channels.length),
      inProgress: Math.floor(progress.inProgress / campaign.channels.length),
      successRate: successRate // Same rate for all channels in this simplified version
    }))

    return NextResponse.json({
      success: true,
      data: {
        campaignId: campaign._id,
        name: campaign.name,
        status: campaign.status,
        progress: {
          ...progress,
          completionPercentage,
          successRate
        },
        channelProgress,
        estimatedCompletionTime,
        recentActivity: recentActivity.slice(0, 10), // Last 10 activities
        lastUpdated: campaign.updatedAt,
        scheduling: campaign.scheduling
      }
    })

  } catch (error) {
    console.error("Error fetching campaign progress:", error)
    return NextResponse.json(
      { error: "Failed to fetch campaign progress" },
      { status: 500 }
    )
  }
}

// POST /api/admin/notifications/campaigns/[id]/progress - Update campaign progress (for background jobs)
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

    // Check if user is admin or moderator (or system service)
    const user = await User.findOne({ clerkUserId: userId })
    if (!user || !['admin', 'moderator'].includes(user.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

  const { id } = await context.params

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid campaign ID" }, { status: 400 })
    }

    const body = await request.json()
    const { sent, failed, total, status } = body

    // Validate progress data
    if (typeof sent !== 'number' || typeof failed !== 'number' || sent < 0 || failed < 0) {
      return NextResponse.json({ error: "Invalid progress data" }, { status: 400 })
    }

    // Find campaign
    const campaign = await NotificationCampaign.findById(id)
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
    }

    // Update progress
    if (total !== undefined) campaign.progress.total = total
    campaign.progress.sent = sent
    campaign.progress.failed = failed
    campaign.progress.inProgress = Math.max(0, campaign.progress.total - sent - failed)

    // Update status if provided and valid
    if (status && campaign.canTransitionTo(status)) {
      campaign.status = status
    }

    await campaign.save()

    return NextResponse.json({
      success: true,
      data: {
        progress: campaign.progress,
        status: campaign.status
      }
    })

  } catch (error) {
    console.error("Error updating campaign progress:", error)
    return NextResponse.json(
      { error: "Failed to update campaign progress" },
      { status: 500 }
    )
  }
}