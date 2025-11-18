import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import connectDB from '@/lib/db';
import Sponsorship from '@/models/Sponsorship';
import FamilyMember from '@/models/FamilyMember';
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

    if (!['active', 'paused'].includes(sponsorship.status)) {
      return NextResponse.json({ error: 'Sponsorship cannot be cancelled' }, { status: 400 });
    }

    // Cancel Razorpay subscription
    const result = await RazorpaySubscriptionService.cancelSubscription(
      sponsorship.razorpaySubscriptionId,
      false // Cancel immediately
    );

    if (!result.success) {
      return NextResponse.json({ 
        error: result.error || 'Failed to cancel subscription' 
      }, { status: 500 });
    }

    // Update sponsorship status
    sponsorship.status = 'cancelled';
    sponsorship.endDate = new Date();
    await sponsorship.save();

    // Mark beneficiary as available again
    await FamilyMember.findByIdAndUpdate(sponsorship.beneficiaryId, {
      'sponsorship.isSponsored': false,
      'sponsorship.sponsoredAt': null,
      'sponsorship.sponsorId': null
    });

    return NextResponse.json({
      success: true,
      message: 'Sponsorship cancelled successfully'
    });

  } catch (error) {
    console.error('Error cancelling sponsorship:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}