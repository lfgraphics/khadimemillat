import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import { revalidatePath } from "next/cache";

export async function POST(request: NextRequest) {
  try {
    const { userId: currentUserId } = await auth();
    
    if (!currentUserId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    await connectDB();

    // Check if current user has permission (admin only for role removal)
    const currentUser = await User.findOne({ clerkUserId: currentUserId });
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json(
        { error: "Only administrators can remove roles" },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const targetUserId = formData.get('userId') as string;

    if (!targetUserId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const client = await clerkClient();

    // Remove role in Clerk (set to default 'user' role)
    await client.users.updateUserMetadata(targetUserId, {
      publicMetadata: {
        role: 'user'
      }
    });

    // Update user in MongoDB
    await User.findOneAndUpdate(
      { clerkUserId: targetUserId },
      { 
        role: 'user',
        updatedAt: new Date()
      },
      { 
        upsert: true,
        new: true
      }
    );

    // Revalidate the manage users page
    revalidatePath('/admin/manage-users');

    return NextResponse.redirect(new URL('/admin/manage-users', request.url));

  } catch (error) {
    console.error("Error removing role:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}