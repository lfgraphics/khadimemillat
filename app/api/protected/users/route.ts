import { NextRequest, NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
import connectDB from '@/lib/db'
import User from '@/models/User'
import { enrichClerkUsersWithMongoData } from '@/lib/services/user.service'

// GET: Clerk-first user listing with optional search/role filtering
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('search') || ''
    const role = searchParams.get('role')
    const client: any = typeof clerkClient === 'function' ? await (clerkClient as any)() : clerkClient

    // Clerk search (query limited by Clerk API; fallback to listing and filtering)
    let clerkUsers: any[] = []
    try {
      if (q) {
        const res = await client.users.getUserList({ query: q, limit: 100 })
        clerkUsers = res.data
      } else {
        const res = await client.users.getUserList({ limit: 200 })
        clerkUsers = res.data
      }
    } catch (e) {
      console.warn('[CLERK_USER_LIST_FAILED]', e)
      clerkUsers = []
    }

    if (role) {
      clerkUsers = clerkUsers.filter(u => u.publicMetadata?.role === role)
    }

    // Enrich with supplementary Mongo data (phone, address)
  const enriched = await enrichClerkUsersWithMongoData(clerkUsers)
  // Attach mongo _id (mongoUserId) where available for front-end resolution avoidance
  const clerkIds = enriched.map(u => u.id)
  const mongoUsers = await User.find({ clerkUserId: { $in: clerkIds } }).select('_id clerkUserId').lean()
  const mongoMap = new Map(mongoUsers.map((m: any) => [m.clerkUserId, m._id.toString()]))
  const withMongo = enriched.map(u => ({ ...u, mongoUserId: mongoMap.get(u.id) }))
    // Optional client-side search fallback if Clerk query missed fields
    const lowered = q.toLowerCase()
    const filtered = q ? withMongo.filter(u => (
      (u.name && u.name.toLowerCase().includes(lowered)) ||
      (u.email && u.email.toLowerCase().includes(lowered)) ||
      u.id.toLowerCase().includes(lowered)
    )) : withMongo
    return NextResponse.json({ users: filtered })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST unchanged for now (keeping quick create logic is out of new scope unless specified)
export async function POST() {
  return NextResponse.json({ error: 'Direct user creation disabled under Clerk-first architecture.' }, { status: 403 })
}
