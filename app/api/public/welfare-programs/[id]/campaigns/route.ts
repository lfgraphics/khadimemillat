import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import Campaign from "@/models/Campaign"
import CampaignDonation from "@/models/CampaignDonation"
import WelfareProgram from "@/models/WelfareProgram"
import { auth } from "@clerk/nextjs/server"

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        await connectDB()

        const { searchParams } = new URL(request.url)
        const includeStats = searchParams.get('includeStats') === 'true'
        const featured = searchParams.get('featured') === 'true'

        const query: any = {
            programId: id,
            isActive: true
        }

        if (featured) {
            query.isFeatured = true
        }

        const campaigns = await Campaign.find(query)
            .sort({ isFeatured: -1, startDate: -1 })
            .lean()

        if (includeStats) {
            const campaignsWithStats = await Promise.all(
                campaigns.map(async (campaign) => {
                    const donations = await CampaignDonation.find({
                        campaignId: campaign._id,
                        status: 'completed'
                    }).lean()

                    const raised = donations.reduce((sum, donation) => sum + donation.amount, 0)
                    const supportersCount = donations.length

                    return {
                        ...campaign,
                        raised,
                        supportersCount,
                        progress: campaign.goal > 0 ? (raised / campaign.goal) * 100 : 0
                    }
                })
            )

            return NextResponse.json(campaignsWithStats)
        }

        return NextResponse.json(campaigns)
    } catch (error) {
        console.error("Error fetching campaigns:", error)
        return NextResponse.json(
            { error: "Failed to fetch campaigns" },
            { status: 500 }
        )
    }
}

export async function POST(
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

        // Verify program exists
        const program = await WelfareProgram.findById(id)
        if (!program) {
            return NextResponse.json(
                { error: "Welfare program not found" },
                { status: 404 }
            )
        }

        const body = await request.json()
        const { title, description, coverImage, goal, startDate, endDate, isFeatured } = body

        if (!title || !description || !coverImage || !goal || !startDate) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            )
        }

        // Generate slug from title
        const slug = title.toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim()

        // Ensure slug is unique
        let uniqueSlug = slug
        let counter = 1
        while (await Campaign.findOne({ slug: uniqueSlug })) {
            uniqueSlug = `${slug}-${counter}`
            counter++
        }

        const campaign = new Campaign({
            programId: id,
            title,
            slug: uniqueSlug,
            description,
            coverImage,
            goal,
            startDate: new Date(startDate),
            endDate: endDate ? new Date(endDate) : undefined,
            isFeatured: isFeatured || false,
            createdBy: userId,
            lastUpdatedBy: userId
        })

        await campaign.save()

        return NextResponse.json(campaign, { status: 201 })
    } catch (error) {
        console.error("Error creating campaign:", error)
        return NextResponse.json(
            { error: "Failed to create campaign" },
            { status: 500 }
        )
    }
}