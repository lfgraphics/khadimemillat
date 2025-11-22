import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import WelfareProgram from "@/models/WelfareProgram"
import CampaignDonation from "@/models/CampaignDonation"
import { auth } from "@clerk/nextjs/server"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
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

    if (!donorName || !amount || amount <= 0) {
      return NextResponse.json({ error: 'Missing required fields: Name and Amount are required' }, { status: 400 })
    }

    if (!donorPhone) {
      return NextResponse.json({
        error: 'Phone number is required'
      }, { status: 400 })
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

    await connectDB()

    const program = await WelfareProgram.findOne({ slug, isActive: true }).lean()
    if (!program) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 })
    }

    const { userId } = await auth()

    // Normalize phone number before saving
    const { normalizePhoneNumber } = await import('@/lib/utils/phone')
    const normalizedPhone = donorPhone ? normalizePhoneNumber(donorPhone) : undefined

    const donation = new CampaignDonation({
      programId: (program as any)._id,
      donorId: userId || undefined,
      donorName,
      donorEmail,
      donorPhone: normalizedPhone,
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
      receiptPreferences: receiptPreferences || { email: true, sms: false, razorpayManaged: false }
    })

    await donation.save()

    return NextResponse.json({
      donationId: (donation as any)._id.toString(),
      programSlug: slug,
      status: donation.status
    }, { status: 201 })
  } catch (error) {
    console.error('[PROGRAM_DONATION_API] Error creating donation:', error)
    
    let errorMessage = 'Failed to create donation'
    
    if (error instanceof Error) {
      if (error.message.includes('validation')) {
        errorMessage = 'Validation error: Please check all required fields'
      } else if (error.message.includes('duplicate')) {
        errorMessage = 'Duplicate donation detected'
      } else {
        errorMessage = `Donation creation failed: ${error.message}`
      }
    }
    
    return NextResponse.json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : String(error) : undefined
    }, { status: 500 })
  }
}
