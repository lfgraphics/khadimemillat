import { NextResponse } from "next/server";
import OfflineDonation from "@/models/OfflineDonation";
import { auth } from "@clerk/nextjs/server"
import connectDb from "@/lib/db";
import { checkUserPermissionsAPI } from "@/lib/auth-utils"

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const authResult = await checkUserPermissionsAPI(['admin', 'moderator', 'accountant', 'auditor']);

    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    await connectDb();

    const donations = await OfflineDonation.find().sort({ createdAt: -1 });

    return NextResponse.json({ success: true, donations });

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
