import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import CampaignDonation from "@/models/CampaignDonation"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const { paymentReference, paymentMethod } = body || {}

    await connectDB()

    const donation = await CampaignDonation.findById(id)
    if (!donation) {
      return NextResponse.json({ error: 'Donation not found' }, { status: 404 })
    }

    donation.status = 'completed'
    if (paymentReference) donation.paymentReference = paymentReference
    if (paymentMethod) donation.paymentMethod = paymentMethod
    donation.processedAt = new Date()
    await donation.save()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DONATION_COMPLETE_BY_ID]', error)
    return NextResponse.json({ error: 'Failed to complete donation' }, { status: 500 })
  }
}
