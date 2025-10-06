import { NextResponse } from 'next/server'
import { getHomeCounters } from '@/server/counters'

export async function GET() {
  try {
    const counters = await getHomeCounters()
    return NextResponse.json(counters)
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch counters' }, { status: 500 })
  }
}
