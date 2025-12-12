import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import connectDB from '@/lib/db'
import MembershipRequest from '@/models/MembershipRequest'

// Smart amount formatting function
function formatAmount(amount: number): string {
  if (amount === 0) return '₹0'
  
  const absAmount = Math.abs(amount)
  
  if (absAmount >= 10000000) { // 1 crore and above
    return `₹${(amount / 10000000).toFixed(1)}Cr`
  } else if (absAmount >= 100000) { // 1 lakh and above
    return `₹${(amount / 100000).toFixed(1)}L`
  } else if (absAmount >= 1000) { // 1 thousand and above
    return `₹${(amount / 1000).toFixed(1)}K`
  } else {
    return `₹${amount.toLocaleString('en-IN')}`
  }
}
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  FileText, 
  Download,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react'
import Loading from '@/components/Loading'
import Link from 'next/link'

async function getMembershipStatus(userId: string) {
  await connectDB()
  
  const membership = await MembershipRequest.findOne({ 
    userId, 
    status: 'approved' 
  }).lean()

  if (!membership) return null

  return {
    membershipId: (membership as any).membershipId,
    membershipStartDate: (membership as any).membershipStartDate?.toISOString()
  }
}

async function getFinancialReports(year?: number) {
  try {
    // Import the API logic directly instead of making HTTP calls
    const { auth } = await import('@clerk/nextjs/server')
    const { checkRole } = await import('@/lib/auth')
    const connectDB = (await import('@/lib/db')).default
    const OfflineDonation = (await import('@/models/OfflineDonation')).default
    const Purchase = (await import('@/models/Purchase')).default
    const ScrapItem = (await import('@/models/ScrapItem')).default
    const CampaignDonation = (await import('@/models/CampaignDonation')).default
    const SadqaSubscription = (await import('@/models/SadqaSubscription')).default
    const SurveyResponse = (await import('@/models/SurveyResponse')).default
    const ExpenseEntry = (await import('@/models/ExpenseEntry')).default

    const { userId } = await auth()
    
    if (!userId) {
      throw new Error('Unauthorized')
    }

    // Check if user has member role
    const isMember = await checkRole(['member', 'admin', 'moderator'])
    if (!isMember) {
      throw new Error('Member access required')
    }

    await connectDB()

    const currentYear = year || new Date().getFullYear()
    const startDate = new Date(currentYear, 0, 1)
    const endDate = new Date(currentYear + 1, 0, 1)

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
      const monthStart = new Date(currentYear, month, 1)
      const monthEnd = new Date(currentYear, month + 1, 1)
      
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
        month: new Date(currentYear, month).toLocaleDateString('en-US', { month: 'short' }),
        donations: monthDonations,
        expenses: monthExpenses
      })
    }

    // Program breakdown based on actual data
    const programBreakdownData = {
      'Scrap Collection Revenue': totalScrapRevenue,
      'Offline Donations': totalOfflineDonations,
      'Marketplace Sales': totalPurchases,
      'Campaign Donations': totalCampaignDonations,
      'Recurring Subscriptions': totalSubscriptions
    }

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

    return {
      summary,
      monthlyData,
      programBreakdown,
      year: currentYear
    }

  } catch (error) {
    console.error('Error fetching financial reports:', error)
    // Return fallback data if API fails
    return {
      summary: {
        totalDonations: 0,
        totalExpenses: 0,
        beneficiariesHelped: 0,
        activePrograms: 0
      },
      monthlyData: [],
      programBreakdown: []
    }
  }
}

async function getFinancialDocuments() {
  try {
    // Import the API logic directly instead of making HTTP calls
    const { auth } = await import('@clerk/nextjs/server')
    const { checkRole } = await import('@/lib/auth')
    const connectDB = (await import('@/lib/db')).default
    const FinancialDocument = (await import('@/models/FinancialDocument')).default

    const { userId } = await auth()
    
    if (!userId) {
      throw new Error('Unauthorized')
    }

    // Check if user has member role
    const isMember = await checkRole(['member', 'admin', 'moderator'])
    if (!isMember) {
      throw new Error('Member access required')
    }

    await connectDB()

    // Fetch documents accessible to members
    const documents = await FinancialDocument.find({
      $or: [
        { isPublic: true },
        { memberAccessLevel: { $in: ['all', 'verified_only'] } }
      ]
    })
    .sort({ generatedAt: -1 })
    .lean()

    return documents.map((doc: any) => ({
      _id: doc._id.toString(),
      name: doc.title,
      type: doc.documentType,
      size: doc.fileSize ? `${(doc.fileSize / 1024 / 1024).toFixed(2)} MB` : 'N/A',
      date: doc.generatedAt.toISOString(),
      downloadUrl: doc.fileUrl,
      summary: doc.summary
    }))

  } catch (error) {
    console.error('Error fetching documents:', error)
    return []
  }
}

