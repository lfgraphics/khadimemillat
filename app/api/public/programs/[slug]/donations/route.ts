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
    const { donorName, donorEmail, donorPhone, amount, message, paymentMethod, paymentReference } = body

    if (!donorName || !donorEmail || !amount || amount <= 0) {
      return NextResponse.json({ error: 'Missing required fields or invalid amount' }, { status: 400 })
    }

    await connectDB()

    const program = await WelfareProgram.findOne({ slug, isActive: true }).lean()
    if (!program) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 })
    }

    const { userId } = await auth()

    const donation = new CampaignDonation({
      programId: (program as any)._id,
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

    return NextResponse.json({
      donationId: (donation as any)._id.toString(),
      programSlug: slug,
      status: donation.status
    }, { status: 201 })
  } catch (error) {
    console.error('[PROGRAM_DONATION_API]', error)
    return NextResponse.json({ error: 'Failed to create donation' }, { status: 500 })
  }
}
