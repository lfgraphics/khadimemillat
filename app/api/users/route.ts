import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import connectDB from '@/lib/db';
import User from '@/models/User';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    const user = await User.findOne({ clerkUserId: userId });
    
    if (!user || !['admin', 'moderator'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');

    if (role) {
      // Get users by role from Clerk
      try {
        const { clerkClient } = await import('@clerk/nextjs/server');
        const client = await clerkClient();
        
        // Get all users from Clerk and filter by role
        const allUsers = await client.users.getUserList({ limit: 500 });
        const filteredUsers = allUsers.data
          .filter(user => (user.publicMetadata as any)?.role === role)
          .map(user => ({
            _id: user.id,
            clerkUserId: user.id,
            name: user.firstName && user.lastName 
              ? `${user.firstName} ${user.lastName}` 
              : (user.username || 'Unnamed User'),
            email: user.emailAddresses?.[0]?.emailAddress,
            role: (user.publicMetadata as any)?.role
          }));

        return NextResponse.json({
          success: true,
          data: filteredUsers
        });
      } catch (error) {
        console.error('Error fetching users from Clerk:', error);
        return NextResponse.json(
          { error: 'Failed to fetch users' },
          { status: 500 }
        );
      }
    } else {
      // Get all users from MongoDB
      const users = await User.find({}).select('clerkUserId name email role').lean();
      
      return NextResponse.json({
        success: true,
        data: users
      });
    }

  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}