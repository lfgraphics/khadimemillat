import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import Campaign from "@/models/Campaign"
import CampaignDonation from "@/models/CampaignDonation"
import { auth } from "@clerk/nextjs/server"

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params
        await connectDB()

        const campaign = await Campaign.findOne({
            slug,
            isActive: true
        }).lean()

        if (!campaign) {
            return NextResponse.json(
                { error: "Campaign not found" },
                { status: 404 }
            )
        }

        const { searchParams } = new URL(request.url)
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '20')
        const skip = (page - 1) * limit

        const donations = await CampaignDonation.find({
            campaignId: (campaign as any)._id,
            status: 'completed'
        })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .select('donorName amount message createdAt')
            .lean()

        const total = await CampaignDonation.countDocuments({
            campaignId: (campaign as any)._id,
            status: 'completed'
        })

        return NextResponse.json({
            donations,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        })
    } catch (error) {
        console.error("Error fetching donations:", error)
        return NextResponse.json(
            { error: "Failed to fetch donations" },
            { status: 500 }
        )
    }
}
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params
        await connectDB()

        const campaign = await Campaign.findOne({
            slug,
            isActive: true
        }).lean()

        if (!campaign) {
            return NextResponse.json(
                { error: "Campaign not found" },
                { status: 404 }
            )
        }

        const body = await request.json()
        const {
            donorName,
            donorEmail,
            donorPhone,
            amount,
            message,
            paymentMethod,
            paymentReference
        } = body

        if (!donorName || !donorEmail || !amount || amount <= 0) {
            return NextResponse.json(
                { error: "Missing required fields or invalid amount" },
                { status: 400 }
            )
        }

        const { userId } = await auth()

        // Phone number is optional for logged-out users
        // They can donate without creating an account

        const donation = new CampaignDonation({
            campaignId: (campaign as any)._id,
            programId: (campaign as any).programId,
            donorId: userId || undefined,
            donorName,
            donorEmail,
            donorPhone: donorPhone || undefined,
            amount,
            message,
            paymentMethod: paymentMethod || 'online',
            paymentReference,
            status: 'pending'
        })

        await donation.save()

        return NextResponse.json(donation, { status: 201 })
    } catch (error) {
        console.error("Error creating donation:", error)
        return NextResponse.json(
            { error: "Failed to create donation" },
            { status: 500 }
        )
    }
}