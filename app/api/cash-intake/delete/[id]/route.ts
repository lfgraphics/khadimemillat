import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@clerk/nextjs/server";
import OfflineDonation from "@/models/OfflineDonation";
import dbConnect from "@/lib/db";
import { checkUserPermissionsAPI } from "@/lib/auth-utils";

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  if (!id) {
    return NextResponse.json(
      { error: "Donation id missing in params" },
      { status: 400 }
    );
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json(
      { error: "Invalid donation ID format" },
      { status: 400 }
    );
  }

  try {
    const authResult = await checkUserPermissionsAPI([
      "admin",
      "moderator",
      "accountant",
    ]);

    if ("error" in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    try {
      await req.json().catch(() => ({}));
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    await dbConnect();

    const updated = await OfflineDonation.findByIdAndUpdate(
      id,
      { isPublic: false },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json(
        { error: "Donation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
