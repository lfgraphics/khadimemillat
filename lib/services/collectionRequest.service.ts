import connectDB from '../db'
import CollectionRequest, { ICollectionRequest } from '@/models/CollectionRequest'
import { Types } from 'mongoose'
import { notificationService } from './notification.service'
import DonationEntry from '@/models/DonationEntry'
import { clerkClient } from '@clerk/nextjs/server'

// Interface for admin-created request data
interface CreateRequestForUserData {
  userId: string // Clerk ID of the user for whom the request is being created
  pickupTime: Date
  address: string
  phone: string
  items?: string
  notes?: string
  createdBy: string // Admin's Clerk ID for audit trail
}

// Interface for the created request response
interface CreatedRequest {
  id: string
  userId: string
  userName: string
  userAddress: string
  userPhone: string
  pickupTime: Date
  status: 'verified'
  items?: string
  notes?: string
  scrapperNotificationsSent: number
  createdBy: string
  createdAt: Date
}

async function getClerkClient() {
  return typeof clerkClient === 'function' ? await (clerkClient as any)() : clerkClient
}

/**
 * Creates a verified collection request on behalf of a user (admin/moderator use)
 * Automatically assigns all scrappers and sends notifications
 */
export async function createVerifiedRequestForUser(data: CreateRequestForUserData): Promise<CreatedRequest> {
  try {
    await connectDB()
    
    // Get user information from Clerk for audit and notification purposes
    const client: any = await getClerkClient()
    let userName = 'Unknown User'
    
    try {
      const user = await client.users.getUser(data.userId)
      userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.emailAddresses[0]?.emailAddress || 'Unknown User'
    } catch (userError) {
      console.error('[createVerifiedRequestForUser] Failed to fetch user details:', userError)
      // Continue with request creation even if user details fetch fails
    }

    // Prepare collection request data with audit trail
    const requestData: Partial<ICollectionRequest> = {
      donor: data.userId,
      requestedPickupTime: data.pickupTime,
      address: data.address,
      phone: data.phone,
      notes: data.items ? `Items: ${data.items}${data.notes ? `\n\nNotes: ${data.notes}` : ''}` : data.notes,
      status: 'verified', // Admin-created requests are automatically verified
      assignedScrappers: [], // Will be populated with all scrappers
      // Add audit trail in notes if not already present
      ...(data.notes?.includes('Created by admin') ? {} : {
        notes: `${data.items ? `Items: ${data.items}` : ''}${data.notes ? `${data.items ? '\n\n' : ''}Notes: ${data.notes}` : ''}${data.items || data.notes ? '\n\n' : ''}Created by admin: ${data.createdBy}`
      })
    }

    // Get all scrappers for assignment
    let allScrappers: any[] = []
    try {
      allScrappers = await getAllScrappers()
      requestData.assignedScrappers = allScrappers.map((s: any) => s.id)
    } catch (scrapperError) {
      console.error('[createVerifiedRequestForUser] Failed to fetch scrappers:', scrapperError)
      // Continue without scrapper assignment - can be done later
    }

    // Create the collection request
    const doc = await CollectionRequest.create(requestData)
    const createdRequest = doc.toObject()

    // Send notifications to scrappers
    let notificationsSent = 0
    if (allScrappers.length > 0) {
      try {
        const formattedPickupTime = new Intl.DateTimeFormat('en-US', {
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }).format(data.pickupTime)

        await notificationService.notifyUsers(allScrappers.map((s: any) => s.id), {
          title: 'New Verified Collection Request',
          body: `${userName} - ${formattedPickupTime} at ${data.address}. Phone: ${data.phone}${data.items ? `. Items: ${data.items}` : ''}`,
          url: '/scrapper/assigned',
          type: 'collection_assigned'
        })
        
        notificationsSent = allScrappers.length
        console.log(`[createVerifiedRequestForUser] Sent notifications to ${notificationsSent} scrappers for request ${createdRequest._id}`)
      } catch (notificationError) {
        console.error('[createVerifiedRequestForUser] Failed to send scrapper notifications:', notificationError)
        // Don't fail the request creation if notifications fail
      }
    }

    // Return formatted response
    const response: CreatedRequest = {
      id: createdRequest._id.toString(),
      userId: data.userId,
      userName,
      userAddress: data.address,
      userPhone: data.phone,
      pickupTime: data.pickupTime,
      status: 'verified',
      items: data.items,
      notes: data.notes,
      scrapperNotificationsSent: notificationsSent,
      createdBy: data.createdBy,
      createdAt: createdRequest.createdAt
    }

    console.log(`[createVerifiedRequestForUser] Successfully created verified request ${response.id} for user ${data.userId} by admin ${data.createdBy}`)
    return response

  } catch (error: any) {
    console.error('[createVerifiedRequestForUser] Error creating verified request:', error)
    
    // Provide specific error messages based on error type
    if (error instanceof Error) {
      if (error.message.includes('validation')) {
        throw new Error('Invalid request data provided. Please check all required fields.')
      }
      if (error.message.includes('duplicate')) {
        throw new Error('A similar collection request already exists for this user and time.')
      }
      if (error.message.includes('connection') || error.message.includes('timeout')) {
        throw new Error('Database connection failed. Please try again in a few moments.')
      }
      if (error.message.includes('network')) {
        throw new Error('Network error occurred. Please check your connection and try again.')
      }
    }
    
    // Handle MongoDB specific errors
    if (error.code === 11000) {
      throw new Error('A similar collection request already exists for this user and time.')
    }
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message).join(', ')
      throw new Error(`Validation failed: ${validationErrors}`)
    }
    
    if (error.name === 'MongoTimeoutError' || error.name === 'MongoNetworkTimeoutError') {
      throw new Error('Database connection timed out. Please try again in a few moments.')
    }
    
    if (error.name === 'MongoServerError') {
      throw new Error('Database server error. Please try again in a few moments.')
    }
    
    // Generic fallback
    throw new Error('Service temporarily unavailable. Please try again.')
  }
}

