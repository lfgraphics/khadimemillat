import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { checkRole } from '@/lib/auth'
import connectDB from '@/lib/db'
import OfflineDonation from '@/models/OfflineDonation'
import Purchase from '@/models/Purchase'
import ScrapItem from '@/models/ScrapItem'
import SurveyResponse from '@/models/SurveyResponse'
import CampaignDonation from '@/models/CampaignDonation'
import SadqaSubscription from '@/models/SadqaSubscription'
import ExpenseEntry from '@/models/ExpenseEntry'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user has member role
    const isMember = await checkRole(['member', 'admin', 'moderator'])
    if (!isMember) {
      return NextResponse.json(
        { error: 'Member access required' },
        { status: 403 }
      )
    }

    await connectDB()

    const { searchParams } = new URL(request.url)
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())
    const startDate = new Date(year, 0, 1)
    const endDate = new Date(year + 1, 0, 1)

    // Get financial data from existing collections
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

    // Calculate totals from existing data
    const totalOfflineDonations = offlineDonations.reduce((sum, donation) => sum + donation.amount, 0)
    const totalPurchases = purchases.reduce((sum, purchase) => sum + purchase.totalAmount, 0)
    const totalScrapRevenue = scrapItems.reduce((sum, item) => sum + (item.marketplaceListing?.salePrice || 0), 0)
    const totalCampaignDonations = campaignDonations.reduce((sum, donation) => sum + donation.amount, 0)
    const totalSubscriptions = subscriptions.reduce((sum, sub) => sum + sub.amount, 0)
    const totalExpenses = expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0)
    
    const totalDonations = totalOfflineDonations + totalPurchases + totalScrapRevenue + totalCampaignDonations + totalSubscriptions

    // Calculate beneficiaries helped (from survey responses)
    const beneficiariesHelped = surveyResponses.reduce((sum, survey) => {
      return sum + (survey.familyMembers?.length || 0) + 1 // +1 for head of family
    }, 0)

    // Group data by program/category
    const programBreakdownData = {
      'Scrap Collection Revenue': totalScrapRevenue,
      'Offline Donations': totalOfflineDonations,
      'Marketplace Sales': totalPurchases,
      'Campaign Donations': totalCampaignDonations,
      'Recurring Subscriptions': totalSubscriptions
    }

    // Add expense categories if available
    const expensesByCategory = expenses.reduce((acc, expense) => {
      const categoryName = expense.category?.name || 'General Expenses'
      if (!acc[categoryName]) {
        acc[categoryName] = 0
      }
      acc[categoryName] += expense.amount || 0
      return acc
    }, {} as Record<string, number>)

    // Calculate monthly data
    const monthlyData = []
    for (let month = 0; month < 12; month++) {
      const monthStart = new Date(year, month, 1)
      const monthEnd = new Date(year, month + 1, 1)
      
      const monthExpenses = expenses
        .filter(e => e.expenseDate >= monthStart && e.expenseDate < monthEnd)
        .reduce((sum, e) => sum + (e.amount || 0), 0)
      
      const monthOfflineDonations = offlineDonations
        .filter(d => d.receivedAt >= monthStart && d.receivedAt < monthEnd)
        .reduce((sum, d) => sum + d.amount, 0)
      
      const monthPurchases = purchases
        .filter(p => p.createdAt >= monthStart && p.createdAt < monthEnd)
        .reduce((sum, p) => sum + p.totalAmount, 0)
      
      const monthScrapRevenue = scrapItems
        .filter(item => item.createdAt >= monthStart && item.createdAt < monthEnd)
        .reduce((sum, item) => sum + (item.marketplaceListing?.salePrice || 0), 0)
      
      const monthCampaignDonations = campaignDonations
        .filter(d => d.createdAt >= monthStart && d.createdAt < monthEnd)
        .reduce((sum, d) => sum + d.amount, 0)
      
      const monthSubscriptions = subscriptions
        .filter(s => s.createdAt >= monthStart && s.createdAt < monthEnd)
        .reduce((sum, s) => sum + s.amount, 0)
      
      const monthDonations = monthOfflineDonations + monthPurchases + monthScrapRevenue + monthCampaignDonations + monthSubscriptions

      monthlyData.push({
        month: new Date(year, month).toLocaleDateString('en-US', { month: 'short' }),
        donations: monthDonations,
        expenses: monthExpenses
      })
    }

    // Program breakdown based on actual data
    const programBreakdown = Object.entries(programBreakdownData)
      .filter(([_, amount]) => amount > 0)
      .map(([program, amount]) => ({
        program,
        amount,
        percentage: totalDonations > 0 ? Math.round((amount / totalDonations) * 100) : 0
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5) // Top 5 programs

    const summary = {
      totalDonations,
      totalExpenses,
      beneficiariesHelped,
      activePrograms: Object.keys(expensesByCategory).length
    }

    return NextResponse.json({
      success: true,
      data: {
        summary,
        monthlyData,
        programBreakdown,
        year
      },
      debug: {
        offlineDonationCount: offlineDonations.length,
        purchaseCount: purchases.length,
        scrapItemCount: scrapItems.length,
        campaignDonationCount: campaignDonations.length,
        subscriptionCount: subscriptions.length,
        surveyResponseCount: surveyResponses.length,
        expenseCount: expenses.length
      }
    })

  } catch (error) {
    console.error('Financial reports error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch financial reports' },
      { status: 500 }
    )
  }
}