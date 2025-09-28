import { NextRequest, NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import connectDB from '@/lib/db'
import User from '@/models/User'
import { enrichClerkUsersWithMongoData, getClerkUserWithSupplementaryData } from '@/lib/services/user.service'

// GET: Clerk-first user listing with optional search/role filtering
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const self = searchParams.get('self') === '1' || searchParams.get('self') === 'true'
    const q = searchParams.get('search') || ''
    const role = searchParams.get('role')
    const includePIIRequested = searchParams.get('includePII') === '1' || searchParams.get('includePII') === 'true'
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const requestedLimit = Math.max(1, parseInt(searchParams.get('limit') || '20', 10))
    const limit = Math.min(50, requestedLimit)
    const offset = (page - 1) * limit

    const { userId, sessionClaims } = await auth()
    const callerRole = (sessionClaims as any)?.metadata?.role || 'user'
    const client: any = typeof clerkClient === 'function' ? await (clerkClient as any)() : clerkClient

    // Clerk search (query limited by Clerk API; fallback to listing and filtering)
    let clerkUsers: any[] = []
    try {
      if (self) {
        if (!userId) return NextResponse.json({ users: [] })
        // Ensure a stable mongoUserId by upserting the Mongo cache record for the current user
        try {
          await getClerkUserWithSupplementaryData(userId)
        } catch (e) {
          console.warn('[USERS_SELF_UPSERT_FAILED]', e)
        }
        const me = await client.users.getUser(userId)
        clerkUsers = [me]
      } else if (q) {
        const res = await client.users.getUserList({ query: q, limit: limit })
        clerkUsers = res.data
      } else {
        // Broad listing requires admin/moderator
        if (!['admin', 'moderator', 'scrapper'].includes(callerRole)) {
          console.warn('[USERS_LIST_GATED] caller lacks role for broad listing; require search or self=1')
          return NextResponse.json({ users: [] }, { status: 403 })
        }
        const res = await client.users.getUserList({ limit: limit, offset })
        clerkUsers = res.data
      }
    } catch (e) {
      console.warn('[CLERK_USER_LIST_FAILED]', e)
      clerkUsers = []
    }

    if (role) {
      clerkUsers = clerkUsers.filter(u => u.publicMetadata?.role === role)
    }

    // Determine PII exposure
    const includePII = self || (includePIIRequested && ['admin', 'moderator'].includes(callerRole))
    if (!includePII && includePIIRequested) {
      console.warn('[USERS_PII_FLAG_IGNORED] caller not privileged; omitting phone/address')
    }
    // Enrich with Clerk-first data (phone/address gated via privateMetadata)
    const enriched = await enrichClerkUsersWithMongoData(clerkUsers, { includePII })
    // Attach mongo _id (mongoUserId) where available for backward compatibility
    await connectDB()
    const clerkIds = enriched.map(u => u.id)
    const mongoUsers = await User.find({ clerkUserId: { $in: clerkIds } }).select('_id clerkUserId').lean()
    const mongoMap = new Map(mongoUsers.map((m: any) => [m.clerkUserId, m._id.toString()]))
    const withMongo = enriched.map(u => ({ ...u, clerkUserId: u.id, mongoUserId: mongoMap.get(u.id) }))
    // Optional client-side search fallback if Clerk query missed fields
    const lowered = q.toLowerCase()
    const filtered = q ? withMongo.filter(u => (
      (u.name && u.name.toLowerCase().includes(lowered)) ||
      (u.email && u.email.toLowerCase().includes(lowered)) ||
      u.id.toLowerCase().includes(lowered)
    )) : withMongo
    return NextResponse.json({ users: filtered, page, limit, total: filtered.length })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST unchanged for now (keeping quick create logic is out of new scope unless specified)
export async function POST() {
  return NextResponse.json({ error: 'Direct user creation disabled under Clerk-first architecture.' }, { status: 403 })
}
