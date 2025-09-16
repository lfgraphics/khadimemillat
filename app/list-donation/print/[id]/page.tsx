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

export const dynamic = 'force-dynamic';

async function fetchDonationDirect(id: string) {
  try {
    await connectDB();
    const donation: any = await DonationEntry.findById(id).populate('donor').lean();
    if (!donation) return null;
    const items: any[] = await ScrapItem.find({ scrapEntry: donation._id }).lean();
    return {
      id: donation._id.toString(),
      donor: donation.donor ? {
        id: (donation.donor as any)._id.toString(),
        name: (donation.donor as any).name,
        email: (donation.donor as any).email,
        phone: (donation.donor as any).phone,
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
