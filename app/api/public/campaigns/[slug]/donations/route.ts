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
            paymentReference,
            wants80GReceipt,
            donorPAN,
            donorAddress,
            donorCity,
            donorState,
            donorPincode,
            receiptPreferences
        } = body

        if (!donorName || !donorEmail || !donorPhone || !amount || amount <= 0) {
            return NextResponse.json(
                { error: "Missing required fields: donorName, donorEmail, donorPhone, and amount are required" },
                { status: 400 }
            )
        }

        // Validate 80G requirements
        if (wants80GReceipt) {
            if (!donorPAN || !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(donorPAN)) {
                return NextResponse.json(
                    { error: "Valid PAN number is required for 80G receipt" },
                    { status: 400 }
                )
            }
            if (!donorAddress || !donorCity || !donorState || !donorPincode) {
                return NextResponse.json(
                    { error: "Complete address is required for 80G receipt" },
                    { status: 400 }
                )
            }
            if (!/^[0-9]{6}$/.test(donorPincode)) {
                return NextResponse.json(
                    { error: "Valid 6-digit pincode is required for 80G receipt" },
                    { status: 400 }
                )
            }
        }

        const { userId } = await auth()

        const donation = new CampaignDonation({
            campaignId: (campaign as any)._id,
            programId: (campaign as any).programId,
            donorId: userId || undefined,
            donorName,
            donorEmail,
            donorPhone,
            donorAddress: wants80GReceipt ? donorAddress : undefined,
            donorCity: wants80GReceipt ? donorCity : undefined,
            donorState: wants80GReceipt ? donorState : undefined,
            donorPincode: wants80GReceipt ? donorPincode : undefined,
            amount,
            message,
            paymentMethod: paymentMethod || 'online',
            paymentReference,
            status: 'pending',
            wants80GReceipt: wants80GReceipt || false,
            donorPAN: wants80GReceipt ? donorPAN : undefined,
            receiptPreferences: receiptPreferences || { email: true, sms: true, razorpayManaged: true }
        })

        await donation.save()

        return NextResponse.json(donation, { status: 201 })
    } catch (error) {
        console.log("Error creating donation:", error instanceof Error ? error.message : 'Unknown error')
        return NextResponse.json(
            { error: "Failed to create donation" },
            { status: 500 }
        )
    }
}