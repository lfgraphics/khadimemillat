import { NextResponse } from "next/server";
import OfflineDonation from "@/models/OfflineDonation";
import { auth } from "@clerk/nextjs/server";
import connectDb from "@/lib/db";
import { checkUserPermissionsAPI } from "@/lib/auth-utils";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const showDeleted = searchParams.get("showDeleted") === "true";

  try {
    const authResult = await checkUserPermissionsAPI([
      "admin",
      "moderator",
      "accountant",
      "auditor",
    ]);

    if ("error" in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    await connectDb();

    const { clerkClient } = await import("@clerk/nextjs/server");
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);
    const role = clerkUser.publicMetadata?.role as string;


    let query: any = {};

    if (role === "admin" || role === "moderator" || role === "auditor") {
      if (!showDeleted) {
        query = { isPublic: true };
      }
    }

    else if (role === "accountant") {
      query = { createdBy: "accountant", isPublic: true };
    }

    const donations = await OfflineDonation.find(query)
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, donations, role });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
