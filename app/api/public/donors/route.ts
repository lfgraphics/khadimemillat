import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import CampaignDonation from "@/models/CampaignDonation"

type Donor = {
  id: string
  name: string
  email?: string
  lastDonationAt: string
  totalAmount: number
  donationsCount: number
}

export async function GET(_request: NextRequest) {
  try {
    await connectDB()

    // Fetch completed donations newest first to easily pick the latest per donor
    const donations = await CampaignDonation.find({ status: 'completed' })
      .sort({ createdAt: -1 })
      .select('donorId donorName donorEmail amount createdAt')
      .lean()

    const map = new Map<string, Donor>()

    for (const d of donations) {
      const key = (d as any).donorId || (d as any).donorEmail || (d as any).donorName
      if (!key) continue

      const exists = map.get(key)
      if (!exists) {
        map.set(key, {
          id: key,
          name: (d as any).donorName || 'Anonymous',
          email: (d as any).donorEmail,
          lastDonationAt: (d as any).createdAt.toISOString(),
          totalAmount: (d as any).amount || 0,
          donationsCount: 1,
        })
      } else {
        exists.totalAmount += (d as any).amount || 0
        exists.donationsCount += 1
      }
    }

    const donors = Array.from(map.values()).sort((a, b) => (
      new Date(b.lastDonationAt).getTime() - new Date(a.lastDonationAt).getTime()
    ))

    return NextResponse.json({ donors })
  } catch (error) {
    console.error('[PUBLIC_DONORS_API]', error)
    return NextResponse.json({ error: 'Failed to fetch donors' }, { status: 500 })
  }
}
