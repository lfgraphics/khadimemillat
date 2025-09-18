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
        return NextResponse.json({ error: 'Donation entry not found for collection request' }, { status: 404 })
      }
      // If found, ensure we have a mutable reference (re-fetch as doc)
      donation = await DonationEntry.findById(donation._id)
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

    for (const item of parsed.items) {
      // Upload photos if they look like base64 (starts with data:)
      const beforeIds: string[] = [];
      const afterIds: string[] = [];
      if (item.photos?.before) {
        for (const b of item.photos.before) {
          if (b.startsWith('data:')) {
            const uploaded = await uploadImage(b, { folder: 'kmwf/items/before' });
            beforeIds.push(uploaded.public_id);
          } else {
            beforeIds.push(b); // already an id
          }
        }
      }
      if (item.photos?.after) {
        for (const a of item.photos.after) {
          if (a.startsWith('data:')) {
            const uploaded = await uploadImage(a, { folder: 'kmwf/items/after' });
            afterIds.push(uploaded.public_id);
          } else {
            afterIds.push(a);
          }
        }
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
    // If coming from collection request, ensure status at least collected
    if (parsed.collectionRequestId && donation.status === 'collected') {
      // keep as collected
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
