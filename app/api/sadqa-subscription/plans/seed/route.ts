import { NextResponse } from 'next/server'
import { checkRole } from '@/utils/roles'
import connectDB from '@/lib/db'
import SadqaSubscriptionPlan from '@/models/SadqaSubscriptionPlan'

export async function POST() {
  try {
    // Check if user is admin or moderator
    const isAdmin = await checkRole('admin')
    const isModerator = await checkRole('moderator')
    
    if (!isAdmin && !isModerator) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    await connectDB()

    // Check if plans already exist
    const existingPlans = await SadqaSubscriptionPlan.countDocuments()
    if (existingPlans > 0) {
      return NextResponse.json({
        success: false,
        error: 'Subscription plans already exist'
      })
    }

    // Default subscription plans
    const defaultPlans = [
      {
        planType: 'daily',
        displayName: 'Daily Sadqa',
        description: 'Make a difference every day with your daily contribution',
        minAmount: 1,
        maxAmount: 500,
        suggestedAmount: 50,
        intervalCount: 1,
        intervalUnit: 'day',
        isActive: true,
        displayOrder: 1
      },
      {
        planType: 'weekly',
        displayName: 'Weekly Sadqa',
        description: 'Weekly contributions for consistent community support',
        minAmount: 1,
        maxAmount: 2000,
        suggestedAmount: 200,
        intervalCount: 1,
        intervalUnit: 'week',
        isActive: true,
        displayOrder: 2
      },
      {
        planType: 'monthly',
        displayName: 'Monthly Sadqa',
        description: 'Monthly giving for sustained welfare programs',
        minAmount: 1,
        maxAmount: 10000,
        suggestedAmount: 500,
        intervalCount: 1,
        intervalUnit: 'month',
        isActive: true,
        displayOrder: 3
      },
      {
        planType: 'yearly',
        displayName: 'Yearly Sadqa',
        description: 'Annual commitment for long-term community impact',
        minAmount: 1,
        maxAmount: 100000,
        suggestedAmount: 5000,
        intervalCount: 1,
        intervalUnit: 'year',
        isActive: true,
        displayOrder: 4
      }
    ]

    // Insert default plans
    await SadqaSubscriptionPlan.insertMany(defaultPlans)

    return NextResponse.json({
      success: true,
      message: 'Default subscription plans created successfully',
      count: defaultPlans.length
    })
  } catch (error) {
    console.error('Error seeding subscription plans:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to seed subscription plans' 
      },
      { status: 500 }
    )
  }
}