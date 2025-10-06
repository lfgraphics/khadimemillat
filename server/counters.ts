import connectDB from '@/lib/db'
import CampaignDonation from '@/models/CampaignDonation'

export type HomeCounters = {
  itemsCollected: number
  familiesHelped: number
  activeVolunteers: number
  citiesServed: number
  donors: number
}

/**
 * Returns homepage counters. Four are static for now; donors is dynamic.
 */
export async function getHomeCounters(): Promise<HomeCounters> {
  // Static counters (to be made dynamic later)
  const base: Omit<HomeCounters, 'donors'> = {
    itemsCollected: 25847,
    familiesHelped: 1250,
    activeVolunteers: 187,
    citiesServed: 12,
  }

  try {
    await connectDB()
    const donations = await CampaignDonation.find({ status: 'completed' })
      .select('donorId donorEmail donorName')
      .lean()

    const unique = new Set<string>()
    for (const d of donations) {
      const key = (d as any).donorId || (d as any).donorEmail || (d as any).donorName
      if (key) unique.add(key)
    }
    return { ...base, donors: unique.size }
  } catch (e) {
    console.error('[HOME_COUNTERS]', e)
    // Fallback: 0 donors on error
    return { ...base, donors: 0 }
  }
}
