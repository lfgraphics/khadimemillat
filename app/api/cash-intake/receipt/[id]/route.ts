import { NextResponse, NextRequest } from "next/server";
import connectDB from "@/lib/db";
import OfflineDonation from "@/models/OfflineDonation";
import { auth } from "@clerk/nextjs/server";
import { checkUserPermissionsAPI } from '@/lib/auth-utils';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { userId } = await auth();

    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const authResult = await checkUserPermissionsAPI(['admin', 'moderator', 'accountant']);
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        const { id } = await params;

        if (!id) {
            return NextResponse.json(
                { error: "Donation ID is required" },
                { status: 400 }
            );
        }

        await connectDB();

        const donation = await OfflineDonation.findById(id).lean();

        if (!donation) {
            return NextResponse.json(
                { error: "Donation not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, donation }, { status: 200 });
    } catch (err) {
        console.error("API Error:", err);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
