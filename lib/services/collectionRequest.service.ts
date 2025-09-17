import connectDB from '../db'
import CollectionRequest, { ICollectionRequest } from '@/models/CollectionRequest'
import { Types } from 'mongoose'
import { notificationService } from './notification.service'
import DonationEntry from '@/models/DonationEntry'

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
    CollectionRequest.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('donor').lean(),
    CollectionRequest.countDocuments(query)
  ])
  return { items, total, page, limit }
}

export async function getCollectionRequestById(id: string) {
  await connectDB()
  if (!Types.ObjectId.isValid(id)) return null
  return CollectionRequest.findById(id).populate('donor assignedScrappers').lean()
}

export async function updateCollectionRequest(id: string, data: Partial<ICollectionRequest>) {
  await connectDB()
  if (!Types.ObjectId.isValid(id)) throw new Error('Invalid id')
  return CollectionRequest.findByIdAndUpdate(id, data, { new: true }).lean()
}

export async function assignScrappers(id: string, scrapperIds: string[]) {
  await connectDB()
  if (!Types.ObjectId.isValid(id)) throw new Error('Invalid id')
  const validIds = scrapperIds.filter(i => Types.ObjectId.isValid(i))
  const doc = await CollectionRequest.findByIdAndUpdate(id, { $addToSet: { assignedScrappers: { $each: validIds } }, status: 'verified' }, { new: true }).lean()
  if (doc) {
    await notificationService.notifyUsers(validIds, {
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
  const doc = await CollectionRequest.findByIdAndUpdate(id, { status: 'collected', actualPickupTime }, { new: true }).lean()
  if (doc) {
    const single = doc as any
    // Create a DonationEntry shell referencing this collection request (no items yet)
    const donationEntry = await DonationEntry.create({
      donor: single.donor,
      collectionRequest: single._id,
      status: 'collected'
    } as any)
    await notificationService.notifyByRole(['moderator','admin'], {
      title: 'Collection Ready for Review',
      body: 'Collected items need review.',
      url: '/moderator/review',
      type: 'review_needed'
    })
    return { ...single, donationEntryId: donationEntry._id }
  }
  return doc
}

export const collectionRequestService = {
  createCollectionRequest,
  listCollectionRequests,
  getCollectionRequestById,
  updateCollectionRequest,
  assignScrappers,
  markAsCollected
}
