import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { role } = await request.json();
    
    if (!role || !['admin', 'moderator', 'inquiry_officer', 'surveyor'].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be one of: admin, moderator, inquiry_officer, surveyor" },
        { status: 400 }
      );
    }

    // Update user role in Clerk
    const { clerkClient } = await import('@clerk/nextjs/server');
    const client = await clerkClient();
    
    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        role: role
      }
    });
    
    return NextResponse.json({
      success: true,
      message: `Role updated to ${role}`,
      userId,
      newRole: role
    });

  } catch (error) {
    console.error("Error assigning role:", error);
    return NextResponse.json(
      { error: "Failed to assign role", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}