/**
 * Print Barcodes Page
 * Server component fetches donation by id and renders compact labels (50mm width friendly).
 * User can trigger browser print which uses @page size hints.
 */
import React from 'react';
import { notFound } from 'next/navigation';
import { BarcodePrintSheet } from '@/components/BarcodePrintSheet';
import connectDB from '@/lib/db';
import DonationEntry from '@/models/DonationEntry';
import ScrapItem from '@/models/ScrapItem';
import { getClerkUserWithSupplementaryData } from '@/lib/services/user.service';
import User from '@/models/User';

export const dynamic = 'force-dynamic';

async function fetchDonationDirect(id: string) {
  try {
    await connectDB();
    const donation: any = await DonationEntry.findById(id).lean();
    if (!donation) return null;
    const items: any[] = await ScrapItem.find({ scrapEntry: donation._id }).lean();
    let donorData: any = null;
    const donorRaw = donation.donor;
    if (donorRaw) {
      const isMongoId = /^[a-fA-F0-9]{24}$/.test(donorRaw);
      if (isMongoId) {
        try {
          const mongoUser: any = await User.findById(donorRaw).lean();
          if (mongoUser) {
            donorData = {
              id: mongoUser._id.toString(),
              name: mongoUser.name,
              email: mongoUser.email,
              phone: mongoUser.phone,
              source: 'mongo'
            }
          }
        } catch (e) {
          console.warn('[PRINT_MONGO_DONOR_FETCH_FAIL]', donorRaw, e);
        }
      }
      // Fallback to Clerk enrichment if not mongo id or mongo lookup failed
      if (!donorData) {
        try {
          const enriched = await getClerkUserWithSupplementaryData(donorRaw);
          donorData = {
            id: enriched.id,
            name: enriched.name,
            email: enriched.email,
            phone: enriched.phone,
            source: 'clerk'
          }
        } catch (e) {
          console.warn('[PRINT_CLERK_DONOR_ENRICH_FAIL]', donorRaw, e);
          donorData = { id: donorRaw, name: 'Unknown Donor', source: 'fallback' };
        }
      }
    }
    return {
      id: donation._id.toString(),
      donor: donorData ? {
        id: donorData.id,
        name: donorData.name,
        email: donorData.email,
        phone: donorData.phone,
      } : null,
      createdAt: donation.createdAt,
      items: items.map(it => ({ id: it._id.toString(), name: it.name }))
    };
  } catch (e) {
    console.error('[PRINT_FETCH_ERROR]', e);
    return null;
  }
}

function formatDate(d?: string) {
  if (!d) return '';
  return new Date(d).toLocaleString();
}

async function PrintContentServer({ id }: { id: string }) {
  const donation = await fetchDonationDirect(id);
  if (!donation) return notFound();
  return <BarcodePrintSheet donor={donation.donor} createdAt={donation.createdAt} items={donation.items} />;
}

export default async function Page({ params }: { params: { id: string } }) {
  return <PrintContentServer id={params.id} />;
}
