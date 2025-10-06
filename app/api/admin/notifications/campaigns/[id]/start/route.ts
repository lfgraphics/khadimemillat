import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import connectDB from "@/lib/db"
import User from "@/models/User"
import NotificationCampaign from "@/models/NotificationCampaign"
import { startCampaignSchema } from "@/lib/validators/campaign.validator"
import { ZodError } from "zod"
import mongoose from "mongoose"

// POST /api/admin/notifications/campaigns/[id]/start - Start campaign
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
        const { force } = startCampaignSchema.parse(body)

        // Find campaign
        const campaign = await NotificationCampaign.findById(id)
        if (!campaign) {
            return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
        }

        // Check if campaign can be started
        if (!campaign.canTransitionTo('running')) {
            return NextResponse.json({
                error: `Cannot start campaign with status: ${campaign.status}`
            }, { status: 400 })
        }

        // Validation checks (can be bypassed with force flag)
        const validationWarnings: string[] = []

        // Check if campaign has content for all selected channels
        for (const channel of campaign.channels) {
            if (!campaign.content[channel] || !campaign.content[channel].message) {
                if (!force) {
                    return NextResponse.json({
                        error: `Missing content for channel: ${channel}`,
                        canForce: true
                    }, { status: 400 })
                }
                validationWarnings.push(`Missing content for channel: ${channel}`)
            }
        }

        // Check if targeting will result in users
        if (campaign.targeting.roles.length === 0) {
            if (!force) {
                return NextResponse.json({
                    error: "No target roles specified",
                    canForce: true
                }, { status: 400 })
            }
            validationWarnings.push("No target roles specified")
        }

        // For scheduled campaigns, check if scheduled time is in the future
        if (campaign.scheduling.type === 'scheduled') {
            if (!campaign.scheduling.scheduledFor) {
                return NextResponse.json({
                    error: "Scheduled campaigns must have a scheduled date"
                }, { status: 400 })
            }

            if (campaign.scheduling.scheduledFor <= new Date()) {
                if (!force) {
                    return NextResponse.json({
                        error: "Scheduled time must be in the future",
                        canForce: true
                    }, { status: 400 })
                }
                validationWarnings.push("Scheduled time is in the past")
            }
        }

        // Calculate target audience size (simplified - in real implementation this would query users)
        let estimatedAudience = 0

        // This is a simplified calculation - in a real implementation, you would:
        // 1. Query users based on targeting criteria
        // 2. Filter out users who have opted out of selected channels
        // 3. Apply location and activity status filters

        // For now, we'll use a mock calculation
        const roleMultipliers = {
            'everyone': 1000,
            'user': 800,
            'scrapper': 50,
            'moderator': 10,
            'admin': 5
        }

        for (const role of campaign.targeting.roles) {
            estimatedAudience += roleMultipliers[role as keyof typeof roleMultipliers] || 0
        }

        // Apply location filter (reduce by 50% if location specified)
        if (campaign.targeting.locations && campaign.targeting.locations.length > 0) {
            estimatedAudience = Math.floor(estimatedAudience * 0.5)
        }

        // Apply activity status filter
        if (campaign.targeting.activityStatus) {
            const activityMultipliers: Record<'active'|'inactive'|'new', number> = {
                'active': 0.7,
                'inactive': 0.2,
                'new': 0.1
            }
            estimatedAudience = Math.floor(estimatedAudience * activityMultipliers[campaign.targeting.activityStatus as 'active'|'inactive'|'new'])
        }

        // Update campaign status and progress
        campaign.status = campaign.scheduling.type === 'immediate' ? 'running' : 'scheduled'
        campaign.progress.total = estimatedAudience
        campaign.progress.sent = 0
        campaign.progress.failed = 0
        campaign.progress.inProgress = campaign.scheduling.type === 'immediate' ? estimatedAudience : 0

        await campaign.save()

        // TODO: In a real implementation, you would:
        // 1. Queue the campaign for processing if immediate
        // 2. Schedule the campaign if scheduled
        // 3. Set up recurring job if recurring
        // 4. Start real-time progress tracking

        // For now, we'll simulate immediate processing for immediate campaigns
        if (campaign.scheduling.type === 'immediate') {
            // This would typically be handled by a background job queue
            console.log(`Starting immediate campaign: ${campaign.name} for ${estimatedAudience} users`)

            // Simulate some processing time and update progress
            setTimeout(async () => {
                try {
                    const updatedCampaign = await NotificationCampaign.findById(id)
                    if (updatedCampaign && updatedCampaign.status === 'running') {
                        // Simulate successful delivery to most users
                        const successRate = 0.85 + Math.random() * 0.1 // 85-95% success rate
                        const sent = Math.floor(estimatedAudience * successRate)
                        const failed = estimatedAudience - sent

                        updatedCampaign.progress.sent = sent
                        updatedCampaign.progress.failed = failed
                        updatedCampaign.progress.inProgress = 0
                        updatedCampaign.status = 'completed'

                        await updatedCampaign.save()
                        console.log(`Campaign ${campaign.name} completed: ${sent} sent, ${failed} failed`)
                    }
                } catch (error) {
                    console.error('Error updating campaign progress:', error)
                }
            }, 5000) // Simulate 5 second processing time
        }

        return NextResponse.json({
            success: true,
            data: campaign,
            estimatedAudience,
            validationWarnings: validationWarnings.length > 0 ? validationWarnings : undefined,
            message: campaign.scheduling.type === 'immediate'
                ? "Campaign started successfully"
                : "Campaign scheduled successfully"
        })

    } catch (error) {
        console.error("Error starting campaign:", error)

        if (error instanceof ZodError) {
            return NextResponse.json({
                error: "Invalid request data",
                details: error.message
            }, { status: 400 })
        }

        return NextResponse.json(
            { error: "Failed to start campaign" },
            { status: 500 }
        )
    }
}