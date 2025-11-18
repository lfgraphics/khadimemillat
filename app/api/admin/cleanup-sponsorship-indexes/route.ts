import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import mongoose from 'mongoose';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    await connectDB();
    
    // Check if user is admin
    const user = await User.findOne({ clerkUserId: userId });
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
    }
    
    const collection = db.collection('sponsorships');

    // Get all indexes
    const indexes = await collection.indexes();
    console.log('Current indexes:', indexes);

    // Drop problematic sponsorshipId index if it exists
    try {
      await collection.dropIndex('sponsorshipId_1');
      console.log('Dropped sponsorshipId_1 index');
    } catch (error) {
      console.log('sponsorshipId_1 index does not exist or already dropped');
    }

    // Ensure correct indexes exist
    await collection.createIndex({ razorpaySubscriptionId: 1 }, { unique: true });
    await collection.createIndex({ sponsorId: 1, status: 1 });
    await collection.createIndex({ beneficiaryId: 1, status: 1 });
    await collection.createIndex({ categoryId: 1, status: 1 });

    return NextResponse.json({
      success: true,
      message: 'Sponsorship indexes cleaned up successfully'
    });

  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json(
      { error: 'Cleanup failed' },
      { status: 500 }
    );
  }
}