import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import Category from '@/models/Category';
import FamilyMember from '@/models/FamilyMember';
import SurveyResponse from '@/models/SurveyResponse';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ categoryId: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    const user = await User.findOne({ clerkUserId: userId });
    
    if (!user || !['admin'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const resolvedParams = await params;
    const category = await Category.findById(resolvedParams.categoryId);

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    let usageCount = 0;
    let canDelete = true;
    const usageDetails: any = {};

    if (category.type === 'sponsorship') {
      // Check FamilyMember usage
      const sponsoredMembers = await FamilyMember.countDocuments({
        'sponsorship.category': category.slug,
        'sponsorship.availableForSponsorship': true
      });
      
      usageDetails.sponsoredMembers = sponsoredMembers;
      usageCount += sponsoredMembers;
      
      if (sponsoredMembers > 0) {
        canDelete = false;
      }
    } else if (category.type === 'survey') {
      // Check SurveyResponse usage
      const surveysWithCategory = await SurveyResponse.countDocuments({
        category: category.slug
      });
      
      usageDetails.surveysWithCategory = surveysWithCategory;
      usageCount += surveysWithCategory;
      
      if (surveysWithCategory > 0) {
        canDelete = false;
      }
    }

    return NextResponse.json({
      category: {
        id: category._id,
        name: category.name,
        slug: category.slug,
        type: category.type
      },
      usageCount,
      canDelete,
      usageDetails,
      message: canDelete 
        ? 'Category can be safely deleted' 
        : 'Category is in use and cannot be deleted'
    });

  } catch (error) {
    console.error('Error checking category usage:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}