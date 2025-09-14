import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createDonationEntry, listDonationEntries } from "@/lib/services/donationEntry.service";
import { donationEntryCreateSchema } from "@/lib/validators/donationEntry.validator";

export async function GET(req: NextRequest) {
    try {
        const userId = requireUser(req); // throws if not auth
        const url = new URL(req.url);
        const page = Number(url.searchParams.get("page") || "1");
        const limit = Number(url.searchParams.get("limit") || "20");
        // optionally restrict to donor= userId unless admin
        const result = await listDonationEntries({ page, limit, donorId: userId });
        return NextResponse.json(result);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 401 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const userId = requireUser(req);
        const json = await req.json();
        const parsed = donationEntryCreateSchema.parse(json);
        // enforce donor = authenticated user (for security)
        if (parsed.donor !== userId) {
            return NextResponse.json({ error: "donor must be current user" }, { status: 403 });
        }
        const created = await createDonationEntry(parsed);
        return NextResponse.json({ success: true, data: created }, { status: 201 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 400 });
    }
}
