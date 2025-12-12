import { NextRequest, NextResponse } from "next/server"
import { auth } from '@clerk/nextjs/server'
import connectDB from "@/lib/db"
import { Campaign, CampaignDonation } from "@/models"

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params
        
        // Check user role - only show recent donations to members, normal users, or logged-out users
        const { userId } = await auth()
        let showRecentDonations = true
        
        if (userId) {
            // If user is logged in, check their role
            try {
                const { clerkClient } = await import('@clerk/nextjs/server')
                const client = await clerkClient()
                const user = await client.users.getUser(userId)
                const userRole = user.publicMetadata?.role as string
                
                // Don't show recent donations to admin, moderator, or scrapper roles
                if (userRole && ['admin', 'moderator', 'scrapper'].includes(userRole)) {
                    showRecentDonations = false
                }
            } catch (roleCheckError) {
                console.warn('Role check failed, allowing access:', roleCheckError)
                // If role check fails, allow access (treat as normal user)
            }
        }
        
        await connectDB()
        
        const campaign = await Campaign.findOne({ 
            slug, 
            isActive: true 
        })
        .populate('programId', 'title slug icon iconColor')
        .lean()
        
        if (!campaign) {
            return NextResponse.json(
                { error: "Campaign not found" },
                { status: 404 }
            )
        }
        
        // Get donation stats
        const donations = await CampaignDonation.find({ 
            campaignId: (campaign as any)._id, 
            status: 'completed' 
        })
        .sort({ createdAt: -1 })
        .lean()
        
        const raised = donations.reduce((sum, donation) => sum + donation.amount, 0)
        // Count unique supporters properly
        const uniqueSupporters = new Set()
        donations.forEach(d => {
          if (d.donorId) {
            uniqueSupporters.add(d.donorId)
          } else {
            uniqueSupporters.add(d.donorEmail)
          }
        })
        const supportersCount = uniqueSupporters.size
        const progress = (campaign as any).goal > 0 ? (raised / (campaign as any).goal) * 100 : 0
        
        // Get recent donations for display (only for non-staff users)
        const recentDonations = showRecentDonations ? donations
            .slice(0, 10)
            .map(d => ({
                donorName: d.donorName,
                amount: d.amount,
                message: d.message,
                createdAt: d.createdAt
            })) : []
        
        return NextResponse.json({
            ...campaign,
            raised,
            supportersCount,
            progress,
            recentDonations
        })
    } catch (error) {
        console.error("Error fetching campaign:", error)
        return NextResponse.json(
            { error: "Failed to fetch campaign" },
            { status: 500 }
        )
    }
}