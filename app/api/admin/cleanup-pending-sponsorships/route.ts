import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import Sponsorship from '@/models/Sponsorship';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    await connectDB();
    
    // Check if user is admin
    const user = await User.findOne({ clerkUserId: userId });
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Find and delete pending sponsorships older than 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const oldPendingSponsorships = await Sponsorship.find({
      status: 'pending',
      createdAt: { $lt: oneHourAgo }
    });

    console.log(`Found ${oldPendingSponsorships.length} old pending sponsorships to clean up`);

    const deleteResult = await Sponsorship.deleteMany({
      status: 'pending',
      createdAt: { $lt: oneHourAgo }
    });

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${deleteResult.deletedCount} old pending sponsorships`,
      deletedCount: deleteResult.deletedCount
    });

  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json(
      { error: 'Cleanup failed' },
      { status: 500 }
    );
  }
}