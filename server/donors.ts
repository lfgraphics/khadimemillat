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

export async function getUniqueDonors(page: number = 1, limit: number = 20): Promise<{ donors: Donor[], total: number, pages: number }> {
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
  const nameMap = new Map<string, string>() // Track names to prevent duplicates

  // Monetary donors
  for (const d of donations) {
    const donorId = (d as any).donorId as string | undefined
    const donorName = (d as any).donorName as string | undefined
    const donorEmail = (d as any).donorEmail as string | undefined
    
    // Priority: Use Clerk ID first, then email, then name
    let key = donorId || donorEmail || donorName
    if (!key) continue

    const enriched = donorId ? userByClerkId.get(donorId) : undefined
    const name = donorName || enriched?.name || 'Anonymous'
    const email = donorEmail || enriched?.email

    // Check if this name already exists with a different key
    const normalizedName = name.toLowerCase().trim()
    const existingKey = nameMap.get(normalizedName)
    if (existingKey && existingKey !== key) {
      // Use the existing key to merge data
      key = existingKey
    } else {
      nameMap.set(normalizedName, key)
    }

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
      // Update last donation date if this one is more recent
      if (new Date((d as any).createdAt) > new Date(exists.lastDonationAt)) {
        exists.lastDonationAt = (d as any).createdAt.toISOString()
      }
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

    // Check if this name already exists
    const normalizedName = name.toLowerCase().trim()
    const existingKey = nameMap.get(normalizedName)
    const finalKey = existingKey || key
    
    if (!existingKey) {
      nameMap.set(normalizedName, key)
    }

    const exists = map.get(finalKey)
    if (!exists) {
      map.set(finalKey, {
        id: finalKey,
        name,
        email,
        lastDonationAt: (s as any).createdAt.toISOString(),
        totalAmount: 0,
        donationsCount: 1,
      })
    } else {
      exists.donationsCount += 1
      // Update last donation date if this one is more recent
      if (new Date((s as any).createdAt) > new Date(exists.lastDonationAt)) {
        exists.lastDonationAt = (s as any).createdAt.toISOString()
      }
    }
  }

  // Sort by last donation date (most recent first)
  const allDonors = Array.from(map.values()).sort((a, b) => (
    new Date(b.lastDonationAt).getTime() - new Date(a.lastDonationAt).getTime()
  ))

  // Apply pagination
  const total = allDonors.length
  const pages = Math.ceil(total / limit)
  const skip = (page - 1) * limit
  const donors = allDonors.slice(skip, skip + limit)

  return { donors, total, pages }
}
