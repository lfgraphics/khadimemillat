import connectDB from '@/lib/db'
import User from '@/models/User'

export interface SyncUserToMongoDB {
  clerkUserId: string
  name: string
  email?: string
  phone: string
  address?: string
  role: string
}

/**
 * Synchronizes a newly created Clerk user with MongoDB
 * This function handles sync failures gracefully without blocking user creation
 */
export async function syncNewUserToMongoDB(userData: SyncUserToMongoDB): Promise<boolean> {
  try {
    await connectDB()

    // Check if user already exists in MongoDB
    const existingUser = await User.findOne({ clerkUserId: userData.clerkUserId })
    
    if (existingUser) {
      console.warn('[USER_SYNC] User already exists in MongoDB:', userData.clerkUserId)
      
      // Update existing user with latest data and sync timestamp
      await User.updateOne(
        { clerkUserId: userData.clerkUserId },
        {
          $set: {
            name: userData.name,
            email: userData.email,
            role: userData.role,
            lastSyncedFromClerkAt: new Date()
          }
        }
      )
      
      return true
    }

    // Create new user in MongoDB
    const newUser = new User({
      clerkUserId: userData.clerkUserId,
      name: userData.name,
      email: userData.email,
      role: userData.role,
      lastSyncedFromClerkAt: new Date()
      // Note: phone and address are intentionally omitted as they're stored in Clerk
      // This follows the Clerk-first architecture where Clerk is authoritative for PII
    })

    await newUser.save()
    console.log('[USER_SYNC] Successfully synced new user to MongoDB:', userData.clerkUserId)
    
    return true
  } catch (error: any) {
    console.error('[USER_SYNC_FAILED] Failed to sync user to MongoDB:', {
      clerkUserId: userData.clerkUserId,
      error: error.message,
      stack: error.stack
    })
    
    // Return false to indicate sync failure, but don't throw
    // This allows user creation to succeed even if MongoDB sync fails
    return false
  }
}

/**
 * Retry sync for users that failed to sync initially
 * This can be called periodically or manually to catch up on failed syncs
 */
export async function retrySyncFailedUsers(): Promise<void> {
  try {
    await connectDB()
    
    // Find users in MongoDB that haven't been synced recently (older than 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const usersNeedingSync = await User.find({
      $or: [
        { lastSyncedFromClerkAt: { $exists: false } },
        { lastSyncedFromClerkAt: { $lt: oneHourAgo } }
      ]
    }).select('clerkUserId name email role').lean()

    console.log(`[USER_SYNC_RETRY] Found ${usersNeedingSync.length} users needing sync retry`)

    // Update sync timestamps for these users
    const clerkUserIds = usersNeedingSync.map(u => u.clerkUserId)
    if (clerkUserIds.length > 0) {
      await User.updateMany(
        { clerkUserId: { $in: clerkUserIds } },
        { $set: { lastSyncedFromClerkAt: new Date() } }
      )
    }

  } catch (error: any) {
    console.error('[USER_SYNC_RETRY_FAILED]', error)
  }
}

/**
 * Get sync status for a user
 */
export async function getUserSyncStatus(clerkUserId: string): Promise<{
  isSynced: boolean
  lastSyncedAt?: Date
  mongoUserId?: string
}> {
  try {
    await connectDB()
    
    const mongoUser = await User.findOne({ clerkUserId }).select('_id lastSyncedFromClerkAt').lean()
    
    return {
      isSynced: !!mongoUser,
      lastSyncedAt: mongoUser ? (mongoUser as any).lastSyncedFromClerkAt : undefined,
      mongoUserId: mongoUser ? (mongoUser as any)._id?.toString() : undefined
    }
  } catch (error: any) {
    console.error('[USER_SYNC_STATUS_FAILED]', error)
    return {
      isSynced: false
    }
  }
}

export const userSyncService = {
  syncNewUserToMongoDB,
  retrySyncFailedUsers,
  getUserSyncStatus
}