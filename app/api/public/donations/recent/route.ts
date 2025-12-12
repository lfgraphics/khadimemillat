import { NextResponse } from "next/server"
import { auth } from '@clerk/nextjs/server'
import connectDB from "@/lib/db"
import CampaignDonation from "@/models/CampaignDonation"

export async function GET() {
    try {
        // Check user role - only show donations to members, normal users, or logged-out users
        const { userId } = await auth()
        
        if (userId) {
            // If user is logged in, check their role
            try {
                const { clerkClient } = await import('@clerk/nextjs/server')
                const client = await clerkClient()
                const user = await client.users.getUser(userId)
                const userRole = user.publicMetadata?.role as string
                
                // Don't show donations to admin, moderator, or scrapper roles
                if (userRole && ['admin', 'moderator', 'scrapper'].includes(userRole)) {
                    return NextResponse.json({
                        success: true,
                        donations: [] // Return empty array for admin/staff roles
                    })
                }
            } catch (roleCheckError) {
                console.warn('Role check failed, allowing access:', roleCheckError)
                // If role check fails, allow access (treat as normal user)
            }
        }
        // If not logged in or is member/normal user, continue to show donations

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