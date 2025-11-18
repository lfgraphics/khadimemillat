import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import connectDB from '@/lib/db';
import Sponsorship from '@/models/Sponsorship';
import { RazorpaySubscriptionService } from '@/lib/services/razorpay-subscription.service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sponsorshipId: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    await connectDB();
    
    const sponsorshipId = (await params).sponsorshipId;
    
    // Find sponsorship and verify ownership
    const sponsorship = await Sponsorship.findOne({
      _id: sponsorshipId,
      sponsorId: userId
    });

    if (!sponsorship) {
      return NextResponse.json({ error: 'Sponsorship not found' }, { status: 404 });
    }

    if (sponsorship.status !== 'active') {
      return NextResponse.json({ error: 'Only active sponsorships can be paused' }, { status: 400 });
    }

    // Pause Razorpay subscription
    const result = await RazorpaySubscriptionService.pauseSubscription(
      sponsorship.razorpaySubscriptionId
    );

    if (!result.success) {
      return NextResponse.json({ 
        error: result.error || 'Failed to pause subscription' 
      }, { status: 500 });
    }

    // Update sponsorship status
    sponsorship.status = 'paused';
    await sponsorship.save();

    return NextResponse.json({
      success: true,
      message: 'Sponsorship paused successfully'
    });

  } catch (error) {
    console.error('Error pausing sponsorship:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}