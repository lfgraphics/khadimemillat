import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import connectDB from '@/lib/db'
import SadqaSubscriptionPlan from '@/models/SadqaSubscriptionPlan'
import { checkRole } from '@/lib/auth'

const defaultPlans = [
  {
    planType: 'daily',
    displayName: 'Weekly Sadqa',
    description: 'Weekly contributions for consistent giving habit',
    minAmount: 50,
    maxAmount: 500,
    suggestedAmount: 100,
    intervalCount: 1,
    intervalUnit: 'week',
    isActive: true,
    displayOrder: 1
  },
  {
    planType: 'weekly',
    displayName: 'Bi-Weekly Sadqa',
    description: 'Every two weeks giving for balanced commitment',
    minAmount: 100,
    maxAmount: 1000,
    suggestedAmount: 300,
    intervalCount: 2,
    intervalUnit: 'week',
    isActive: true,
    displayOrder: 2
  },
  {
    planType: 'monthly',
    displayName: 'Monthly Support',
    description: 'Monthly recurring donations for sustained impact',
    minAmount: 200,
    maxAmount: 2000,
    suggestedAmount: 500,
    intervalCount: 1,
    intervalUnit: 'month',
    isActive: true,
    displayOrder: 3
  },
  {
    planType: 'yearly',
    displayName: 'Annual Commitment',
    description: 'Yearly contribution plans for long-term support',
    minAmount: 2000,
    maxAmount: 20000,
    suggestedAmount: 6000,
    intervalCount: 1,
    intervalUnit: 'year',
    isActive: true,
    displayOrder: 4
  }
]

export async function GET(request: NextRequest) {
  try {
    // const { userId } = await auth()
    // if (!userId) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    // const hasPermission = await checkRole(['admin'])
    // if (!hasPermission) {
    //   return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    // }

    await connectDB()

    console.log('Seeding subscription plans...')

    const results = []
    for (const planData of defaultPlans) {
      const plan = await SadqaSubscriptionPlan.findOneAndUpdate(
        { planType: planData.planType },
        planData,
        { upsert: true, new: true }
      )
      results.push(plan)
      console.log(`✓ Seeded ${planData.displayName} plan`)
    }

    return NextResponse.json({
      success: true,
      message: 'Subscription plans seeded successfully',
      plans: results
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