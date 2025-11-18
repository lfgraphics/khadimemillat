import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import FamilyMember from '@/models/FamilyMember';
import Category from '@/models/Category';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    const beneficiaryId = (await params).id;
    
    // Get beneficiary details
    const beneficiary = await FamilyMember.findById(beneficiaryId)
      .select('age relationship healthStatus hasDisability familySize dependentsCount sponsorship')
      .lean();

    if (!beneficiary) {
      return NextResponse.json({ error: 'Beneficiary not found' }, { status: 404 });
    }

    // Check if available for sponsorship
    const beneficiaryData = Array.isArray(beneficiary) ? beneficiary[0] : beneficiary;
    if (!beneficiaryData?.sponsorship?.availableForSponsorship || beneficiaryData?.sponsorship?.isSponsored) {
      return NextResponse.json({ error: 'Beneficiary not available for sponsorship' }, { status: 400 });
    }

    // Get category details
    const category = await Category.findOne({ 
      slug: beneficiaryData.sponsorship.category,
      type: 'sponsorship',
      active: true 
    }).lean();

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      beneficiary: beneficiaryData,
      category
    });

  } catch (error) {
    console.error('Error fetching beneficiary:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}