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

    // Check if current user has permission (admin only for role assignment)
    const currentUser = await User.findOne({ clerkUserId: currentUserId });
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json(
        { error: "Only administrators can assign roles" },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const targetUserId = formData.get('userId') as string;
    const role = formData.get('role') as string;

    if (!targetUserId || !role) {
      return NextResponse.json(
        { error: "User ID and role are required" },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ['admin', 'moderator', 'field_executive', 'surveyor', 'accountant', 'user'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: "Invalid role" },
        { status: 400 }
      );
    }

    const client = await clerkClient();

    // Update role in Clerk
    await client.users.updateUserMetadata(targetUserId, {
      publicMetadata: {
        role: role
      }
    });

    // Update or create user in MongoDB
    await User.findOneAndUpdate(
      { clerkUserId: targetUserId },
      { 
        role: role,
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
    console.error("Error assigning role:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}