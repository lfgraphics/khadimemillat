import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import SurveyResponse from '@/models/SurveyResponse';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ surveyId: string }> }
) {
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

    const { comments } = await request.json();

    const survey = await SurveyResponse.findById((await params).surveyId) as any;
    
    if (!survey) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 });
    }

    if (survey.status !== 'verified' && survey.status !== 'approved') {
      return NextResponse.json({ error: 'Survey must be approved before assigning relief card' }, { status: 400 });
    }

    // Generate relief card ID
    const reliefCardId = `RC-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

    // Update survey with relief card information
    survey.reliefCard = {
      cardId: reliefCardId,
      assignedAt: new Date(),
      assignedBy: user._id,
      status: 'active',
      comments: comments || 'Relief card assigned'
    };

    // Add to action history
    if (!survey.actionHistory) {
      survey.actionHistory = [];
    }
    
    survey.actionHistory.push({
      action: 'relief_card_assigned',
      performedBy: user._id,
      performedAt: new Date(),
      comments: comments || 'Relief card assigned',
      details: {
        reliefCardId
      }
    });

    await survey.save();

    return NextResponse.json({ 
      message: 'Relief card assigned successfully',
      reliefCard: {
        cardId: reliefCardId,
        assignedAt: survey.reliefCard.assignedAt
      }
    });

  } catch (error) {
    console.error('Error assigning relief card:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}