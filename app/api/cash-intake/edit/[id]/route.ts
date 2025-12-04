import { NextResponse } from "next/server";
import OfflineDonation from "@/models/OfflineDonation";
import { auth } from "@clerk/nextjs/server";
import connectDb from "@/lib/db";
import { checkUserPermissionsAPI } from "@/lib/auth-utils";
import mongoose from "mongoose";

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  if (!id) {
    return NextResponse.json({ error: "Donation id missing in params" }, { status: 400 });
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid donation ID" }, { status: 400 });
  }

  try {
    const authResult = await checkUserPermissionsAPI(['admin', 'moderator', 'accountant']);
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    await connectDb();

    const donation = await OfflineDonation.findById(id);
    if (!donation) {
      return NextResponse.json({ error: "Donation ID not found" }, { status: 404 });
    }

    const { clerkClient } = await import("@clerk/nextjs/server");
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);
    const role = clerkUser.publicMetadata?.role as string;

    if (role === "accountant" && donation.createdBy !== "accountant") {
      return NextResponse.json(
        { error: "Accountants can only edit their own donations." },
        { status: 403 }
      );
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { donorName, amount, notes } = body;

    if (donorName !== undefined && donorName.trim().length === 0) {
      return NextResponse.json({ error: "Donor name cannot be empty" }, { status: 400 });
    }

    if (donorName !== undefined) donation.donorName = donorName;
    if (amount !== undefined) donation.amount = amount;
    if (notes !== undefined) donation.notes = notes;

    await donation.save();

    return NextResponse.json({ success: true, donation });

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
