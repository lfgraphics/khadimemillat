import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import FamilyMember from '@/models/FamilyMember';
import Category from '@/models/Category';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
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

    const resolvedParams = await params;
    console.log('Looking for member with ID:', resolvedParams.memberId);
    
    const member = await FamilyMember.findById(resolvedParams.memberId);
    console.log('Found member:', member ? 'Yes' : 'No');

    if (!member) {
      return NextResponse.json({ error: 'Family member not found' }, { status: 404 });
    }

    // First check if we have any categories at all
    const allCategories = await Category.find({ type: 'sponsorship', active: true });
    console.log('Total sponsorship categories in DB:', allCategories.length);
    
    // Get eligible categories for this member
    const eligibleCategories = await (Category as any).getEligibleForMember({
      age: member.age,
      relationship: member.relationship,
      healthStatus: member.healthStatus,
      maritalStatus: member.maritalStatus,
      hasDisability: member.hasDisability
    });
    
    console.log('Eligible categories for member:', eligibleCategories.length);

    return NextResponse.json({ 
      categories: eligibleCategories,
      member: {
        id: member._id,
        name: member.name,
        age: member.age,
        relationship: member.relationship,
        healthStatus: member.healthStatus,
        maritalStatus: member.maritalStatus,
        hasDisability: member.hasDisability
      }
    });

  } catch (error) {
    console.error('Error fetching eligible categories:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}