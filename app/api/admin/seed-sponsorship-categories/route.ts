import { NextResponse } from 'next/server'
import { checkRole } from '@/utils/roles'
import connectDB from '@/lib/db'
import Category from '@/models/Category'

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

    // Check if sponsorship categories already exist
    const existingCategories = await Category.countDocuments({ type: 'sponsorship' })
    if (existingCategories > 0) {
      return NextResponse.json({
        success: false,
        error: 'Sponsorship categories already exist'
      })
    }

    // Default sponsorship categories
    const defaultCategories = [
      {
        slug: 'child-education',
        label: 'Child Education Support',
        description: 'Support children\'s education with school fees, books, and supplies',
        type: 'sponsorship',
        defaultMonthlyAmount: 2000,
        active: true
      },
      {
        slug: 'widow-support',
        label: 'Widow Family Support',
        description: 'Provide monthly support to widowed mothers and their families',
        type: 'sponsorship',
        defaultMonthlyAmount: 3000,
        active: true
      },
      {
        slug: 'elderly-care',
        label: 'Elderly Care Support',
        description: 'Support elderly family members with healthcare and daily needs',
        type: 'sponsorship',
        defaultMonthlyAmount: 2500,
        active: true
      },
      {
        slug: 'disability-support',
        label: 'Disability Support',
        description: 'Assist families with disabled members for special care and therapy',
        type: 'sponsorship',
        defaultMonthlyAmount: 3500,
        active: true
      },
      {
        slug: 'orphan-care',
        label: 'Orphan Care',
        description: 'Support orphaned children with housing, education, and care',
        type: 'sponsorship',
        defaultMonthlyAmount: 4000,
        active: true
      },
      {
        slug: 'family-support',
        label: 'General Family Support',
        description: 'Provide comprehensive support to families in need',
        type: 'sponsorship',
        defaultMonthlyAmount: 2500,
        active: true
      }
    ]

    // Insert default categories
    await Category.insertMany(defaultCategories)

    return NextResponse.json({
      success: true,
      message: 'Default sponsorship categories created successfully',
      count: defaultCategories.length
    })
  } catch (error) {
    console.error('Error seeding sponsorship categories:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to seed sponsorship categories' 
      },
      { status: 500 }
    )
  }
}