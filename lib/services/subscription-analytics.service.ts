import connectDB from '@/lib/db'
import SadqaSubscription from '@/models/SadqaSubscription'
import CampaignDonation from '@/models/CampaignDonation'

export class SubscriptionAnalyticsService {

  /**
   * Get user subscription statistics
   */
  static async getUserStats(clerkUserId: string) {
    try {
      await connectDB()

      const subscriptions = await SadqaSubscription.find({ clerkUserId }).lean()
      
      if (subscriptions.length === 0) {
        return {
          totalSubscriptions: 0,
          activeSubscriptions: 0,
          totalDonated: 0,
          longestStreakDays: 0,
          favoriteFrequency: null,
          monthlyAverage: 0,
          nextPayments: []
        }
      }

      const stats = {
        totalSubscriptions: subscriptions.length,
        activeSubscriptions: subscriptions.filter(s => s.status === 'active').length,
        totalDonated: subscriptions.reduce((sum, s) => sum + s.totalPaid, 0),
        longestStreakDays: Math.max(...subscriptions.map(s => {
          const daysSinceStart = Math.floor((Date.now() - s.startDate.getTime()) / (1000 * 60 * 60 * 24))
          return s.status === 'active' ? daysSinceStart : 0
        })),
        favoriteFrequency: this.getMostFrequentPlanType(subscriptions),
        monthlyAverage: this.calculateMonthlyAverage(subscriptions),
        nextPayments: subscriptions
          .filter(s => s.status === 'active')
          .map(s => ({
            subscriptionId: s._id,
            planType: s.planType,
            amount: s.amount,
            nextPaymentDate: s.nextPaymentDate
          }))
          .sort((a, b) => a.nextPaymentDate.getTime() - b.nextPaymentDate.getTime())
      }

      return stats
    } catch (error) {
      console.error('Error getting user subscription stats:', error)
      throw error
    }
  }

  /**
   * Get admin dashboard analytics
   */
  static async getAdminAnalytics(period: number = 30) {
    try {
      await connectDB()

      const startDate = new Date()
      startDate.setDate(startDate.getDate() - period)

      // Revenue analytics
      const revenueData = await this.getRevenueAnalytics(startDate)
      
      // Growth analytics
      const growthData = await this.getGrowthAnalytics(startDate)
      
      // Plan distribution
      const planDistribution = await this.getPlanDistribution()
      
      // Payment success rates
      const paymentStats = await this.getPaymentStats(startDate)
      
      // User engagement
      const engagementStats = await this.getEngagementStats()
      
      // Churn analysis
      const churnData = await this.getChurnAnalytics(startDate)

      return {
        revenue: revenueData,
        growth: growthData,
        planDistribution,
        paymentStats,
        engagement: engagementStats,
        churn: churnData,
        period
      }
    } catch (error) {
      console.error('Error getting admin analytics:', error)
      throw error
    }
  }

  /**
   * Generate subscription report data for export
   */
  static async generateReportData(filters: any = {}) {
    try {
      await connectDB()

      const query: any = {}
      
      if (filters.status) query.status = filters.status
      if (filters.planType) query.planType = filters.planType
      if (filters.startDate || filters.endDate) {
        query.createdAt = {}
        if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate)
        if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate)
      }

      const subscriptions = await SadqaSubscription.find(query)
        .sort({ createdAt: -1 })
        .lean()

      // Transform data for export
      const reportData = subscriptions.map(sub => ({
        'Subscription ID': sub._id,
        'User Name': sub.userName,
        'User Email': sub.userEmail,
        'Plan Type': sub.planType,
        'Amount (₹)': sub.amount,
        'Status': sub.status,
        'Start Date': sub.startDate.toLocaleDateString(),
        'Next Payment': sub.nextPaymentDate?.toLocaleDateString() || 'N/A',
        'Total Paid (₹)': sub.totalPaid,
        'Payment Count': sub.paymentCount,
        'Failed Payments': sub.failedPaymentCount,
        'Created At': sub.createdAt.toLocaleDateString()
      }))

