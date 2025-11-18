import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import connectDB from '@/lib/db';
import Sponsorship from '@/models/Sponsorship';
import SponsorshipPayment from '@/models/SponsorshipPayment';

export async function GET(
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
    }).lean();

    if (!sponsorship) {
      return NextResponse.json({ error: 'Sponsorship not found' }, { status: 404 });
    }

    // Get payment history
    const payments = await SponsorshipPayment.find({
      sponsorshipId: sponsorshipId
    })
    .sort({ paymentDate: -1 })
    .lean();

    return NextResponse.json({
      success: true,
      sponsorship: {
        ...sponsorship,
        payments
      }
    });

  } catch (error) {
    console.error('Error fetching sponsorship details:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}