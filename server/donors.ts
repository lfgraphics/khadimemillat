import connectDB from '@/lib/db'
import CampaignDonation from '@/models/CampaignDonation'
import CollectionRequest from '@/models/CollectionRequest'
import User from '@/models/User'

export type Donor = {
  id: string
  name: string
  email?: string
  lastDonationAt: string
  totalAmount: number
  donationsCount: number
}

export async function getUniqueDonors(): Promise<Donor[]> {
  await connectDB()

  const [donations, scrap] = await Promise.all([
    CampaignDonation.find({ status: 'completed' })
      .sort({ createdAt: -1 })
      .select('donorId donorName donorEmail amount createdAt')
      .lean(),
    CollectionRequest.find({ status: 'completed' })
      .sort({ createdAt: -1 })
      .select('donor phone createdAt')
      .lean(),
  ])

  const clerkIds = new Set<string>()
  for (const d of donations) { if ((d as any).donorId) clerkIds.add((d as any).donorId as string) }
  for (const s of scrap) { if ((s as any).donor) clerkIds.add((s as any).donor as string) }
  const users = clerkIds.size
    ? await User.find({ clerkUserId: { $in: Array.from(clerkIds) } })
        .select('clerkUserId name email')
        .lean()
    : []
  const userByClerkId = new Map<string, { name?: string; email?: string }>()
  for (const u of users) userByClerkId.set((u as any).clerkUserId, { name: (u as any).name, email: (u as any).email })

  const map = new Map<string, Donor>()

  // Monetary donors
  for (const d of donations) {
    const donorId = (d as any).donorId as string | undefined
    const key = donorId || (d as any).donorEmail || (d as any).donorName
    if (!key) continue

    const enriched = donorId ? userByClerkId.get(donorId) : undefined
    const name = (d as any).donorName || enriched?.name || 'Anonymous'
    const email = (d as any).donorEmail || enriched?.email

    const exists = map.get(key)
    if (!exists) {
      map.set(key, {
        id: key,
        name,
        email,
        lastDonationAt: (d as any).createdAt.toISOString(),
        totalAmount: (d as any).amount || 0,
        donationsCount: 1,
      })
    } else {
      exists.totalAmount += (d as any).amount || 0
      exists.donationsCount += 1
    }
  }

  // Scrap donors
  for (const s of scrap) {
    const donorId = (s as any).donor as string | undefined
    const key = donorId || (s as any).phone
    if (!key) continue
    const enriched = donorId ? userByClerkId.get(donorId) : undefined
    const name = enriched?.name || 'Scrap Donor'
    const email = enriched?.email

    const exists = map.get(key)
    if (!exists) {
      map.set(key, {
        id: key,
        name,
        email,
        lastDonationAt: (s as any).createdAt.toISOString(),
        totalAmount: 0,
        donationsCount: 1,
      })
    } else {
      exists.donationsCount += 1
    }
  }

  return Array.from(map.values()).sort((a, b) => (
    new Date(b.lastDonationAt).getTime() - new Date(a.lastDonationAt).getTime()
  ))
}