export async function getAllScrappers() {
  const client: any = await getClerkClient()
  const users = await client.users.getUserList({ limit: 500 })
  return users.data.filter((u: any) => u.publicMetadata?.role === 'scrapper')
}

export async function getUsersByRole(role: string) {
  const client: any = await getClerkClient()
  const users = await client.users.getUserList({ limit: 500 })
  return users.data.filter((u: any) => u.publicMetadata?.role === role)
}

export async function createCollectionRequest(data: Partial<ICollectionRequest>) {
  await connectDB()
  const doc = await CollectionRequest.create(data)
  // Notify admins/moderators new request
  await notificationService.notifyByRole(['admin','moderator'], {
    title: 'New Collection Request',
    body: 'A new collection request needs verification.',
    url: `/admin/verify-requests`,
    type: 'collection_request'
  })
  return doc.toObject()
}

export async function listCollectionRequests({ status, assignedTo, page = 1, limit = 20 }: { status?: string, assignedTo?: string, page?: number, limit?: number } = {}) {
  await connectDB()
  const query: any = {}
  if (status) query.status = status
  if (assignedTo) query.assignedScrappers = assignedTo
  const skip = (page - 1) * limit
  const [items, total] = await Promise.all([
    CollectionRequest.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    CollectionRequest.countDocuments(query)
  ])
  return { items, total, page, limit }
}

export async function getCollectionRequestById(id: string) {
  await connectDB()
  if (!Types.ObjectId.isValid(id)) return null
  return CollectionRequest.findById(id).lean()
}

export async function updateCollectionRequest(id: string, data: Partial<ICollectionRequest>) {
  await connectDB()
  if (!Types.ObjectId.isValid(id)) throw new Error('Invalid id')
  return CollectionRequest.findByIdAndUpdate(id, data, { new: true }).lean()
}

export async function assignScrappers(id: string, scrapperIds?: string[]) {
  await connectDB()
  if (!Types.ObjectId.isValid(id)) throw new Error('Invalid id')

  let targetIds = scrapperIds
  if (!targetIds || targetIds.length === 0) {
    const allScrappers = await getAllScrappers()
    targetIds = allScrappers.map((s: any) => s.id)
  }

  const doc = await CollectionRequest.findByIdAndUpdate(
    id,
    { assignedScrappers: targetIds, status: 'verified' },
    { new: true }
  ).lean()

  if (doc && targetIds) {
    await notificationService.notifyUsers(targetIds, {
      title: 'Collection Assigned',
      body: 'You have a new collection assignment.',
      url: '/scrapper/assigned',
      type: 'collection_assigned'
    })
  }
  return doc
}

export async function markAsCollected(id: string, { actualPickupTime = new Date(), collectedBy }: { actualPickupTime?: Date, collectedBy?: string } = {}) {
  await connectDB()
  if (!Types.ObjectId.isValid(id)) throw new Error('Invalid id')
  // Fetch existing collection request
  const existing = await CollectionRequest.findById(id).lean()
  if (!existing) throw new Error('Collection request not found')
  // Idempotent: reuse existing donation entry if present
  let donationEntry = await DonationEntry.findOne({ collectionRequest: id }).lean()
  if (!donationEntry) {
    donationEntry = (await DonationEntry.create({
      donor: (existing as any).donor,
      collectionRequest: id,
      status: 'collected',
      collectedBy,
      requestedPickupTime: (existing as any).requestedPickupTime,
      actualPickupTime
    } as any)).toObject()
  }

  // Update collection request with link
  const updated = await CollectionRequest.findByIdAndUpdate(
    id,
    { status: 'collected', actualPickupTime, donationEntryId: (donationEntry as any)._id },
    { new: true }
  ).lean()

  if (updated) {
    // Notification moved to donation-entries/full API after items are actually listed
    return { ...updated, donationEntryId: (donationEntry as any)._id }
  }
  return updated
}

export const collectionRequestService = {
  createCollectionRequest,
  createVerifiedRequestForUser,
  listCollectionRequests,
  getCollectionRequestById,
  updateCollectionRequest,
  assignScrappers,
  markAsCollected,
  getAllScrappers,
  getUsersByRole
}
