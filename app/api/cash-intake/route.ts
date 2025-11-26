import { NextResponse, NextRequest } from "next/server";
import connectDB from "@/lib/db";
import OfflineDonation from "@/models/OfflineDonation";
import { auth } from "@clerk/nextjs/server"
import { checkUserPermissionsAPI } from '@/lib/auth-utils';

export async function POST(req: NextRequest) {

    const { userId } = await auth();

    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {

        const authResult = await checkUserPermissionsAPI(['admin', 'moderator', 'accountant', 'auditor']);
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        const body = await req.json();
        const { donorName, amount, notes, receivedAt, collectedBy } = body;

        if (!donorName || !amount || !receivedAt) {
            return NextResponse.json(
                { error: "Fill all required fields." },
                { status: 400 }
            );
        }

        await connectDB();

        const donation = await OfflineDonation.create({
            donorName,
            amount,
            notes: notes || "",
            receivedAt: new Date(receivedAt),
            collectedBy: {
                user_id: userId,
                name: collectedBy,
            }
        });

        return NextResponse.json({ success: true, donation }, { status: 201 });
    } catch (err) {
        console.log("API Error:", err);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
