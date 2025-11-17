import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import Category from '@/models/Category';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    const user = await User.findOne({ clerkUserId: userId });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const activeOnly = searchParams.get('activeOnly') !== 'false';

    if (type === 'sponsorship') {
      const categories = await (Category as any).getByType('sponsorship', activeOnly);
      return NextResponse.json({ categories });
    } else if (type === 'survey') {
      const categories = await (Category as any).getByType('survey', activeOnly);
      return NextResponse.json({ categories });
    } else {
      const sponsorshipCategories = await (Category as any).getByType('sponsorship', activeOnly);
      const surveyCategories = await (Category as any).getByType('survey', activeOnly);
      
      return NextResponse.json({
        sponsorshipCategories,
        surveyCategories
      });
    }

  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    const categoryData = await request.json();

    // Validate required fields
    const requiredFields = ['name', 'type', 'label', 'description'];
    for (const field of requiredFields) {
      if (!categoryData[field]) {
        return NextResponse.json({ 
          error: `${field} is required` 
        }, { status: 400 });
      }
    }

    // Create category
    const category = await Category.create({
      ...categoryData,
      createdBy: user._id,
      updatedBy: user._id
    });

    return NextResponse.json({ 
      message: 'Category created successfully',
      category 
    });

  } catch (error) {
    console.error('Error creating category:', error);
    
    if ((error as any).code === 11000) {
      return NextResponse.json({ 
        error: 'Category with this name already exists' 
      }, { status: 400 });
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}