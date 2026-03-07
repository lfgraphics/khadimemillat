import connectDB from '@/lib/db'
import MembershipRequest from '@/models/MembershipRequest'
import { getUniqueDonors } from './donors'

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
    
    // Get unique donors count using the shared logic
    const { total: donorsCount } = await getUniqueDonors(1, 1)

    const [members] = await Promise.all([
      MembershipRequest.find({ status: 'approved' })
        .select('userId')
        .lean(),
    ])
    
    const membersCount = members.length

    return { ...base, donors: donorsCount, members: membersCount }
  } catch (e) {
    console.error('[HOME_COUNTERS]', e)
    // Fallback: 0 donors and members on error
    return { ...base, donors: 0, members: 0 }
  }
}
