import { NextRequest, NextResponse } from "next/server"
import { getUniqueDonors } from '@/server/donors'

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
    const donors = await getUniqueDonors()
    return NextResponse.json({ donors })
  } catch (error) {
    console.error('[PUBLIC_DONORS_API]', error)
    return NextResponse.json({ error: 'Failed to fetch donors' }, { status: 500 })
  }
}
