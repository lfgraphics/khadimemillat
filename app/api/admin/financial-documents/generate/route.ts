import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { checkRole } from '@/lib/auth'
import connectDB from '@/lib/db'
import FinancialDocument from '@/models/FinancialDocument'
import OfflineDonation from '@/models/OfflineDonation'
import Purchase from '@/models/Purchase'
import ScrapItem from '@/models/ScrapItem'
import CampaignDonation from '@/models/CampaignDonation'
import SadqaSubscription from '@/models/SadqaSubscription'
import SurveyResponse from '@/models/SurveyResponse'
import ExpenseEntry from '@/models/ExpenseEntry'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user has admin or moderator role
    const hasAccess = await checkRole(['admin', 'moderator'])
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    await connectDB()

    const body = await request.json()
    const { documentType, year, quarter, month, title, description } = body

    // Validate required fields
    if (!documentType || !year || !title) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Calculate period dates
    let startDate: Date, endDate: Date
    
    if (documentType === 'annual_report') {
      startDate = new Date(year, 0, 1)
      endDate = new Date(year + 1, 0, 1)
    } else if (documentType === 'quarterly_report' && quarter) {
      startDate = new Date(year, (quarter - 1) * 3, 1)
      endDate = new Date(year, quarter * 3, 1)
    } else if (documentType === 'monthly_report' && month) {
      startDate = new Date(year, month - 1, 1)
      endDate = new Date(year, month, 1)
    } else {
      return NextResponse.json(
        { error: 'Invalid period parameters' },
        { status: 400 }
      )
    }

    // Fetch financial data for the period from existing collections
    const [
      offlineDonations,
      purchases,
      scrapItems,
      campaignDonations,
      subscriptions,
      surveyResponses,
      expenses
    ] = await Promise.all([
      OfflineDonation.find({
        receivedAt: { $gte: startDate, $lt: endDate }
      }).lean(),
      
      Purchase.find({
        createdAt: { $gte: startDate, $lt: endDate },
        paymentStatus: 'completed'
      }).lean(),
      
      ScrapItem.find({
        createdAt: { $gte: startDate, $lt: endDate },
        'marketplaceListing.sold': true
      }).lean(),
      
      CampaignDonation.find({
        createdAt: { $gte: startDate, $lt: endDate }
      }).lean(),
      
      SadqaSubscription.find({
        createdAt: { $gte: startDate, $lt: endDate },
        status: { $in: ['active', 'completed'] }
      }).lean(),
      
      SurveyResponse.find({
        createdAt: { $gte: startDate, $lt: endDate }
      }).lean(),

      // Include expenses if they exist
      ExpenseEntry.find({
        expenseDate: { $gte: startDate, $lt: endDate },
        isDeleted: false
      }).populate('category').lean().catch(() => [])
    ])

    // Calculate summary
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0)
    const totalOfflineDonations = offlineDonations.reduce((sum, donation) => sum + donation.amount, 0)
    const totalPurchases = purchases.reduce((sum, purchase) => sum + purchase.totalAmount, 0)
    const totalScrapRevenue = scrapItems.reduce((sum, item) => sum + (item.marketplaceListing?.salePrice || 0), 0)
    const totalCampaignDonations = campaignDonations.reduce((sum, donation) => sum + donation.amount, 0)
    const totalSubscriptions = subscriptions.reduce((sum, sub) => sum + sub.amount, 0)
    const totalDonations = totalOfflineDonations + totalPurchases + totalScrapRevenue + totalCampaignDonations + totalSubscriptions

    const beneficiariesHelped = surveyResponses.reduce((sum, survey) => {
      return sum + (survey.familyMembers?.length || 0) + 1
    }, 0)

    // Get unique expense categories
    const programsSupported = new Set(expenses.map(e => e.category?._id?.toString())).size

    // Create financial document record
    const document = new FinancialDocument({
      title,
      description,
      documentType,
      period: {
        startDate,
        endDate,
        year,
        quarter,
        month
      },
      generatedBy: userId,
      isPublic: true,
      memberAccessLevel: 'verified_only',
      summary: {
        totalDonations,
        totalExpenses,
        netAmount: totalDonations - totalExpenses,
        beneficiariesHelped,
        programsSupported
      },
      metadata: {
        version: '1.0',
        generationMethod: 'manual',
        dataSourcePeriod: {
          from: startDate,
          to: endDate
        }
      }
    })

    await document.save()

    return NextResponse.json({
      success: true,
      message: 'Financial document generated successfully',
      document: {
        id: document._id,
        title: document.title,
        documentType: document.documentType,
        period: document.period,
        summary: document.summary
      }
    })

  } catch (error) {
    console.error('Generate financial document error:', error)
    return NextResponse.json(
      { error: 'Failed to generate financial document' },
      { status: 500 }
    )
  }
}