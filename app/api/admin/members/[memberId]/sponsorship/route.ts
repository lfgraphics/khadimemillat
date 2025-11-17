import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import FamilyMember from '@/models/FamilyMember';
import Category from '@/models/Category';


export async function POST(
  request: NextRequest,
  { params }: { params: { memberId: string } }
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

    const { action, sponsorshipCategory, monthlyAmount, description, memberHumanId } = await request.json();

    const resolvedParams = await params;
    const member = await FamilyMember.findById(resolvedParams.memberId) as any;
    
    if (!member) {
      return NextResponse.json({ error: 'Family member not found' }, { status: 404 });
    }

    if (action === 'enable') {
      const errors = [];
      if (!sponsorshipCategory) errors.push('Sponsorship category is required');
      if (!monthlyAmount) errors.push('Monthly amount is required');
      if (!description) errors.push('Support description is required');
      
      if (errors.length > 0) {
        return NextResponse.json({ 
          error: errors.join(', ')
        }, { status: 400 });
      }

      if (isNaN(parseInt(monthlyAmount)) || parseInt(monthlyAmount) <= 0) {
        return NextResponse.json({ 
          error: 'Monthly amount must be a valid positive number' 
        }, { status: 400 });
      }

      // Validate category exists and is active
      const categoryConfig = await Category.findOne({ 
        slug: sponsorshipCategory, 
        type: 'sponsorship', 
        active: true 
      });
      
      if (!categoryConfig) {
        return NextResponse.json({ 
          error: 'Invalid or inactive sponsorship category' 
        }, { status: 400 });
      }

      // Management can choose any category - no eligibility restrictions

      // Generate member human ID if not provided
      const humanId = memberHumanId || await generateMemberHumanId(sponsorshipCategory);

      // Update member with sponsorship details
      member.sponsorship = {
        availableForSponsorship: true,
        category: categoryConfig.slug,
        monthlyAmount: parseInt(monthlyAmount),
        description,
        memberHumanId: humanId,
        enabledAt: new Date(),
        enabledBy: user._id
      };

      // Update category usage statistics
      categoryConfig.usageCount = (categoryConfig.usageCount || 0) + 1;
      categoryConfig.lastUsed = new Date();
      await categoryConfig.save();

      // Member is now available for sponsorship - no SponsorshipRequest needed
      await member.save();

      return NextResponse.json({ 
        message: 'Sponsorship enabled successfully',
        memberHumanId: humanId
      });

    } else if (action === 'disable') {
      // Disable sponsorship
      member.sponsorship = {
        availableForSponsorship: false,
        disabledAt: new Date(),
        disabledBy: user._id
      };

      // Member is no longer available for sponsorship

      await member.save();

      return NextResponse.json({ 
        message: 'Sponsorship disabled successfully'
      });

    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Error managing member sponsorship:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to generate member human ID
async function generateMemberHumanId(category: string): Promise<string> {
  const year = new Date().getFullYear();
  const categoryPrefix = getCategoryPrefix(category);
  
  // Find the last used number for this category and year
  const lastMember = await FamilyMember.findOne({
    'sponsorship.memberHumanId': new RegExp(`^KMWF-${categoryPrefix}-${year}-`)
  }).sort({ 'sponsorship.memberHumanId': -1 });

  let nextNumber = 1;
  if (lastMember && lastMember.sponsorship?.memberHumanId) {
    const match = lastMember.sponsorship.memberHumanId.match(/-(\d+)$/);
    if (match) {
      nextNumber = parseInt(match[1]) + 1;
    }
  }

  return `KMWF-${categoryPrefix}-${year}-${String(nextNumber).padStart(3, '0')}`;
}

function getCategoryPrefix(category: string): string {
  switch (category) {
    case 'widow':
      return 'WID';
    case 'orphan':
      return 'ORP';
    case 'elderly':
      return 'ELD';
    case 'medical':
      return 'MED';
    case 'disabled':
      return 'DIS';
    case 'student':
      return 'STU';
    case 'education':
      return 'EDU';
    case 'general':
      return 'GEN';
    default:
      return 'GEN';
  }
}