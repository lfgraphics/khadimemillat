/**
 * Donation entry detail endpoint for printing & review.
 * Returns normalized shape with donor + items (no auth role filtering yet).
 */
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getDonationEntryById, updateDonationEntry, deleteDonationEntry } from "@/lib/services/donationEntry.service";
import connectDB from '@/lib/db';
import ScrapItem, { IScrapItem } from '@/models/ScrapItem';
import DonationEntry, { ISDonationEntry } from '@/models/DonationEntry';
import { donationEntryUpdateSchema } from "@/lib/validators/donationEntry.validator";
import { checkRole } from "@/utils/roles";

export async function GET(req: NextRequest, { params }: any) {
    try {
        requireUser(req); // ensure authenticated; detailed role check can be added here
        await connectDB();
        const donationDoc = await DonationEntry.findById(params.id).populate('donor').lean<ISDonationEntry & { donor?: any }>();
        if (!donationDoc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        const itemDocs = await ScrapItem.find({ scrapEntry: donationDoc._id }).lean<IScrapItem[]>();
        return NextResponse.json({
                    donation: {
                    id: (donationDoc as any)._id.toString(),
                        donor: donationDoc.donor ? {
                            id: (donationDoc.donor as any)._id?.toString?.() || '',
                            name: (donationDoc.donor as any).name,
                            email: (donationDoc.donor as any).email,
                            phone: (donationDoc.donor as any).phone,
                        } : null,
                        createdAt: (donationDoc as any).createdAt,
                        items: itemDocs.map(it => ({
                            id: (it as any)._id?.toString?.() || '',
                            name: it.name,
                            condition: it.condition,
                            photos: it.photos,
                            marketplaceListing: it.marketplaceListing,
                        }))
                    }
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, { params }: any) {
    try {
        const userId = requireUser(req);
        const json = await req.json();
        const parsed = donationEntryUpdateSchema.parse(json);
        const existing = await getDonationEntryById(params.id);
        if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
        if (await checkRole('admin')) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        const updated = await updateDonationEntry(params.id, parsed);
        return NextResponse.json({ success: true, data: updated });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 400 });
    }
}

export async function DELETE(req: NextRequest, { params }: any) {
    try {
        const userId = requireUser(req);
        const existing = await getDonationEntryById(params.id);
        if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
        if (await checkRole('admin')) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        await deleteDonationEntry(params.id);
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 401 });
    }
}
