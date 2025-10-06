import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import connectDB from "@/lib/db"
import User from "@/models/User"
import UserPreferences from "@/models/UserPreferences"
import { audiencePreviewSchema } from "@/lib/validators/audience.validator"
import { ZodError } from "zod"

// POST /api/admin/notifications/audience/preview - Calculate audience size for targeting criteria
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    // Check if user is admin or moderator
    const user = await User.findOne({ clerkUserId: userId })
    if (!user || !['admin', 'moderator'].includes(user.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    const body = await request.json()
    const { criteria, channels, excludeOptedOut } = audiencePreviewSchema.parse(body)

    // Build MongoDB query based on criteria
    const query: any = {}
    
    // Handle roles
    if (criteria.roles.includes('everyone')) {
      // No role filter needed for 'everyone'
    } else {
      query.role = { $in: criteria.roles }
    }
    
    // Handle locations
    if (criteria.locations && criteria.locations.length > 0) {
      if (criteria.logic === 'OR' && !criteria.roles.includes('everyone')) {
        // For OR logic with locations and roles
        query.$or = [
          { role: { $in: criteria.roles } },
          { location: { $in: criteria.locations } }
        ]
        delete query.role
      } else {
        // For AND logic or when 'everyone' is included
        query.location = { $in: criteria.locations }
      }
    }
    
    // Handle activity status
    if (criteria.activityStatus) {
      const now = new Date()
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      
      switch (criteria.activityStatus) {
        case 'active':
          query.lastLoginAt = { $gte: thirtyDaysAgo }
          break
        case 'inactive':
          query.$or = query.$or ? [
            ...query.$or,
            { lastLoginAt: { $lt: thirtyDaysAgo } },
            { lastLoginAt: { $exists: false } }
          ] : [
            { lastLoginAt: { $lt: thirtyDaysAgo } },
            { lastLoginAt: { $exists: false } }
          ]
          break
        case 'new':
          query.createdAt = { $gte: sevenDaysAgo }
          break
      }
    }
    
    // Handle custom filters
    if (criteria.customFilters) {
      Object.assign(query, criteria.customFilters)
    }

    // Get total matching users
    const totalUsers = await User.countDocuments(query)
    
    // Calculate channel-specific audience sizes if channels are specified
    let channelBreakdown: any = {}
    let effectiveAudience = totalUsers

    if (channels && channels.length > 0) {
      // Get users with their preferences
      const usersWithPrefs = await User.aggregate([
        { $match: query },
        {
          $lookup: {
            from: 'userpreferences',
            localField: 'clerkUserId',
            foreignField: 'userId',
            as: 'preferences'
          }
        },
        {
          $project: {
            clerkUserId: 1,
            email: 1,
            phone: 1,
            role: 1,
            location: 1,
            preferences: { $arrayElemAt: ['$preferences', 0] }
          }
        }
      ])

      // Calculate channel-specific counts
      for (const channel of channels) {
        let channelCount = 0
        
        for (const user of usersWithPrefs) {
          let canReceive = true
          
          // Check if user has the required contact method
          switch (channel) {
            case 'email':
              canReceive = !!user.email
              break
            case 'sms':
            case 'whatsapp':
              canReceive = !!user.phone
              break
            case 'web_push':
              // For web push, we assume all users can receive (they need to be logged in)
              canReceive = true
              break
          }
          
          // Check user preferences if excludeOptedOut is true
          if (canReceive && excludeOptedOut && user.preferences) {
            const channelEnabled = user.preferences.channels?.[channel === 'web_push' ? 'webPush' : channel]
            canReceive = channelEnabled !== false // Default to true if not set
          }
          
          if (canReceive) {
            channelCount++
          }
        }
        
        channelBreakdown[channel] = channelCount
      }
      
      // Calculate effective audience (users who can receive at least one channel)
      const usersWithAtLeastOneChannel = new Set()
      
      for (const user of usersWithPrefs) {
        for (const channel of channels) {
          let canReceive = true
          
          // Check contact method
          switch (channel) {
            case 'email':
              canReceive = !!user.email
              break
            case 'sms':
            case 'whatsapp':
              canReceive = !!user.phone
              break
            case 'web_push':
              canReceive = true
              break
          }
          
          // Check preferences
          if (canReceive && excludeOptedOut && user.preferences) {
            const channelEnabled = user.preferences.channels?.[channel === 'web_push' ? 'webPush' : channel]
            canReceive = channelEnabled !== false
          }
          
          if (canReceive) {
            usersWithAtLeastOneChannel.add(user.clerkUserId)
            break // User can receive at least one channel, no need to check others
          }
        }
      }
      
      effectiveAudience = usersWithAtLeastOneChannel.size
    }

    // Get sample users for preview (first 5)
    const sampleUsers = await User.find(query)
      .select('clerkUserId email phone role location createdAt lastLoginAt')
      .limit(5)
      .lean()

    // Calculate demographics breakdown
    const demographics = await User.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          roleBreakdown: {
            $push: {
              role: '$role',
              count: 1
            }
          },
          locationBreakdown: {
            $push: {
              location: '$location',
              count: 1
            }
          },
          totalWithEmail: {
            $sum: { $cond: [{ $ne: ['$email', null] }, 1, 0] }
          },
          totalWithPhone: {
            $sum: { $cond: [{ $ne: ['$phone', null] }, 1, 0] }
          }
        }
      }
    ])

    // Process demographics data
    let roleStats: any = {}
    let locationStats: any = {}
    
    if (demographics.length > 0) {
      // Count roles
      demographics[0].roleBreakdown.forEach((item: any) => {
        roleStats[item.role] = (roleStats[item.role] || 0) + 1
      })
      
      // Count locations (only top 10)
      demographics[0].locationBreakdown.forEach((item: any) => {
        if (item.location) {
          locationStats[item.location] = (locationStats[item.location] || 0) + 1
        }
      })
      
      // Sort and limit locations
      const sortedLocations = Object.entries(locationStats)
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, 10)
      
      locationStats = Object.fromEntries(sortedLocations)
    }

    return NextResponse.json({
      success: true,
      data: {
        totalUsers,
        effectiveAudience,
        channelBreakdown,
        demographics: {
          roles: roleStats,
          locations: locationStats,
          contactMethods: {
            email: demographics[0]?.totalWithEmail || 0,
            phone: demographics[0]?.totalWithPhone || 0
          }
        },
        sampleUsers: sampleUsers.map(user => ({
          id: user.clerkUserId,
          email: user.email ? `${user.email.substring(0, 3)}***@${user.email.split('@')[1]}` : null,
          phone: user.phone ? `***${user.phone.slice(-4)}` : null,
          role: user.role,
          location: user.location,
          lastActive: user.lastLoginAt
        })),
        criteria,
        excludeOptedOut,
        channels
      }
    })

  } catch (error) {
    console.error("Error calculating audience preview:", error)
    
    if (error instanceof ZodError) {
      return NextResponse.json({
        error: "Invalid audience criteria",
        details: error.issues
      }, { status: 400 })
    }

    return NextResponse.json(
      { error: "Failed to calculate audience preview" },
      { status: 500 }
    )
  }
}