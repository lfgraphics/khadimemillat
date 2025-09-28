import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import User from '@/models/User'
import { auth } from '@clerk/nextjs/server'
import { getClerkUserWithSupplementaryData } from '@/lib/services/user.service'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth()
    if (!userId) return new NextResponse('Unauthorized', { status: 401 })
    const { id } = await params
    // Ensure cache upsert via service (reads from Clerk, mirrors minimal fields to Mongo)
    await getClerkUserWithSupplementaryData(id)
    await connectDB()
    const existing: any = await User.findOne({ clerkUserId: id }).select('_id').lean()
  return NextResponse.json({ mongoUserId: existing?._id?.toString() })
  } catch (e: any) {
    console.error('[BY_CLERK_ID_ERROR]', e)
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
