import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createDonationEntry, listDonationEntries } from "@/lib/services/donationEntry.service";
import { donationEntryCreateSchema } from "@/lib/validators/donationEntry.validator";
import { getAuth } from "@clerk/nextjs/server";

export async function GET(req: NextRequest) {
    try {
        const userId = requireUser(req); // throws if not auth
        const { sessionClaims }: any = getAuth(req)
        const role = sessionClaims?.metadata?.role as string | undefined

        const url = new URL(req.url);
        const page = Number(url.searchParams.get("page") || "1");
        const limit = Number(url.searchParams.get("limit") || "20");
        const status = url.searchParams.get("status") || undefined
        const q = url.searchParams.get("q") || undefined
        const itemStatus = url.searchParams.get("itemStatus") || undefined
        const from = url.searchParams.get("from") || undefined
        const to = url.searchParams.get("to") || undefined
        const sort = url.searchParams.get("sort") || undefined

        const adminMode = role === 'admin' || role === 'moderator'
        const result = await listDonationEntries({ page, limit, donorId: adminMode ? undefined : userId, status, q, itemStatus, from, to, sort, includeCounts: true, enrichDonor: true })
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
