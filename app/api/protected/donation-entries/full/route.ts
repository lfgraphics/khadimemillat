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
import { uploadImage } from '@/lib/cloudinary';

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

const fullDonationSchema = z.object({
  donorId: z.string().length(24),
  items: z.array(scrapItemInputSchema).min(1),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = fullDonationSchema.parse(json);

    await connectDB();
    // Create base donation entry first
    const donation = await DonationEntry.create({ donor: parsed.donorId, items: [] });

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

    donation.items = createdItemIds as any;
    await donation.save();

  return NextResponse.json({ success: true, donationId: donation._id.toString(), itemIds: createdItemIds });
  } catch (err: any) {
    console.error('[FULL_DONATION_ERROR]', err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
