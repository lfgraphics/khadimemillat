import { NextRequest, NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import connectDB from '@/lib/db'
import User from '@/models/User'
import { enrichClerkUsersWithMongoData, getClerkUserWithSupplementaryData } from '@/lib/services/user.service'
import { createUserRobust } from '@/lib/services/user-create.service'

// GET: Clerk-first user listing with optional search/role filtering and proper pagination
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

    // For self requests, return single user without pagination
    if (self) {
      if (!userId) return NextResponse.json({ 
        users: [], 
        pagination: { page: 1, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false }
      })
      
      try {
        await getClerkUserWithSupplementaryData(userId)
      } catch (e) {
        console.warn('[USERS_SELF_UPSERT_FAILED]', e)
      }
      
      const me = await client.users.getUser(userId)
      const includePII = true // Always include PII for self
      const enriched = await enrichClerkUsersWithMongoData([me], { includePII })
      
      await connectDB()
      const mongoUser = await User.findOne({ clerkUserId: userId }).select('_id').lean()
      const withMongo = enriched.map(u => ({ 
        ...u, 
        clerkUserId: u.id, 
        mongoUserId: mongoUser ? (mongoUser as any)._id?.toString() : undefined
      }))
      
      return NextResponse.json({ 
        users: withMongo,
        pagination: { page: 1, limit, total: 1, totalPages: 1, hasNext: false, hasPrev: false }
      })
    }

    // Broad listing requires admin/moderator
    if (!['admin', 'moderator', 'field_executive'].includes(callerRole)) {
      console.warn('[USERS_LIST_GATED] caller lacks role for broad listing; require search or self=1')
      return NextResponse.json({ 
        users: [],
        pagination: { page, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false }
      }, { status: 403 })
    }

    // Get total count first for proper pagination
    let totalCount = 0
    let allUsers: any[] = []
    
    try {
      if (q) {
        // For search queries, we need to get all matching users to calculate total
        const searchRes = await client.users.getUserList({ query: q, limit: 500 })
        allUsers = searchRes.data
        
        // Apply role filter if specified
        if (role) {
          allUsers = allUsers.filter(u => u.publicMetadata?.role === role)
        }
        
        totalCount = allUsers.length
        
        // Apply pagination to search results
        allUsers = allUsers.slice(offset, offset + limit)
      } else {
        // For non-search queries, get total count and paginated results
        const countRes = await client.users.getUserList({ limit: 1 })
        totalCount = countRes.totalCount || 0
        
        // Get paginated users
        const res = await client.users.getUserList({ limit, offset })
        allUsers = res.data
        
        // Apply role filter if specified
        if (role) {
          allUsers = allUsers.filter(u => u.publicMetadata?.role === role)
          // Note: Role filtering after pagination may result in fewer results than requested
          // This is a limitation of Clerk's API - ideally role filtering would be done server-side
        }
      }
    } catch (e) {
      console.warn('[CLERK_USER_LIST_FAILED]', e)
      allUsers = []
      totalCount = 0
    }

    // Determine PII exposure
    const includePII = includePIIRequested && ['admin', 'moderator'].includes(callerRole)
    if (!includePII && includePIIRequested) {
      console.warn('[USERS_PII_FLAG_IGNORED] caller not privileged; omitting phone/address')
    }

    // Enrich with Clerk-first data (phone/address gated via privateMetadata)
    const enriched = await enrichClerkUsersWithMongoData(allUsers, { includePII })
    
    // Attach mongo _id (mongoUserId) where available for backward compatibility
    await connectDB()
    const clerkIds = enriched.map(u => u.id)
    const mongoUsers = await User.find({ clerkUserId: { $in: clerkIds } }).select('_id clerkUserId').lean()
    const mongoMap = new Map(mongoUsers.map((m: any) => [m.clerkUserId, m._id.toString()]))
    const withMongo = enriched.map(u => ({ ...u, clerkUserId: u.id, mongoUserId: mongoMap.get(u.id) }))

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit)
    const hasNext = page < totalPages
    const hasPrev = page > 1

    const pagination = {
      page,
      limit,
      total: totalCount,
      totalPages,
      hasNext,
      hasPrev
    }

    return NextResponse.json({ 
      users: withMongo, 
      pagination 
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST: Create new user in Clerk with automatic username generation
export async function POST(req: NextRequest) {
  try {
    const { userId, sessionClaims } = await auth()
    const callerRole = (sessionClaims as any)?.metadata?.role || 'user'
    if (!['admin'].includes(callerRole)) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Only admins can create users' }, { status: 403 })
    }

    const body = await req.json()
    const { firstName, lastName, name, email, phone, address, role = 'user', skipPassword = true } = body

    // Basic validation
    if (!phone || (!firstName && !name)) {
      return NextResponse.json({ success: false, error: 'Missing required fields: phone and (firstName or name) are required' }, { status: 400 })
    }

    // Create via shared service
    const created = await createUserRobust({
      firstName: firstName || (name ? name.split(' ')[0] : ''),
      lastName: lastName || (name ? name.split(' ').slice(1).join(' ') || 'User' : 'User'),
      phone,
      email,
      role,
      address,
      skipPassword, // Admins can choose to create with or without password
      notifyChannels: { email: !!email, whatsapp: true, sms: false }
    })

    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      user: {
        id: created.clerkUserId,
        phoneNumber: created.phoneNumber,
        firstName: firstName || (name ? name.split(' ')[0] : ''),
        lastName: lastName || (name ? name.split(' ').slice(1).join(' ') || 'User' : 'User'),
        email: email || undefined,
        username: created.username,
        password: created.password
      }
    })
  } catch (error: any) {
    console.error('[USER_CREATION_ERROR]', error)
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 })
  }
}
