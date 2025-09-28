/**
 * Full donation submission endpoint.
 * Accepts donorId and an array of items (with optional base64 images & marketplace listing fields).
 * 1. Creates a DonationEntry shell.
 * 2. Iterates items, uploads any base64 images to Cloudinary, creates ScrapItem docs.
 * 3. Attaches ScrapItem ids to DonationEntry and returns donation + item ids.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import connectDB from '@/lib/db';
import DonationEntry from '@/models/DonationEntry';
import ScrapItem from '@/models/ScrapItem';
import { uploadImage } from '@/lib/cloudinary-server';
import { notificationService } from '@/lib/services/notification.service';

// Zod schema for full submission
const scrapItemInputSchema = z.object({
  name: z.string().min(2),
  description: z.string().max(1000).optional(),
  condition: z.enum(["new", "good", "repairable", "scrap", "not applicable"]).default('good'),
  photos: z.object({
    before: z.array(z.string()).optional(), // base64 or cloudinary id
    after: z.array(z.string()).optional(),
  }).optional(),
  marketplaceListing: z.object({
    listed: z.boolean().optional(),
    demandedPrice: z.number().optional(),
  }).optional(),
});

// Accept either a 24-char mongo id or a Clerk user id (len != 24) then resolve
const fullDonationSchema = z.object({
  donorId: z.string().min(10),
  items: z.array(scrapItemInputSchema).min(1),
  collectionRequestId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = fullDonationSchema.parse(json);

    await connectDB();
    let donorMongoId = parsed.donorId;
    const isMongo = /^[a-fA-F0-9]{24}$/.test(donorMongoId);
    if (!isMongo) {
      // Attempt to find user by Clerk ID
      const UserModel = (await import('@/models/User')).default as any;
      const maybeUser: any = await UserModel.findOne({ clerkUserId: donorMongoId }).lean();
      if (maybeUser && maybeUser._id) {
        donorMongoId = maybeUser._id.toString();
      } else {
        throw new Error('Donor clerk user not synced locally. Load user list once (which performs enrichment) then retry.');
      }
    }
  let donation: any
    if (parsed.collectionRequestId) {
      // Try find existing donation entry for this collection request
      donation = await DonationEntry.findOne({ collectionRequest: parsed.collectionRequestId }).lean()
      if (!donation) {
        // Create a new donation entry seeded from the CollectionRequest donor (Clerk ID)
        try {
          const CollectionRequestModel = (await import('@/models/CollectionRequest')).default as any
          const cr = await CollectionRequestModel.findById(parsed.collectionRequestId).lean()
          if (!cr) return NextResponse.json({ error: 'Collection request not found' }, { status: 404 })
          const created = await DonationEntry.create({ donor: cr.donor, collectionRequest: parsed.collectionRequestId, status: 'collected', items: [] })
          donation = await DonationEntry.findById(created._id)
        } catch (e) {
          console.error('[CREATE_DONATION_FOR_CR_FAILED]', e)
          return NextResponse.json({ error: 'Failed to initialize donation entry for request' }, { status: 500 })
        }
      } else {
        // If found, ensure we have a mutable reference (re-fetch as doc)
        donation = await DonationEntry.findById(donation._id)
      }
    } else {
      // We currently have donorMongoId (local _id). Need to fetch user doc to get clerkUserId for Clerk-first storage.
      const UserModel = (await import('@/models/User')).default as any;
      const userDoc = await UserModel.findById(donorMongoId).lean();
      if (!userDoc || !userDoc.clerkUserId) {
        throw new Error('Could not resolve Clerk user id for donor');
      }
      donation = await DonationEntry.create({ donor: userDoc.clerkUserId, items: [] })
    }

    const createdItemIds: string[] = [];

    // Helper to parallelize uploads with modest concurrency to avoid overwhelming the provider
    const runWithConcurrency = async <T, R>(items: T[], limit: number, worker: (i: T) => Promise<R>): Promise<R[]> => {
      const results: R[] = []
      let idx = 0
      const workers: Promise<void>[] = []
      const next = async () => {
        while (idx < items.length) {
          const current = idx++
          const res = await worker(items[current])
          results[current] = res
        }
      }
      const n = Math.min(limit, Math.max(1, items.length))
      for (let i = 0; i < n; i++) workers.push(next())
      await Promise.all(workers)
      return results
    }

    for (const item of parsed.items) {
      // Upload photos if they look like base64 (starts with data:)
      const beforeIds: string[] = [];
      const afterIds: string[] = [];
      if (item.photos?.before && item.photos.before.length > 0) {
        const tasks = item.photos.before.map((b) => async () => {
          if (b.startsWith('data:')) {
            const uploaded = await uploadImage(b, { folder: 'kmwf/items/before' });
            return uploaded.public_id as string
          }
          return b
        })
        const resolved = await Promise.all(tasks.map(t => t()))
        beforeIds.push(...resolved)
      }
      if (item.photos?.after && item.photos.after.length > 0) {
        const tasks = item.photos.after.map((a) => async () => {
          if (a.startsWith('data:')) {
            const uploaded = await uploadImage(a, { folder: 'kmwf/items/after' });
            return uploaded.public_id as string
          }
          return a
        })
        const resolved = await Promise.all(tasks.map(t => t()))
        afterIds.push(...resolved)
      }

      const scrapDoc = await ScrapItem.create({
        scrapEntry: donation._id,
        name: item.name,
        condition: item.condition,
        photos: { before: beforeIds, after: afterIds },
        marketplaceListing: {
          listed: item.marketplaceListing?.listed ?? false,
          demandedPrice: item.marketplaceListing?.demandedPrice,
          sold: false,
        },
      });
      createdItemIds.push(scrapDoc._id.toString());
    }

  // Merge with existing items if any
  const existingItems = Array.isArray(donation.items) ? donation.items.map((x: any)=> x.toString()) : []
  const wasEmpty = existingItems.length === 0;
  donation.items = [...existingItems, ...createdItemIds] as any;
    // If coming from collection request, ensure the linked CollectionRequest is at least 'collected'
    if (parsed.collectionRequestId) {
      try {
        const CollectionRequestModel = (await import('@/models/CollectionRequest')).default as any
        const cr = await CollectionRequestModel.findById(parsed.collectionRequestId).lean()
        if (cr) {
          const updates: any = {}
          if (cr.status === 'pending' || cr.status === 'verified') updates.status = 'collected'
          if (!cr.donationEntryId) updates.donationEntryId = donation._id
          if (Object.keys(updates).length) {
            await CollectionRequestModel.findByIdAndUpdate(parsed.collectionRequestId, updates)
          }
        }
      } catch (e) {
        console.warn('[CR_STATUS_UPDATE_FAILED]', e)
      }
    }
    await donation.save();

    // Idempotent notification: only when first batch added for collection request
    if (parsed.collectionRequestId && wasEmpty && createdItemIds.length > 0 && !donation.itemsListedNotifiedAt) {
      try {
        await notificationService.notifyByRole(['moderator','admin'], {
          title: 'Collection Ready for Review',
          body: 'Collected items have been listed and need review.',
          url: '/moderator/review',
          type: 'review_needed'
        })
        donation.itemsListedNotifiedAt = new Date()
        await donation.save()
      } catch (e) {
        console.warn('[NOTIFICATION_FAILED]', e)
      }
    }

  return NextResponse.json({ success: true, donationId: donation._id.toString(), itemIds: createdItemIds });
  } catch (err: any) {
    console.error('[FULL_DONATION_ERROR]', err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
