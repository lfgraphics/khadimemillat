import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getDonationEntryById, updateDonationEntry, deleteDonationEntry } from "@/lib/services/donationEntry.service";
import { donationEntryUpdateSchema } from "@/lib/validators/donationEntry.validator";
import { checkRole } from "@/utils/roles";

export async function GET(req: NextRequest, { params }: any) {
    try {
        const userId = requireUser(req);
        const doc = await getDonationEntryById(params.id);
        if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
        // Access control: only donor or admin can view
        // if (doc.donor.toString() !== userId && await checkRole('admin')) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        // }
        return NextResponse.json(doc);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 401 });
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
