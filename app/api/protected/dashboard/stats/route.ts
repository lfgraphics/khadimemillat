import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getDashboardStats } from "@/lib/services/dashboard.service";
import { getAuth } from "@clerk/nextjs/server";

export async function GET(req: NextRequest) {
    try {
        const userId = requireUser(req); // throws if not auth
        const { sessionClaims }: any = getAuth(req)
        const role = sessionClaims?.metadata?.role as string | undefined

        // Only allow admin and moderator roles to access dashboard stats
        if (role !== 'admin' && role !== 'moderator') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const stats = await getDashboardStats();
        return NextResponse.json({ stats });
    } catch (err: any) {
        console.error('Dashboard stats API error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}