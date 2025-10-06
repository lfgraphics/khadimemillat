import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import Campaign from "@/models/Campaign"
import CampaignDonation from "@/models/CampaignDonation"
import { auth } from "@clerk/nextjs/server"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const body = await request.json()
    const { donorName, donorEmail, donorPhone, amount, message, paymentReference, paymentMethod } = body

    if (!donorName || !donorEmail || !amount || amount <= 0) {
      return NextResponse.json({ error: 'Missing required fields or invalid amount' }, { status: 400 })
    }

    await connectDB()

    const campaign = await Campaign.findOne({ slug, isActive: true }).lean()
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    const { userId } = await auth()

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
      status: 'completed'
    })

    await donation.save()

    return NextResponse.json({ donationId: (donation as any)._id.toString() }, { status: 201 })
  } catch (error) {
    console.error('[COMPLETE_DONATION_API]', error)
    return NextResponse.json({ error: 'Failed to record donation' }, { status: 500 })
  }
}
