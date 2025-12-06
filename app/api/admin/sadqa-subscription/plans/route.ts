import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import connectDB from '@/lib/db'
import SadqaSubscriptionPlan from '@/models/SadqaSubscriptionPlan'
import { checkRole } from '@/utils/roles'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isAdmin = await checkRole('admin')
    const isModerator = await checkRole('moderator')
    
    if (!isAdmin && !isModerator) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    await connectDB()

    const plans = await SadqaSubscriptionPlan.find()
      .sort({ displayOrder: 1 })
      .lean()

    return NextResponse.json({
      success: true,
      plans
    })
  } catch (error) {
    console.error('Error fetching admin subscription plans:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch subscription plans' 
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isAdmin = await checkRole('admin')
    const isModerator = await checkRole('moderator')
    
    if (!isAdmin && !isModerator) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const {
      planType,
      displayName,
      description,
      minAmount,
      maxAmount,
      suggestedAmount,
      intervalCount,
      intervalUnit,
      isActive,
      displayOrder
    } = body

    // Validation
    if (!planType || !displayName || !description || !minAmount || !maxAmount || !suggestedAmount || !intervalCount || !intervalUnit) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (maxAmount < minAmount) {
      return NextResponse.json(
        { error: 'Maximum amount must be greater than or equal to minimum amount' },
        { status: 400 }
      )
    }

    if (suggestedAmount < minAmount || suggestedAmount > maxAmount) {
      return NextResponse.json(
        { error: 'Suggested amount must be between minimum and maximum amounts' },
        { status: 400 }
      )
    }

    await connectDB()

    const plan = new SadqaSubscriptionPlan({
      planType,
      displayName,
      description,
      minAmount,
      maxAmount,
      suggestedAmount,
      intervalCount,
      intervalUnit,
      isActive: isActive !== undefined ? isActive : true,
      displayOrder: displayOrder || 0
    })

    await plan.save()

    return NextResponse.json({
      success: true,
      plan
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating subscription plan:', error)
    
    if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
      return NextResponse.json(
        { error: 'Plan type already exists' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create subscription plan' 
      },
      { status: 500 }
    )
  }
}