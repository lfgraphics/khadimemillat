import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get user info from Clerk
    const { clerkClient } = await import('@clerk/nextjs/server');
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);
    
    const userRole = clerkUser.publicMetadata?.role as string;
    
    return NextResponse.json({
      success: true,
      userId,
      userRole: userRole || 'none',
      publicMetadata: clerkUser.publicMetadata,
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName,
      email: clerkUser.emailAddresses?.[0]?.emailAddress,
      allowedRoles: ['admin', 'moderator', 'inquiry_officer', 'surveyor'],
      hasPermission: userRole && ['admin', 'moderator', 'inquiry_officer', 'surveyor'].includes(userRole)
    });

  } catch (error) {
    console.error("Error checking user role:", error);
    return NextResponse.json(
      { error: "Failed to check user role", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}