async function MemberDashboardContent() {
  const { userId } = await auth()
  
  if (!userId) {
    redirect('/sign-in')
  }

  const membership = await getMembershipStatus(userId)

  if (!membership) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">
              Membership Required
            </CardTitle>
            <CardDescription>
              You need to be a verified member to access this dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Apply for membership to access detailed financial reports and member-exclusive features.
            </p>
            <Link href="/membership/request">
              <Button className="w-full">
                Apply for Membership
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const [reports, documents] = await Promise.all([
    getFinancialReports(),
    getFinancialDocuments()
  ])

  return (
    <div className="min-h-screen">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              Member Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">
              Welcome back! Access your exclusive member reports and insights.
            </p>
          </div>
          <div className="text-right">
            <Badge className="bg-primary/10 text-primary">
              <Users className="w-3 h-3 mr-1" />
              Verified Member
            </Badge>
            <p className="text-sm text-muted-foreground mt-1">
              ID: {membership.membershipId}
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {formatAmount(reports.summary.totalDonations)}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Donations</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-secondary-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {formatAmount(reports.summary.totalExpenses)}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Expenses</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {reports.summary.beneficiariesHelped.toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">Beneficiaries Helped</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                  <Activity className="w-6 h-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {reports.summary.activePrograms}
                  </p>
                  <p className="text-sm text-muted-foreground">Active Programs</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Reports Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className={`grid w-full ${
            // Calculate number of tabs based on available data
            (() => {
              let tabCount = 1 // Always show overview
              if (reports.monthlyData.some((data: any) => data.donations > 0 || data.expenses > 0)) tabCount++
              if (reports.programBreakdown.length > 0) tabCount++
              tabCount++ // Always show documents tab
              return `grid-cols-${tabCount}`
            })()
          }`}>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            {reports.monthlyData.some((data: any) => data.donations > 0 || data.expenses > 0) && (
              <TabsTrigger value="monthly">Monthly Reports</TabsTrigger>
            )}
            {reports.programBreakdown.length > 0 && (
              <TabsTrigger value="programs">Program Breakdown</TabsTrigger>
            )}
            <TabsTrigger value="documents">Documents</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Only show financial overview if there's data */}
              {reports.monthlyData.some((data: any) => data.donations > 0 || data.expenses > 0) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      Financial Overview
                    </CardTitle>
                    <CardDescription>
                      Monthly donation and expense trends
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {reports.monthlyData
                        .filter((data: any) => data.donations > 0 || data.expenses > 0)
                        .slice(-3)
                        .map((data: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div>
                            <p className="font-medium">{data.month} {reports.year}</p>
                            <p className="text-sm text-muted-foreground">
                              Net: {formatAmount(data.donations - data.expenses)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-primary">+{formatAmount(data.donations)}</p>
                            <p className="text-sm text-destructive">-{formatAmount(data.expenses)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Only show impact summary if there's meaningful data */}
              {(reports.summary.totalDonations > 0 || reports.summary.beneficiariesHelped > 0 || reports.summary.activePrograms > 0) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChart className="w-5 h-5" />
                      Impact Summary
                    </CardTitle>
                    <CardDescription>
                      Key metrics and achievements
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {reports.summary.totalDonations > 0 && (
                        <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
                          <div>
                            <p className="font-medium text-primary">Efficiency Rate</p>
                            <p className="text-sm text-primary/80">
                              {((reports.summary.totalExpenses / reports.summary.totalDonations) * 100).toFixed(1)}% of donations utilized
                            </p>
                          </div>
                          <div className="text-2xl font-bold text-primary">
                            {(100 - (reports.summary.totalExpenses / reports.summary.totalDonations) * 100).toFixed(1)}%
                          </div>
                        </div>
                      )}

                      {reports.summary.beneficiariesHelped > 0 && (
                        <div className="flex items-center justify-between p-3 bg-secondary/10 rounded-lg">
                          <div>
                            <p className="font-medium text-secondary-foreground">Cost per Beneficiary</p>
                            <p className="text-sm text-secondary-foreground/80">
                              Average support cost
                            </p>
                          </div>
                          <div className="text-2xl font-bold text-secondary-foreground">
                            {formatAmount(Math.round(reports.summary.totalExpenses / reports.summary.beneficiariesHelped))}
                          </div>
                        </div>
                      )}

                      {reports.summary.activePrograms > 0 && (
                        <div className="flex items-center justify-between p-3 bg-accent/10 rounded-lg">
                          <div>
                            <p className="font-medium text-accent-foreground">Program Coverage</p>
                            <p className="text-sm text-accent-foreground/80">
                              Active welfare programs
                            </p>
                          </div>
                          <div className="text-2xl font-bold text-accent-foreground">
                            {reports.summary.activePrograms}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="monthly" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Financial Reports</CardTitle>
                <CardDescription>
                  Detailed breakdown of monthly donations and expenses
                </CardDescription>
              </CardHeader>
              <CardContent>
                {reports.monthlyData.filter((data: any) => data.donations > 0 || data.expenses > 0).length === 0 ? (
                  <div className="text-center py-8">
                    <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No financial activity recorded yet</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Monthly reports will appear here once donations and expenses are recorded
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reports.monthlyData
                      .filter((data: any) => data.donations > 0 || data.expenses > 0)
                      .map((data: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">{data.month} {reports.year}</p>
                          <p className="text-sm text-muted-foreground">
                            Net Impact: {formatAmount(data.donations - data.expenses)}
                          </p>
                        </div>
                        <div className="text-right space-y-1">
                          <div className="flex items-center gap-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Donations</p>
                              <p className="font-medium text-primary">{formatAmount(data.donations)}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Expenses</p>
                              <p className="font-medium text-destructive">{formatAmount(data.expenses)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="programs" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Program-wise Fund Allocation</CardTitle>
                <CardDescription>
                  How your donations are distributed across different welfare programs
                </CardDescription>
              </CardHeader>
              <CardContent>
                {reports.programBreakdown.length === 0 ? (
                  <div className="text-center py-8">
                    <PieChart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No program data available yet</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Program breakdown will appear here once donations are allocated to specific programs
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reports.programBreakdown.map((program: any, index: number) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{program.program}</p>
                          <div className="text-right">
                            <p className="font-medium">{formatAmount(program.amount)}</p>
                            <p className="text-sm text-muted-foreground">{program.percentage}%</p>
                          </div>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full transition-all duration-300"
                            style={{ width: `${program.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Financial Documents
                </CardTitle>
                <CardDescription>
                  Download detailed financial reports and audit documents
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {documents.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No financial documents available yet</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Documents will appear here once generated by administrators
                      </p>
                    </div>
                  ) : (
                    documents.map((doc: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <FileText className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{doc.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {doc.type} • {doc.size} • {new Date(doc.date).toLocaleDateString('en-IN')}
                          </p>
                          {doc.summary && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatAmount(doc.summary.totalDonations)} donations • {doc.summary.beneficiariesHelped} beneficiaries
                            </p>
                          )}
                        </div>
                      </div>
                      {doc.downloadUrl ? (
                        <Link href={doc.downloadUrl} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm">
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </Button>
                        </Link>
                      ) : (
                        <Button variant="outline" size="sm" disabled>
                          <FileText className="w-4 h-4 mr-2" />
                          Generating...
                        </Button>
                      )}
                    </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default function MemberDashboardPage() {
  return (
    <Suspense fallback={<Loading />}>
      <MemberDashboardContent />
    </Suspense>
  )
}

export const metadata = {
  title: 'Member Dashboard - Khadim-e-Millat Welfare Foundation',
  description: 'Access exclusive member reports and financial insights',
}