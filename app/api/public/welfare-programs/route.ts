import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import WelfareProgram from "@/models/WelfareProgram"
import Campaign from "@/models/Campaign"
import CampaignDonation from "@/models/CampaignDonation"

export async function GET(request: NextRequest) {
    try {
        await connectDB()

        const { searchParams } = new URL(request.url)
        const includeStats = searchParams.get('includeStats') === 'true'
        const format = searchParams.get('format') // 'simple' for donation forms

        const programs = await WelfareProgram.find({ isActive: true })
            .sort({ displayOrder: 1, createdAt: -1 })
            .lean()

        // Simple format for donation forms
        if (format === 'simple') {
            const simplifiedPrograms = programs.map((program: any) => ({
                value: program.slug,
                label: program.title,
                description: program.description,
                icon: program.icon,
                iconColor: program.iconColor
            }))
            return NextResponse.json({ programs: simplifiedPrograms })
        }

        if (includeStats) {
            // Get aggregated stats for each program
            const programsWithStats = await Promise.all(
                programs.map(async (program) => {
                    const campaigns = await Campaign.find({
                        programId: program._id,
                        isActive: true
                    }).lean()

                    const donations = await CampaignDonation.find({
                        programId: program._id,
                        status: 'completed'
                    }).lean()

                    const totalRaised = donations.reduce((sum, donation) => sum + donation.amount, 0)
                    const totalSupporters = new Set(donations.map(d => d.donorId).filter(Boolean)).size

                    return {
                        ...program,
                        totalRaised,
                        totalCampaigns: campaigns.length,
                        totalSupporters
                    }
                })
            )

            return NextResponse.json(programsWithStats)
        }

        return NextResponse.json(programs)
    } catch (error) {
        console.error("Error fetching welfare programs:", error)
        return NextResponse.json(
            { error: "Failed to fetch welfare programs" },
            { status: 500 }
        )
    }
}

export async function POST(request: NextRequest) {
    try {
        await connectDB()

        const body = await request.json()
        const { title, description, coverImage, icon, iconColor, donationLink, displayOrder } = body

        if (!title || !description || !coverImage || !icon || !iconColor || !donationLink) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            )
        }

        const program = new WelfareProgram({
            title,
            description,
            coverImage,
            icon,
            iconColor,
            donationLink,
            displayOrder: displayOrder || 0
        })

        await program.save()

        return NextResponse.json(program, { status: 201 })
    } catch (error) {
        console.error("Error creating welfare program:", error)
        return NextResponse.json(
            { error: "Failed to create welfare program" },
            { status: 500 }
        )
    }
}