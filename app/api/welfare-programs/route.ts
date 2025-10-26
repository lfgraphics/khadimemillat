import { NextRequest, NextResponse } from 'next/server'
import { getWelfarePrograms } from '@/server/welfare-programs'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '0') || undefined
    const skip = parseInt(searchParams.get('skip') || '0') || undefined
    const includeStats = searchParams.get('includeStats') === 'true'

    const programs = await getWelfarePrograms(includeStats, limit, skip)
    
    return NextResponse.json(programs)
  } catch (error) {
    console.error('Error fetching welfare programs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch welfare programs' },
      { status: 500 }
    )
  }
}