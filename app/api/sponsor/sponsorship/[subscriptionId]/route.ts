import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import connectDB from '@/lib/db';
import Sponsorship from '@/models/Sponsorship';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ subscriptionId: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    await connectDB();
    
    const subscriptionId = (await params).subscriptionId;
    
    // Find sponsorship by subscription ID and sponsor ID
    const sponsorship = await Sponsorship.findOne({
      razorpaySubscriptionId: subscriptionId,
      sponsorId: userId
    }).lean();

    if (!sponsorship) {
      return NextResponse.json({ error: 'Sponsorship not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      sponsorship
    });

  } catch (error) {
    console.error('Error fetching sponsorship:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}