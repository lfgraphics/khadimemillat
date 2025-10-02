import { NextRequest, NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import connectDB from '@/lib/db'
import User from '@/models/User'
import { enrichClerkUsersWithMongoData, getClerkUserWithSupplementaryData } from '@/lib/services/user.service'

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
    if (!['admin', 'moderator', 'scrapper'].includes(callerRole)) {
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

    // Only admins can create users
    if (!['admin'].includes(callerRole)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized: Only admins can create users' 
      }, { status: 403 })
    }

    const body = await req.json()
    const { name, email, phone, address, role = 'user' } = body

    // Validate required fields
    if (!name || !email || !phone) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: name, email, and phone are required'
      }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid email format'
      }, { status: 400 })
    }

    // Validate phone format (basic validation)
    const phoneDigits = phone.replace(/\D/g, '')
    if (phoneDigits.length < 10) {
      return NextResponse.json({
        success: false,
        error: 'Phone number must contain at least 10 digits'
      }, { status: 400 })
    }

    // Validate role
    const validRoles = ['user', 'admin', 'moderator', 'scrapper']
    if (!validRoles.includes(role)) {
      return NextResponse.json({
        success: false,
        error: `Invalid role. Must be one of: ${validRoles.join(', ')}`
      }, { status: 400 })
    }

    // Initialize Clerk client properly
    let client: any
    try {
      client = typeof clerkClient === 'function' ? await (clerkClient as any)() : clerkClient
      if (!client || !client.users) {
        throw new Error('Clerk client not properly initialized')
      }
    } catch (error: any) {
      console.error('[CLERK_CLIENT_INIT_FAILED]', error)
      return NextResponse.json({
        success: false,
        error: 'Service temporarily unavailable'
      }, { status: 503 })
    }

    // Generate unique username and strong password
    const { generateUniqueUsername, sanitizeName, extractPhoneDigits, validateUsername, generateStrongPassword, validatePasswordStrength } = await import('@/lib/utils/username')
    
    let username: string
    let password: string
    try {
      const sanitizedName = sanitizeName(name)
      const phoneDigits = extractPhoneDigits(phone)
      username = await generateUniqueUsername({ name: sanitizedName, phone: phoneDigits })
      
      // Double-check username validation
      if (!validateUsername(username)) {
        throw new Error(`Generated username "${username}" does not meet Clerk requirements`)
      }
      
      // Generate strong password
      password = generateStrongPassword(sanitizedName)
      
      // Validate password strength
      if (!validatePasswordStrength(password)) {
        throw new Error('Generated password does not meet strength requirements')
      }
      
      console.log('[USERNAME_PASSWORD_GENERATED]', { 
        username, 
        sanitizedName, 
        phoneDigits: phoneDigits.slice(-4),
        passwordLength: password.length 
      })
    } catch (error: any) {
      console.error('[USERNAME_PASSWORD_GENERATION_FAILED]', error)
      return NextResponse.json({
        success: false,
        error: `Username/password generation failed: ${error.message}`
      }, { status: 400 })
    }

    // Parse name into first and last name
    const nameParts = name.trim().split(' ')
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || ''

    // Additional validation before sending to Clerk
    if (!firstName) {
      return NextResponse.json({
        success: false,
        error: 'First name is required'
      }, { status: 400 })
    }

    // Ensure email is properly formatted and not empty
    const trimmedEmail = email.trim().toLowerCase()
    if (!trimmedEmail) {
      return NextResponse.json({
        success: false,
        error: 'Email address is required'
      }, { status: 400 })
    }

    // Ensure phone is properly formatted
    const trimmedPhone = phone.trim()
    if (!trimmedPhone) {
      return NextResponse.json({
        success: false,
        error: 'Phone number is required'
      }, { status: 400 })
    }

    console.log('[USER_DATA_PREPARED]', {
      firstName,
      lastName,
      username,
      email: trimmedEmail,
      role,
      hasAddress: !!address
    })

    // Create user in Clerk
    let clerkUser: any
    try {
      const createUserPayload = {
        firstName,
        lastName,
        username,
        password,
        emailAddress: [trimmedEmail],
        publicMetadata: {
          role,
          ...(address && { address })
        },
        privateMetadata: {
          phone: trimmedPhone
        }
      }

      console.log('[USER_CREATION_PAYLOAD]', {
        ...createUserPayload,
        privateMetadata: { phone: '[REDACTED]' } // Don't log actual phone
      })

      clerkUser = await client.users.createUser(createUserPayload)
    } catch (error: any) {
      console.error('[USER_CREATION_FAILED]', {
        message: error.message,
        status: error.status,
        clerkTraceId: error.clerkTraceId,
        errors: error.errors
      })
      
      // Handle specific Clerk errors with detailed logging
      if (error.errors && Array.isArray(error.errors)) {
        console.error('[CLERK_VALIDATION_ERRORS]', error.errors)
        
        for (const clerkError of error.errors) {
          console.error('[CLERK_ERROR_DETAIL]', {
            code: clerkError.code,
            message: clerkError.message,
            longMessage: clerkError.longMessage,
            param: clerkError.param
          })

          // Handle specific error codes
          if (clerkError.code === 'form_identifier_exists') {
            return NextResponse.json({
              success: false,
              error: 'A user with this email address already exists'
            }, { status: 400 })
          }
          if (clerkError.code === 'form_username_exists') {
            return NextResponse.json({
              success: false,
              error: 'Username is already taken'
            }, { status: 400 })
          }
          if (clerkError.code === 'form_param_format_invalid') {
            return NextResponse.json({
              success: false,
              error: `Invalid format for ${clerkError.param}: ${clerkError.message}`
            }, { status: 400 })
          }
          if (clerkError.code === 'form_param_nil') {
            return NextResponse.json({
              success: false,
              error: `Missing required field: ${clerkError.param}`
            }, { status: 400 })
          }
        }

        // Generic validation error
        const firstError = error.errors[0]
        return NextResponse.json({
          success: false,
          error: `Validation error: ${firstError.message || firstError.longMessage || 'Invalid data provided'}`
        }, { status: 400 })
      }

      return NextResponse.json({
        success: false,
        error: `User creation failed: ${error.message || 'Unknown error'}`
      }, { status: 500 })
    }

    // Synchronize with MongoDB (non-blocking)
    const { syncNewUserToMongoDB } = await import('@/lib/services/user-sync.service')
    
    const syncData = {
      clerkUserId: clerkUser.id,
      name: `${firstName} ${lastName}`.trim(),
      email: trimmedEmail,
      phone: trimmedPhone,
      address,
      role
    }

    // Attempt MongoDB sync but don't block user creation if it fails
    const syncSuccess = await syncNewUserToMongoDB(syncData)
    if (!syncSuccess) {
      console.warn('[USER_CREATION] MongoDB sync failed for user:', clerkUser.id)
      // Continue with success response even if sync failed
    }

    // Prepare response data
    const createdUser = {
      id: clerkUser.id,
      name: `${firstName} ${lastName}`.trim(),
      email: trimmedEmail,
      username,
      password, // Include generated password in response
      phone: trimmedPhone,
      address: address || undefined,
      role
    }

    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      user: createdUser
    })

  } catch (error: any) {
    console.error('[USER_CREATION_ERROR]', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
