import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import CampaignDonation from "@/models/CampaignDonation"
import WelfareProgram from "@/models/WelfareProgram"
import { auth } from "@clerk/nextjs/server"

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const {
            donorName,
            donorEmail,
            donorPhone,
            amount,
            message,
            cause,
            paymentMethod,
            paymentReference
        } = body

        if (!donorName || !amount || amount <= 0) {
            return NextResponse.json({
                error: 'Missing required fields: donorName and amount are required, amount must be greater than 0'
            }, { status: 400 })
        }

        if (!donorPhone && !donorEmail) {
            return NextResponse.json({
                error: 'Either phone number or email is required'
            }, { status: 400 })
        }

        await connectDB()

        const { userId } = await auth()

        // Find or create a general welfare program for the specified cause
        let program = await WelfareProgram.findOne({
            slug: { $regex: cause, $options: 'i' },
            isActive: true
        }).lean()

        // If no specific program exists, create a general one or use a default
        if (!program) {
            // Try to find a general donation program
            program = await WelfareProgram.findOne({
                slug: { $regex: cause, $options: 'i' },
                isActive: true
            }).lean()

            // If still no program, create one on the fly
            if (!program) {
                const newProgram = new WelfareProgram({
                    title: cause ? cause : 'General Donations',
                    slug: cause.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '') || 'general-donations',
                    description: 'General donations for various causes',
                    category: cause || 'general',
                    targetAmount: 0, // No specific target
                    isActive: true,
                    isPublic: true
                })
                await newProgram.save()
                program = newProgram.toObject()
            }
        }

        const donation = new CampaignDonation({
            programId: (program as any)._id,
            donorId: userId || undefined,
            donorName: donorName.trim(),
            donorEmail: donorEmail?.trim() || `${donorName.replace(/\s+/g, '-').toLowerCase()}${donorPhone?.replace(/\D/g, '').slice(-4) || Date.now()}@khadimemillat.org`,
            donorPhone: donorPhone?.trim() || undefined,
            amount: parseFloat(amount.toString()),
            message: message?.trim() || undefined,
            paymentMethod: paymentMethod || 'online',
            paymentReference,
            status: 'pending'
        })

        await donation.save()

        return NextResponse.json({
            donationId: (donation as any)._id.toString(),
            programId: (program as any)._id.toString(),
            status: donation.status,
            message: 'Donation record created successfully'
        }, { status: 201 })

    } catch (error) {
        console.error('[GENERAL_DONATION_API]', error)
        return NextResponse.json({
            error: 'Failed to create donation record',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}

// Optional: GET method to retrieve donations (for admin purposes)
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const limit = parseInt(searchParams.get('limit') || '10')
        const page = parseInt(searchParams.get('page') || '1')
        const skip = (page - 1) * limit

        await connectDB()

        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
        }

        const donations = await CampaignDonation.find({})
            .populate('programId', 'title slug')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean()

        const total = await CampaignDonation.countDocuments({})

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
        console.error('[GENERAL_DONATION_GET_API]', error)
        return NextResponse.json({
            error: 'Failed to retrieve donations',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}