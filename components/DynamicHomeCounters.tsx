import Link from 'next/link'
import { AnimatedStatsSection } from '@/components/animations'
import { getHomeCounters } from '@/server/counters'

export default async function DynamicHomeCounters() {
  const counters = await getHomeCounters()

  return (
    <AnimatedStatsSection
      stats={[
        { number: counters.itemsCollected, label: 'Items Collected', testId: 'stat-items-collected', href: '/list-donation' },
        { number: counters.familiesHelped, label: 'Families Helped', testId: 'stat-families-helped', href: '/welfare-programs' },
        { number: counters.activeVolunteers, label: 'Active Volunteers', testId: 'stat-volunteers', href: '/about#volunteers' },
        { number: counters.citiesServed, label: 'Cities Served', testId: 'stat-cities', href: '/about#locations' },
        { number: counters.donors, label: 'Our Members', testId: 'stat-donors', href: '/donors' },
      ]}
      threshold={0.3}
      triggerOnce={true}
      counterDuration={2.0}
      simultaneousStart={true}
      enableEntranceAnimations={true}
      staggerDelay={0.15}
    />
  )
}
