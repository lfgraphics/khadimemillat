import { NextResponse } from "next/server"
import connectDB from "@/lib/db"
import CampaignDonation from "@/models/CampaignDonation"

export async function GET() {
    try {
        await connectDB()

        // Try different query strategies in order of preference for privacy and data quality
        let donations = []
        
        // Strategy 1: Ideal case - completed, verified, and public
        donations = await CampaignDonation.find({
            status: 'completed',
            paymentVerified: true,
            isVisibleInPublic: true
        })
        .select('donorName amount createdAt')
        .sort({ createdAt: -1 })
        .limit(20)
        .lean()

        // Strategy 2: If no public donations, try completed and verified
        if (donations.length === 0) {
            donations = await CampaignDonation.find({
                status: 'completed',
                paymentVerified: true
            })
            .select('donorName amount createdAt')
            .sort({ createdAt: -1 })
            .limit(20)
            .lean()
        }

        // Strategy 3: If still none, try just completed
        if (donations.length === 0) {
            donations = await CampaignDonation.find({
                status: 'completed'
            })
            .select('donorName amount createdAt')
            .sort({ createdAt: -1 })
            .limit(20)
            .lean()
        }

        // Strategy 4: If still none, try any donations with amount > 0
        if (donations.length === 0) {
            donations = await CampaignDonation.find({
                amount: { $gt: 0 }
            })
            .select('donorName amount createdAt')
            .sort({ createdAt: -1 })
            .limit(20)
            .lean()
        }

        const donationData = donations.map(donation => ({
            id: donation._id,
            donorName: donation.donorName,
            amount: donation.amount,
            createdAt: donation.createdAt
        }))

        return NextResponse.json({
            success: true,
            donations: donationData
        })

    } catch (error) {
        console.error('Recent donations API error:', error)
        return NextResponse.json({
            success: false,
            error: 'Failed to fetch recent donations'
        }, { status: 500 })
    }
}