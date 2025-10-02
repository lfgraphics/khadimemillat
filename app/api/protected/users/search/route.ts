import { NextRequest, NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'

// GET: Search users for collection request creation (admin/moderator only)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const query = searchParams.get('q')?.trim()
    const requestedLimit = Math.max(1, parseInt(searchParams.get('limit') || '10', 10))
    const limit = Math.min(10, requestedLimit) // Cap at 10 for performance as per requirements

    const { userId, sessionClaims } = await auth()
    
    if (!userId) {
      return NextResponse.json({ 
        success: false,
        error: 'Authentication required. Please sign in and try again.',
        users: [],
        total: 0
      }, { status: 401 })
    }
    
    const callerRole = (sessionClaims as any)?.metadata?.role || 'user'

    // Role-based access control: admin/moderator only
    if (!['admin', 'moderator'].includes(callerRole)) {
      return NextResponse.json({ 
        success: false,
        error: 'Unauthorized: Only admins and moderators can search users for collection requests',
        users: [],
        total: 0
      }, { status: 403 })
    }

    // Require search query
    if (!query) {
      return NextResponse.json({
        success: true,
        users: [],
        total: 0,
        message: 'Please enter a search query'
      })
    }

    // Validate search query length
    if (query.length < 2) {
      return NextResponse.json({
        success: true,
        users: [],
        total: 0,
        message: 'Search query must be at least 2 characters'
      })
    }

    // Initialize Clerk client
    const client: any = typeof clerkClient === 'function' ? await (clerkClient as any)() : clerkClient

    let searchResults: any[] = []
    
    try {
      // Search users using Clerk's search functionality
      // This searches across name, email, and username fields
      const searchResponse = await client.users.getUserList({ 
        query: query,
        limit: 50 // Get more results to filter and then limit to 10
      })
      
      searchResults = searchResponse.data || []
    } catch (error: any) {
      console.error('[USER_SEARCH_FAILED]', error)
      
      // Provide specific error messages based on error type
      let errorMessage = 'Search temporarily unavailable, please try again';
      if (error.status === 429) {
        errorMessage = 'Too many search requests. Please wait a moment and try again.';
      } else if (error.status === 401 || error.status === 403) {
        errorMessage = 'Authentication failed. Please refresh the page and try again.';
      } else if (error.message?.includes('timeout')) {
        errorMessage = 'Search request timed out. Please try again.';
      } else if (error.message?.includes('network')) {
        errorMessage = 'Network error occurred. Please check your connection and try again.';
      }
      
      return NextResponse.json({
        success: false,
        error: errorMessage,
        users: [],
        total: 0
      }, { status: error.status || 500 })
    }

    // Transform results to include required fields
    const transformedResults = searchResults.slice(0, limit).map((user: any) => {
      const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || user.id
      const email = user.primaryEmailAddress?.emailAddress
      const phone = (user.privateMetadata as any)?.phone
      const address = (user.publicMetadata as any)?.address
      const username = user.username

      return {
        id: user.id, // Clerk ID
        name,
        email,
        phone,
        address,
        username
      }
    })

    return NextResponse.json({
      success: true,
      users: transformedResults,
      total: transformedResults.length,
      query: query
    })

  } catch (error: any) {
    console.error('[USER_SEARCH_ERROR]', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      users: [],
      total: 0
    }, { status: 500 })
  }
}