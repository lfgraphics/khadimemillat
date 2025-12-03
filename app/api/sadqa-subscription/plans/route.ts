import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import SadqaSubscriptionPlan from '@/models/SadqaSubscriptionPlan'

export async function GET(request: NextRequest) {
  try {
    await connectDB()

    const plans = await SadqaSubscriptionPlan.find({ isActive: true })
      .sort({ displayOrder: 1 })
      .lean()

    return NextResponse.json({
      success: true,
      plans
    })
  } catch (error) {
    console.error('Error fetching subscription plans:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch subscription plans' 
      },
      { status: 500 }
    )
  }
}