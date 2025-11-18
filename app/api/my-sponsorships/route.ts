import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import connectDB from '@/lib/db';
import Sponsorship from '@/models/Sponsorship';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    await connectDB();
    
    // Get all sponsorships for this user
    const sponsorships = await Sponsorship.find({
      sponsorId: userId
    })
    .sort({ createdAt: -1 })
    .lean();

    return NextResponse.json({
      success: true,
      sponsorships
    });

  } catch (error) {
    console.error('Error fetching sponsorships:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}