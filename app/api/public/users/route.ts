import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import { z } from "zod";

// Simple schema for quick-create donors (without Clerk linkage yet)
const quickCreateSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional()
});

export async function GET() {
  await connectDB();
  const users = await User.find({}).select("_id name email").sort({ createdAt: -1 }).limit(200).lean();
  return NextResponse.json({ users });
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const json = await req.json();
    const parsed = quickCreateSchema.parse(json);

    // For quick-create we fabricate a clerkUserId placeholder (should be replaced when linking to Auth)
    const doc = await User.create({
      clerkUserId: `local_${Date.now()}`,
      name: parsed.name,
      email: parsed.email,
      phone: parsed.phone,
      address: parsed.address,
      role: 'user'
    });
    return NextResponse.json({ success: true, user: { id: doc._id, name: doc.name } }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
