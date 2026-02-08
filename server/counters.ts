import connectDB from '@/lib/db'
import CampaignDonation from '@/models/CampaignDonation'
import CollectionRequest from '@/models/CollectionRequest'
import MembershipRequest from '@/models/MembershipRequest'

export type HomeCounters = {
  familiesHelped: number
  activeVolunteers: number
  citiesServed: number
  donors: number
  members: number
}

/**
 * Returns homepage counters. Most are static for now; donors and members are dynamic.
 */
export async function getHomeCounters(): Promise<HomeCounters> {
  // Static counters (to be made dynamic later)
  const base: Omit<HomeCounters, 'donors' | 'members'> = {
    familiesHelped: 1250,
    activeVolunteers: 187,
    citiesServed: 12,
  }

  try {
    await connectDB()
    const [donations, scrap, members, allMembershipRequests] = await Promise.all([
      // Query for verified payments instead of status: 'completed'
      // Since donations can be paymentVerified: true even with status: 'pending'
      CampaignDonation.find({ paymentVerified: true })
        .select('donorId donorEmail donorName donorPhone')
        .lean(),
      CollectionRequest.find({ status: { $in: ['collected', 'completed'] } })
        .select('donor phone')
        .lean(),
      MembershipRequest.find({ status: 'approved' })
        .select('userId')
        .lean(),
      MembershipRequest.find({})
        .select('status')
        .lean(),
    ])

    const unique = new Set<string>()
    for (const d of donations) {
      // Try donorId, then donorPhone, then donorEmail, then donorName
      const key = (d as any).donorId || (d as any).donorPhone || (d as any).donorEmail || (d as any).donorName
      if (key) unique.add(key)
    }
    for (const s of scrap) {
      const key = (s as any).donor || (s as any).phone
      if (key) unique.add(key)
    }
    
    const membersCount = members.length

    return { ...base, donors: unique.size, members: membersCount }
  } catch (e) {
    console.error('[HOME_COUNTERS]', e)
    // Fallback: 0 donors and members on error
    return { ...base, donors: 0, members: 0 }
  }
}