      return reportData
    } catch (error) {
      console.error('Error generating report data:', error)
      throw error
    }
  }

  /**
   * Get revenue analytics
   */
  private static async getRevenueAnalytics(startDate: Date) {
    const dailyRevenue = await CampaignDonation.aggregate([
      {
        $match: {
          isRecurring: true,
          status: 'completed',
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          dailyRevenue: { $sum: '$amount' },
          transactionCount: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ])

    const totalRevenue = dailyRevenue.reduce((sum, day) => sum + day.dailyRevenue, 0)
    const totalTransactions = dailyRevenue.reduce((sum, day) => sum + day.transactionCount, 0)

    return {
      daily: dailyRevenue,
      total: totalRevenue,
      transactions: totalTransactions,
      averagePerDay: dailyRevenue.length > 0 ? totalRevenue / dailyRevenue.length : 0
    }
  }

  /**
   * Get growth analytics
   */
  private static async getGrowthAnalytics(startDate: Date) {
    const dailyGrowth = await SadqaSubscription.aggregate([
      {
        $match: { createdAt: { $gte: startDate } }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          newSubscriptions: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ])

    return {
      daily: dailyGrowth,
      totalNew: dailyGrowth.reduce((sum, day) => sum + day.newSubscriptions, 0)
    }
  }

  /**
   * Get plan distribution
   */
  private static async getPlanDistribution() {
    return await SadqaSubscription.aggregate([
      {
        $group: {
          _id: '$planType',
          count: { $sum: 1 },
          totalRevenue: { $sum: '$totalPaid' },
          avgAmount: { $avg: '$amount' },
          activeCount: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          }
        }
      }
    ])
  }

  /**
   * Get payment statistics
   */
  private static async getPaymentStats(startDate: Date) {
    const stats = await CampaignDonation.aggregate([
      {
        $match: {
          isRecurring: true,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ])

    const totalPayments = stats.reduce((sum, s) => sum + s.count, 0)
    const successfulPayments = stats.find(s => s._id === 'completed')?.count || 0

    return {
      success: successfulPayments,
      failed: stats.find(s => s._id === 'failed')?.count || 0,
      pending: stats.find(s => s._id === 'pending')?.count || 0,
      total: totalPayments,
      successRate: totalPayments > 0 ? (successfulPayments / totalPayments) * 100 : 0
    }
  }

  /**
   * Get engagement statistics
   */
  private static async getEngagementStats() {
    const stats = await SadqaSubscription.aggregate([
      {
        $group: {
          _id: '$clerkUserId',
          subscriptionCount: { $sum: 1 },
          totalDonated: { $sum: '$totalPaid' },
          avgSubscriptionDuration: {
            $avg: {
              $divide: [
                { $subtract: [new Date(), '$startDate'] },
                1000 * 60 * 60 * 24
              ]
            }
          }
        }
      },
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          avgSubscriptionsPerUser: { $avg: '$subscriptionCount' },
          avgDonationPerUser: { $avg: '$totalDonated' },
          avgRetentionDays: { $avg: '$avgSubscriptionDuration' }
        }
      }
    ])

    return stats[0] || {
      totalUsers: 0,
      avgSubscriptionsPerUser: 0,
      avgDonationPerUser: 0,
      avgRetentionDays: 0
    }
  }

  /**
   * Get churn analytics
   */
  private static async getChurnAnalytics(startDate: Date) {
    const churnData = await SadqaSubscription.aggregate([
      {
        $match: {
          status: { $in: ['cancelled', 'expired'] },
          endDate: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$endDate' },
            month: { $month: '$endDate' },
            day: { $dayOfMonth: '$endDate' }
          },
          churnedSubscriptions: { $sum: 1 },
          churnedRevenue: { $sum: '$amount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ])

    return {
      daily: churnData,
      totalChurned: churnData.reduce((sum, day) => sum + day.churnedSubscriptions, 0)
    }
  }

  /**
   * Get most frequent plan type
   */
  private static getMostFrequentPlanType(subscriptions: any[]) {
    const planCounts = subscriptions.reduce((acc, sub) => {
      acc[sub.planType] = (acc[sub.planType] || 0) + 1
      return acc
    }, {})

    return Object.keys(planCounts).reduce((a, b) => 
      planCounts[a] > planCounts[b] ? a : b
    )
  }

  /**
   * Calculate monthly average donation
   */
  private static calculateMonthlyAverage(subscriptions: any[]) {
    const monthlyAmounts = subscriptions.map(sub => {
      switch (sub.planType) {
        case 'daily': return sub.amount * 30
        case 'weekly': return sub.amount * 4.33
        case 'monthly': return sub.amount
        case 'yearly': return sub.amount / 12
        default: return 0
      }
    })

    return monthlyAmounts.reduce((sum, amount) => sum + amount, 0)
  }
}