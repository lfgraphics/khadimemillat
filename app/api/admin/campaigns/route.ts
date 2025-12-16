import { NextRequest, NextResponse } from "next/server"
import { auth, clerkClient } from "@clerk/nextjs/server"
import connectDB from "@/lib/db"
import { Campaign, WelfareProgram } from "@/models"
import { whatsappService } from "@/lib/services/whatsapp.service"
import { NotificationService } from "@/lib/services/notification.service"

/**
 * Convert HTML/Markdown description to WhatsApp-friendly plain text
 */
function convertToWhatsAppText(html: string): string {
  // Remove HTML tags
  let text = html.replace(/<[^>]*>/g, '')
  // Convert HTML entities
  text = text.replace(/&nbsp;/g, ' ')
  text = text.replace(/&amp;/g, '&')
  text = text.replace(/&lt;/g, '<')
  text = text.replace(/&gt;/g, '>')
  text = text.replace(/&quot;/g, '"')
  // Remove extra whitespace and newlines
  text = text.replace(/\s+/g, ' ').trim()
  // Limit to 100 characters for WhatsApp template
  if (text.length > 100) {
    text = text.substring(0, 97) + '...'
  }
  return text
}

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

    // Send WhatsApp notifications if requested
    if (notifyUsers) {
      try {
        console.log('📢 Sending campaign notifications via WhatsApp...')

        // Get all users from Clerk with pagination
        const client = await clerkClient()
        let allUsers: any[] = []
        let offset = 0
        const limit = 500
        let hasMore = true

        while (hasMore) {
          const response = await client.users.getUserList({
            limit,
            offset
          })

          allUsers = allUsers.concat(response.data)
          offset += limit
          hasMore = response.data.length === limit

          console.log(`Fetched ${allUsers.length} users so far...`)
        }

        console.log(`✅ Fetched total of ${allUsers.length} users from Clerk`)

        // Filter out admin and moderator users
        const regularUsers = allUsers.filter(user => {
          const role = user.publicMetadata?.role || user.privateMetadata?.role
          return role !== 'admin' && role !== 'moderator'
        })

        console.log(`Found ${regularUsers.length} regular users to notify (filtered from ${allUsers.length} total users)`)

        // Convert description to WhatsApp-friendly text
        const whatsappDescription = convertToWhatsAppText(description)

        // Prepare recipients for bulk sending
        const recipients = regularUsers
          .map(user => {
            const phone = user.phoneNumbers?.[0]?.phoneNumber || user.privateMetadata?.phone as string
            if (!phone) {
              console.log(`Skipping user ${user.id} - no phone number`)
              return null
            }

            const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User'

            return {
              destination: String(phone),
              userName,
              templateParams: [
                title,
                whatsappDescription,
                slug
              ]
            }
          })
          .filter(recipient => recipient !== null) as Array<{
            destination: string
            userName: string
            templateParams: string[]
          }>

        console.log(`📤 Sending bulk campaign message to ${recipients.length} users...`)

        // Send to all recipients at once
        const result = await whatsappService.sendBulkCampaignMessage({
          campaignName: 'Campaign Notification',
          recipients,
          source: 'campaign_creation'
        })

        console.log(`✅ Campaign notifications: ${result.sent} sent, ${result.failed} failed`)

        if (result.errors && result.errors.length > 0) {
          console.error('Bulk sending errors:', result.errors)
        }

        // Send push notifications to all regular users in batches
        console.log('📱 Sending push notifications...')
        let pushSent = 0
        let pushFailed = 0
        const batchSize = 10
        const delayBetweenBatches = 500

        for (let i = 0; i < regularUsers.length; i += batchSize) {
          const batch = regularUsers.slice(i, i + batchSize)
          const batchPromises = batch.map(user =>
            NotificationService.sendWebPushToUser(user.id, {
              title: title,
              body: whatsappDescription,
              icon: coverImage || '/android-chrome-192x192.png',
              url: `/campaigns/${slug}`,
              data: {
                campaignSlug: slug,
                type: 'new_campaign'
              }
            }).then(r => ({ success: r.success, error: r.error }))
              .catch(e => ({ success: false, error: e.message }))
          )
          const results = await Promise.all(batchPromises)
          results.forEach(r => r.success ? pushSent++ : pushFailed++)
          if (i + batchSize < regularUsers.length) await new Promise(r => setTimeout(r, delayBetweenBatches))
        }

        console.log(`✅ Push notifications: ${pushSent} sent, ${pushFailed} failed`)
      } catch (error) {
        console.error('Error sending campaign notifications:', error)
        // Don't fail the campaign creation if notifications fail
      }
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
