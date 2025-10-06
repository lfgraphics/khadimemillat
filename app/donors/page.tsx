import { Metadata } from 'next'
import { Users, Calendar } from 'lucide-react'
import connectDB from '@/lib/db'
import CampaignDonation from '@/models/CampaignDonation'

export const metadata: Metadata = {
  title: 'Our Donors | Khadim-e-Millat Welfare Foundation',
  description: 'See the generous individuals supporting our programs.'
}

type Donor = {
  id: string
  name: string
  email?: string
  lastDonationAt: string
  totalAmount: number
  donationsCount: number
}

async function getUniqueDonors(): Promise<Donor[]> {
  await connectDB()
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
  return Array.from(map.values()).sort((a, b) => (
    new Date(b.lastDonationAt).getTime() - new Date(a.lastDonationAt).getTime()
  ))
}

export default async function DonorsPage() {
  const donors = await getUniqueDonors()

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-end justify-between mb-8">
        <h1 className="text-3xl font-bold">Our Generous Donors</h1>
        <div className="text-sm text-muted-foreground">Latest first</div>
      </div>

      {donors.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No donations recorded yet.</div>
      ) : (
        <div className="space-y-3">
          {donors.map((d) => (
            <div key={d.id} className="flex flex-wrap items-baseline justify-between p-4 rounded-lg bg-card border">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center"><Users className="w-4 h-4 text-primary" /></div>
                <div>
                  <div className="font-medium">{d.name}</div>
                  {d.email && <div className="text-xs text-muted-foreground">{d.email}</div>}
                </div>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <div className="text-right">
                  {/* <div className="font-semibold">₹{d.totalAmount.toLocaleString()}</div> */}
                  <div className="text-xs text-muted-foreground"> {d.donationsCount} donation{d.donationsCount>1?'s':''}</div>
                </div>
                <div className="flex items-center text-xs text-muted-foreground"><Calendar className="w-3.5 h-3.5 mr-1" />{new Date(d.lastDonationAt).toLocaleDateString()}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
