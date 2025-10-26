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
            paymentReference,
            wants80GReceipt,
            donorPAN,
            donorAddress,
            donorCity,
            donorState,
            donorPincode
        } = body

        if (!donorName || !amount || amount <= 0) {
            return NextResponse.json({
                error: 'Missing required fields: donorName and amount are required, amount must be greater than 0'
            }, { status: 400 })
        }

        if (!donorPhone) {
            return NextResponse.json({
                error: 'Phone number is required'
            }, { status: 400 })
        }

        // Validate 80G requirements if requested
        if (wants80GReceipt) {
            if (!donorPAN?.trim()) {
                return NextResponse.json({
                    error: 'PAN number is required for 80G receipt'
                }, { status: 400 })
            }
            if (!donorAddress?.trim() || !donorCity?.trim() || !donorState?.trim() || !donorPincode?.trim()) {
                return NextResponse.json({
                    error: 'Complete address is required for 80G receipt'
                }, { status: 400 })
            }
        }

        await connectDB()

        const { userId } = await auth()

        // Find an appropriate welfare program, prefer one that matches the cause
        let program = null
        
        if (cause) {
            // First try to find exact match by slug
            program = await WelfareProgram.findOne({
                slug: cause.toLowerCase(),
                isActive: true
            }).lean()
            
            // If no exact match, try partial matching
            if (!program) {
                program = await WelfareProgram.findOne({
                    $and: [
                        { isActive: true },
                        {
                            $or: [
                                { title: { $regex: cause, $options: 'i' } },
                                { description: { $regex: cause, $options: 'i' } },
                                { slug: { $regex: cause, $options: 'i' } }
                            ]
                        }
                    ]
                }).lean()
            }
        }

        // If no matching program found, get any active program
        if (!program) {
            program = await WelfareProgram.findOne({
                isActive: true
            }).lean()
        }

        // If no programs exist at all, return error
        if (!program) {
            return NextResponse.json({
                error: 'No active welfare programs available. Please contact administration.'
            }, { status: 500 })
        }

        // Normalize phone number before saving
        const { normalizePhoneNumber } = await import('@/lib/utils/phone')
        const normalizedPhone = donorPhone ? normalizePhoneNumber(donorPhone.trim()) : undefined

        const donationData: any = {
            programId: (program as any)._id,
            donorId: userId || undefined,
            donorName: donorName.trim(),
            donorEmail: donorEmail?.trim() || `${donorName.replace(/\s+/g, '-').toLowerCase()}${donorPhone?.replace(/\D/g, '').slice(-4) || Date.now()}@khadimemillat.org`,
            donorPhone: normalizedPhone,
            amount: parseFloat(amount.toString()),
            message: message?.trim() || undefined,
            paymentMethod: paymentMethod || 'online',
            paymentReference,
            status: 'pending',
            receiptPreferences: { email: true, sms: true, razorpayManaged: true }
        }

        // Add 80G information if requested
        if (wants80GReceipt) {
            donationData.wants80GReceipt = true
            donationData.donorPAN = donorPAN.trim().toUpperCase()
            donationData.donorAddress = donorAddress.trim()
            donationData.donorCity = donorCity.trim()
            donationData.donorState = donorState.trim()
            donationData.donorPincode = donorPincode.trim()
        }

        const donation = new CampaignDonation(donationData)
        await donation.save()

        return NextResponse.json({
            donationId: (donation as any)._id.toString(),
            programId: (program as any)._id.toString(),
            status: donation.status,
            message: 'Donation record created successfully'
        }, { status: 201 })

    } catch (error) {
        console.log('[GENERAL_DONATION_API] Error:', error instanceof Error ? error.message : 'Unknown error')
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