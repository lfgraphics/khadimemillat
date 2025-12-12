import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { checkRole } from '@/lib/auth'
import connectDB from '@/lib/db'
import ExpenseEntry from '@/models/ExpenseEntry'
import ExpenseCategory from '@/models/ExpenseCategory'
import ScrapItem from '@/models/ScrapItem'
import CampaignDonation from '@/models/CampaignDonation'
import SadqaSubscription from '@/models/SadqaSubscription'
import SurveyResponse from '@/models/SurveyResponse'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user has admin role
    const hasAccess = await checkRole(['admin'])
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    await connectDB()

    // Create sample expense categories if they don't exist
    const categories = [
      { name: 'Education Support', description: 'Educational assistance and scholarships' },
      { name: 'Healthcare Aid', description: 'Medical assistance and healthcare support' },
      { name: 'Food Distribution', description: 'Food assistance and meal programs' },
      { name: 'Emergency Relief', description: 'Emergency assistance and disaster relief' },
      { name: 'Infrastructure', description: 'Infrastructure development and maintenance' }
    ]

    const createdCategories = []
    for (const cat of categories) {
      let category = await ExpenseCategory.findOne({ name: cat.name })
      if (!category) {
        category = await ExpenseCategory.create({
          ...cat,
          createdBy: userId,
          isActive: true
        })
      }
      createdCategories.push(category)
    }

    // Create sample expense entries
    const currentYear = new Date().getFullYear()
    const expenseEntries = []
    
    for (let month = 0; month < 6; month++) {
      for (const category of createdCategories) {
        const amount = Math.floor(Math.random() * 50000) + 10000 // Random amount between 10k-60k
        const expenseDate = new Date(currentYear, month, Math.floor(Math.random() * 28) + 1)
        
        const expense = await ExpenseEntry.create({
          clerkUserId: userId,
          amount,
          category: category._id,
          description: `Sample ${category.name.toLowerCase()} expense`,
          expenseDate,
          currency: 'INR'
        })
        expenseEntries.push(expense)
      }
    }

    // Create sample campaign donations
    const campaignDonations = []
    for (let i = 0; i < 20; i++) {
      const amount = Math.floor(Math.random() * 10000) + 500 // Random amount between 500-10500
      const createdAt = new Date(currentYear, Math.floor(Math.random() * 6), Math.floor(Math.random() * 28) + 1)
      
      const donation = await CampaignDonation.create({
        campaignId: 'sample-campaign-' + i,
        donorName: `Sample Donor ${i + 1}`,
        donorEmail: `donor${i + 1}@example.com`,
        amount,
        paymentMethod: 'online',
        createdAt
      })
      campaignDonations.push(donation)
    }

    // Create sample subscriptions
    const subscriptions = []
    for (let i = 0; i < 10; i++) {
      const amount = Math.floor(Math.random() * 5000) + 100 // Random amount between 100-5100
      const createdAt = new Date(currentYear, Math.floor(Math.random() * 6), Math.floor(Math.random() * 28) + 1)
      
      const subscription = await SadqaSubscription.create({
        clerkUserId: `sample-user-${i}`,
        planType: ['monthly', 'weekly', 'daily'][Math.floor(Math.random() * 3)],
        amount,
        currency: 'INR',
        status: 'active',
        createdAt
      })
      subscriptions.push(subscription)
    }

    // Create sample survey responses (for beneficiaries count)
    const surveyResponses = []
    for (let i = 0; i < 15; i++) {
      const familySize = Math.floor(Math.random() * 6) + 1 // 1-6 family members
      const createdAt = new Date(currentYear, Math.floor(Math.random() * 6), Math.floor(Math.random() * 28) + 1)
      
      const familyMembers = []
      for (let j = 0; j < familySize - 1; j++) { // -1 because head of family is separate
        familyMembers.push({
          name: `Family Member ${j + 1}`,
          age: Math.floor(Math.random() * 60) + 5,
          relation: ['spouse', 'child', 'parent', 'sibling'][Math.floor(Math.random() * 4)]
        })
      }

      const survey = await SurveyResponse.create({
        requestId: `sample-request-${i}`,
        surveyorId: userId,
        headOfFamily: {
          name: `Head of Family ${i + 1}`,
          age: Math.floor(Math.random() * 40) + 25,
          gender: Math.random() > 0.5 ? 'male' : 'female'
        },
        familyMembers,
        createdAt
      })
      surveyResponses.push(survey)
    }

    return NextResponse.json({
      success: true,
      message: 'Sample financial data created successfully',
      data: {
        categories: createdCategories.length,
        expenses: expenseEntries.length,
        campaignDonations: campaignDonations.length,
        subscriptions: subscriptions.length,
        surveyResponses: surveyResponses.length
      }
    })

  } catch (error) {
    console.error('Seed financial data error:', error)
    return NextResponse.json(
      { error: 'Failed to seed financial data' },
      { status: 500 }
    )
  }
}