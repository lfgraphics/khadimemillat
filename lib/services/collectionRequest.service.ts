import connectDB from '../db'
import CollectionRequest, { ICollectionRequest } from '@/models/CollectionRequest'
import { Types } from 'mongoose'
import { notificationService } from './notification.service'
import DonationEntry from '@/models/DonationEntry'
import { clerkClient } from '@clerk/nextjs/server'

async function getClerkClient() {
  return typeof clerkClient === 'function' ? await (clerkClient as any)() : clerkClient
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
  listCollectionRequests,
  getCollectionRequestById,
  updateCollectionRequest,
  assignScrappers,
  markAsCollected,
  getAllScrappers,
  getUsersByRole
}
