import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import connectDB from '@/lib/db';
import FamilyMember from '@/models/FamilyMember';
import Category from '@/models/Category';
import Sponsorship from '@/models/Sponsorship';
import { RazorpaySubscriptionService } from '@/lib/services/razorpay-subscription.service';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    await connectDB();
    
    // Clean up problematic index if it exists
    try {
      const mongoose = await import('mongoose');
      const db = mongoose.default.connection.db;
      if (db) {
        const collection = db.collection('sponsorships');
        try {
          await collection.dropIndex('sponsorshipId_1');
          console.log('Dropped problematic sponsorshipId_1 index');
        } catch (indexError) {
          // Index doesn't exist, that's fine
        }
      }
    } catch (cleanupError) {
      console.log('Index cleanup skipped:', cleanupError);
    }
    
    const body = await request.json();
    const { beneficiaryId, monthlyAmount, notes } = body;

    // Validate input
    if (!beneficiaryId || !monthlyAmount || monthlyAmount <= 0) {
      return NextResponse.json({ error: 'Invalid input data' }, { status: 400 });
    }

    // Get beneficiary details
    const beneficiary = await FamilyMember.findById(beneficiaryId);
    if (!beneficiary) {
      return NextResponse.json({ error: 'Beneficiary not found' }, { status: 404 });
    }

    // Check if available for sponsorship
    if (!beneficiary.sponsorship?.availableForSponsorship || beneficiary.sponsorship?.isSponsored) {
      return NextResponse.json({ error: 'Beneficiary not available for sponsorship' }, { status: 400 });
    }

    // Get category details first
    const category = await Category.findOne({ 
      slug: beneficiary.sponsorship.category,
      type: 'sponsorship',
      active: true 
    });

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Get sponsor details from Clerk first (needed for both new and resumed sponsorships)
    const { clerkClient } = await import('@clerk/nextjs/server');
    const client = await clerkClient();
    const sponsor = await client.users.getUser(userId);

    const sponsorName = sponsor.firstName && sponsor.lastName 
      ? `${sponsor.firstName} ${sponsor.lastName}` 
      : (sponsor.username || 'Anonymous Sponsor');
    const sponsorEmail = sponsor.emailAddresses?.[0]?.emailAddress || '';
    const sponsorPhone = sponsor.phoneNumbers?.[0]?.phoneNumber;

    // Check if sponsor already has an ACTIVE sponsorship for this beneficiary
    console.log('Checking for existing sponsorship:', { userId, beneficiaryId });
    const existingSponsorship = await Sponsorship.findOne({
      sponsorId: userId,
      beneficiaryId: beneficiaryId,
      status: 'active' // Only check for active sponsorships
    });

    console.log('Existing active sponsorship query result:', existingSponsorship);

    if (existingSponsorship) {
      console.log('Found existing active sponsorship:', existingSponsorship);
      return NextResponse.json({ 
        error: 'You are already actively sponsoring this beneficiary' 
      }, { status: 400 });
    }

    // Check for pending sponsorship and clean it up (for now, always clean up to allow fresh start)
    const pendingSponsorship = await Sponsorship.findOne({
      sponsorId: userId,
      beneficiaryId: beneficiaryId,
      status: 'pending'
    });

    if (pendingSponsorship) {
      console.log('Cleaning up pending sponsorship to allow fresh start:', pendingSponsorship._id);
      await Sponsorship.findByIdAndDelete(pendingSponsorship._id);
    }

    // Validate minimum amount
    const requiredAmount = beneficiary.sponsorship.monthlyRequirement || category.defaultMonthlyAmount || 0;
    if (monthlyAmount < requiredAmount) {
      return NextResponse.json({ 
        error: `Minimum monthly amount is ₹${requiredAmount}` 
      }, { status: 400 });
    }

    // Create Razorpay plan
    const planResult = await RazorpaySubscriptionService.createPlan(
      monthlyAmount, 
      category.label
    );

    if (!planResult.success || !planResult.planId) {
      return NextResponse.json({ 
        error: 'Failed to create payment plan' 
      }, { status: 500 });
    }

    // Skip customer creation for now - create subscription directly
    console.log('Creating subscription without customer ID to avoid conflicts');

    // Create Razorpay subscription
    const subscriptionResult = await RazorpaySubscriptionService.createSubscription({
      planId: planResult.planId,
      notes: {
        beneficiaryId: beneficiaryId,
        categorySlug: category.slug,
        sponsorId: userId
      }
    });

    if (!subscriptionResult.success) {
      console.error('Subscription creation failed:', subscriptionResult.error);
      return NextResponse.json({ 
        error: subscriptionResult.error || 'Failed to create subscription' 
      }, { status: 500 });
    }

    console.log('Subscription created successfully:', subscriptionResult.subscriptionId);

    // Create sponsorship record
    const sponsorship = new Sponsorship({
      sponsorId: userId,
      sponsorName,
      sponsorEmail,
      sponsorPhone: sponsorPhone || undefined,
      beneficiaryId,
      beneficiaryName: `${beneficiary.relationship} (Age ${beneficiary.age})`,
      categoryId: category._id,
      categoryName: category.label,
      monthlyAmount,
      requiredAmount: requiredAmount,
      description: beneficiary.sponsorship.description || `Monthly support for ${category.label}`,
      razorpayPlanId: planResult.planId,
      razorpaySubscriptionId: subscriptionResult.subscriptionId,
      razorpayCustomerId: undefined, // Skip customer ID for now
      status: 'pending',
      notes
    });

    await sponsorship.save();

    // Prepare Razorpay checkout options
    const razorpayOptions = {
      key: process.env.RAZORPAY_KEY_ID,
      subscription_id: subscriptionResult.subscriptionId,
      name: 'KMWF Sponsorship',
      description: `Monthly sponsorship for ${category.label}`,
      image: '/android-chrome-512x512.png',
      prefill: {
        name: sponsorName,
        email: sponsorEmail
      },
      notes: {
        sponsorshipId: sponsorship._id.toString(),
        beneficiaryId,
        categorySlug: category.slug
      },
      theme: {
        color: '#3B82F6'
      }
    };

    const response = {
      success: true,
      sponsorshipId: sponsorship._id,
      subscriptionId: subscriptionResult.subscriptionId,
      razorpayOptions
    };

    console.log('Sending response to frontend:', JSON.stringify(response, null, 2));
    return NextResponse.json(response);

  } catch (error) {
    console.error('Error creating sponsorship:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}