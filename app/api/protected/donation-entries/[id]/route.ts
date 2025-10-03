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
import { getClerkUserWithSupplementaryData } from '@/lib/services/user.service';
import { donationEntryUpdateSchema } from "@/lib/validators/donationEntry.validator";
import { checkRole } from "@/utils/roles";
import { getAuth } from "@clerk/nextjs/server";
import { calculateValidationStatus } from "@/lib/utils/validation";
import { EnhancedScrapItem } from "@/types/dashboard";

export async function GET(req: NextRequest, { params }: any) {
    try {
        const userId = requireUser(req);
        const { sessionClaims }: any = getAuth(req)
        const role = sessionClaims?.metadata?.role as string | undefined
        await connectDB();
        const donationDoc = await DonationEntry.findById((await params).id).lean<ISDonationEntry>();
        if (!donationDoc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        if (role !== 'admin' && role !== 'moderator' && String(donationDoc.donor) !== String(userId)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
        const itemDocs = await ScrapItem.find({ scrapEntry: donationDoc._id }).lean<IScrapItem[]>();
        // Enrich donor & collectedBy (picker)
        let donorDetails: any = null;
        if (donationDoc.donor) {
            try { donorDetails = await getClerkUserWithSupplementaryData(donationDoc.donor); } catch (e) { donorDetails = { id: donationDoc.donor, name: 'Unknown Donor' }; }
        }
        let pickerDetails: any = null;
        if ((donationDoc as any).collectedBy) {
            try { pickerDetails = await getClerkUserWithSupplementaryData((donationDoc as any).collectedBy); } catch (e) { pickerDetails = { id: (donationDoc as any).collectedBy, name: 'Unknown User' }; }
        }
        // Map items and calculate validation status
        const enhancedItems: EnhancedScrapItem[] = itemDocs.map(it => {
            const item: EnhancedScrapItem = {
                id: (it as any)._id?.toString?.() || '',
                name: it.name,
                condition: it.condition,
                photos: it.photos,
                marketplaceListing: it.marketplaceListing,
                repairingCost: (it as any).repairingCost,
                validationStatus: { canList: true, errors: [], warnings: [] }, // Will be calculated below
                createdAt: (it as any).createdAt || new Date().toISOString(),
                updatedAt: (it as any).updatedAt || new Date().toISOString()
            }
            
            // Calculate validation status for each item
            item.validationStatus = calculateValidationStatus(item)
            
            return item
        })

        return NextResponse.json({
            donation: {
                id: (donationDoc as any)._id.toString(),
                donor: donorDetails ? { id: donorDetails.id, name: donorDetails.name, email: donorDetails.email, phone: donorDetails.phone } : null,
                collectedBy: pickerDetails ? { id: pickerDetails.id, name: pickerDetails.name, email: pickerDetails.email } : null,
                createdAt: (donationDoc as any).createdAt,
                status: (donationDoc as any).status,
                items: enhancedItems
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
        const existing = await getDonationEntryById((await params).id);
        if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
        // Only admin or moderator allowed to update donation entry
        const isAdmin = await checkRole('admin')
        const isModerator = await checkRole('moderator' as any)
        if (!isAdmin && !isModerator) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        const updated = await updateDonationEntry((await params).id, parsed);
        return NextResponse.json({ success: true, data: updated });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 400 });
    }
}

export async function DELETE(req: NextRequest, { params }: any) {
    try {
        const userId = requireUser(req);
        const existing = await getDonationEntryById((await params).id);
        if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
        // Only admin allowed to delete
        const isAdmin = await checkRole('admin')
        if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        await deleteDonationEntry((await params).id);
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 401 });
    }
}
