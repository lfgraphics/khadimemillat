import Link from 'next/link'
import { AnimatedStatsSection } from '@/components/animations'
import { getHomeCounters } from '@/server/counters'

export default async function DynamicHomeCounters() {
  const counters = await getHomeCounters()

  return (
    <AnimatedStatsSection
      stats={[
        { number: counters.familiesHelped, label: 'Families Helped', testId: 'stat-families-helped', href: '#' },
        { number: counters.activeVolunteers, label: 'Active Volunteers', testId: 'stat-volunteers', href: '/about#volunteers' },
        { number: counters.members, label: 'Verified Members', testId: 'stat-members', href: '/members' },
        { number: counters.donors, label: 'Our Donors', testId: 'stat-donors', href: '/donors' },
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
