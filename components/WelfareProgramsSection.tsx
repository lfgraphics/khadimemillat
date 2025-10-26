import { getWelfarePrograms, getTotalWelfareProgramsCount } from '@/server/welfare-programs'
import WelfareProgramsClient from './WelfareProgramsClient'

export default async function WelfareProgramsSection() {
  const initialLimit = 3
  const [initialPrograms, totalCount] = await Promise.all([
    getWelfarePrograms(true, initialLimit, 0),
    getTotalWelfareProgramsCount()
  ])

  return (
    <WelfareProgramsClient 
      initialPrograms={initialPrograms}
      totalCount={totalCount}
      initialLimit={initialLimit}
    />
  )
}