import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import Category from '@/models/Category';

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
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const resolvedParams = await params;
    const category = await Category.findById(resolvedParams.categoryId);

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json({ category });

  } catch (error) {
    console.error('Error fetching category:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
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
    const updateData = await request.json();

    const category = await Category.findByIdAndUpdate(
      resolvedParams.categoryId,
      {
        ...updateData,
        updatedBy: user._id
      },
      { new: true, runValidators: true }
    );

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      message: 'Category updated successfully',
      category 
    });

  } catch (error) {
    console.error('Error updating category:', error);
    
    if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
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

export async function DELETE(
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

    // Check if category is in use
    // TODO: Add checks for FamilyMember and SurveyResponse usage

    await Category.findByIdAndDelete(resolvedParams.categoryId);

    return NextResponse.json({ 
      message: 'Category deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}