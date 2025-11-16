import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import connectDB from "@/lib/db";
import User from "@/models/User";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    await connectDB();

    // Check if user has permission (admin or moderator)
    const user = await User.findOne({ clerkUserId: userId });
    if (!user || !['admin', 'moderator'].includes(user.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const { clerkClient } = await import('@clerk/nextjs/server');
    const client = await clerkClient();

    // Get users from Clerk
    const offset = (page - 1) * limit;
    const clerkUsers = await client.users.getUserList({ 
      limit: Math.min(limit, 500), // Clerk has limits
      offset 
    });

    // Filter by role if specified
    let filteredUsers = clerkUsers.data;
    if (role) {
      filteredUsers = clerkUsers.data.filter(user => 
        (user.publicMetadata as any)?.role === role
      );
    }

    // Transform to expected format
    const users = filteredUsers.map(user => ({
      _id: user.id,
      clerkUserId: user.id,
      name: user.firstName && user.lastName 
        ? `${user.firstName} ${user.lastName}` 
        : (user.username || 'Unnamed User'),
      email: user.emailAddresses?.[0]?.emailAddress,
      role: (user.publicMetadata as any)?.role || 'user',
      createdAt: user.createdAt
    }));

    return NextResponse.json({
      success: true,
      users,
      pagination: {
        page,
        limit,
        total: filteredUsers.length,
        pages: Math.ceil(filteredUsers.length / limit)
      }
    });

  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}