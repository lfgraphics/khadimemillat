'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  FileText, 
  Settings, 
  Plus,
  BarChart3,
  Calendar,
  Filter
} from 'lucide-react'
import ExpenseList from './ExpenseList'
import ExpenseForm from './ExpenseForm'
import ExpenseDetails from './ExpenseDetails'
import CategoryManager from './CategoryManager'
import ExpenseReports from './ExpenseReports'
import ExpenseAnalytics from './ExpenseAnalytics'
import UserActivityStats from './UserActivityStats'
import { IExpenseEntry } from '@/models/ExpenseEntry'
import { toast } from 'sonner'
import { ExpenseErrorBoundary } from './ExpenseErrorBoundary'
import { ExpenseNotificationProvider, useExpenseNotifications } from './ExpenseNotifications'
import { 
  showExpenseErrorToast, 
  showExpenseSuccessToast,
  ExpenseRetryManager,
  createExpenseErrorFromResponse
} from '@/lib/utils/expense-error-handling'

interface AdminExpensesDashboardProps {
  className?: string
}

interface DashboardAnalytics {
  totalExpenses: number
  totalAmount: number
  averageExpense: number
  topCategories: Array<{ category: string; amount: number; percentage: number }>
  topUsers: Array<{ userId: string; userName: string; userEmail?: string; amount: number; count: number }>
  dailyTrend: Array<{ date: string; amount: number; count: number }>
  monthlyComparison: { currentMonth: number; previousMonth: number; percentageChange: number }
}

function AdminExpensesDashboardContent({ className }: AdminExpensesDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedExpense, setSelectedExpense] = useState<IExpenseEntry | null>(null)
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [editingExpense, setEditingExpense] = useState<IExpenseEntry | null>(null)
  const [retryManager] = useState(() => new ExpenseRetryManager())
  const notifications = useExpenseNotifications()
  
  // Dashboard analytics state
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null)
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(true)
  const [analyticsError, setAnalyticsError] = useState<string | null>(null)
  const [categoriesCount, setCategoriesCount] = useState(0)
  const [recentActivities, setRecentActivities] = useState<Array<{
    id: string
    type: 'expense_created' | 'expense_updated' | 'expense_deleted' | 'category_created' | 'category_updated'
    description: string
    amount?: number
    timestamp: Date
  }>>([])

  // Load dashboard analytics
  const loadAnalytics = useCallback(async () => {
    setIsLoadingAnalytics(true)
    setAnalyticsError(null)

    try {
      const [analyticsResponse, categoriesResponse] = await Promise.all([
        fetch('/api/expenses/analytics?days=30'),
        fetch('/api/expenses/categories?includeInactive=false')
      ])

      if (!analyticsResponse.ok) {
        throw new Error('Failed to load analytics')
      }

      if (!categoriesResponse.ok) {
        throw new Error('Failed to load categories')
      }

      const analyticsData = await analyticsResponse.json()
      const categoriesData = await categoriesResponse.json()

      setAnalytics(analyticsData.analytics)
      setCategoriesCount(categoriesData.categories?.length || 0)

      // Generate recent activities from analytics data
      const activities: Array<{
        id: string
        type: 'expense_created' | 'expense_updated' | 'expense_deleted' | 'category_created' | 'category_updated'
        description: string
        amount?: number
        timestamp: Date
      }> = []
      
      // Add recent expenses as activities (mock for now - in real app you'd get this from audit trail)
      if (analyticsData.analytics.dailyTrend) {
        const recentDays = analyticsData.analytics.dailyTrend.slice(-3)
        recentDays.forEach((day: any, index: number) => {
          if (day.count > 0) {
            activities.push({
              id: `expense-${day.date}-${index}`,
              type: 'expense_created' as const,
              description: `${day.count} expense${day.count > 1 ? 's' : ''} created`,
              amount: day.amount,
              timestamp: new Date(day.date)
            })
          }
        })
      }

      setRecentActivities(activities.slice(0, 5))
    } catch (error: any) {
      console.error('Error loading analytics:', error)
      setAnalyticsError(error.message || 'Failed to load analytics')
    } finally {
      setIsLoadingAnalytics(false)
    }
  }, [])

  // Load analytics on mount and when tab changes to overview
  useEffect(() => {
    if (activeTab === 'overview') {
      loadAnalytics()
    }
  }, [activeTab, loadAnalytics])

  // Handle expense actions
  const handleViewExpense = (expense: IExpenseEntry) => {
    setSelectedExpense(expense)
  }

  const handleEditExpense = (expense: IExpenseEntry) => {
    setEditingExpense(expense)
    setShowExpenseForm(true)
  }

  const handleDeleteExpense = async (expense: IExpenseEntry) => {
    if (!confirm('Are you sure you want to delete this expense? This action cannot be undone.')) {
      return
    }

    try {
      await retryManager.executeWithRetry(async () => {
        const response = await fetch(`/api/expenses/${expense._id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            reason: 'Deleted by admin'
          })
        })

        if (!response.ok) {
          const error = createExpenseErrorFromResponse(response)
          throw error
        }
      })

      notifications.showExpenseDeleted(expense._id?.toString())
      // Refresh the expense list by switching tabs
      setActiveTab('expenses')
    } catch (error) {
      console.error('Error deleting expense:', error)
      showExpenseErrorToast(error as Error, {
        onRetry: () => handleDeleteExpense(expense),
        showDetails: true
      })
    }
  }

  const handleCreateExpense = () => {
    setEditingExpense(null)
    setShowExpenseForm(true)
  }

  const handleExpenseFormClose = () => {
    setShowExpenseForm(false)
    setEditingExpense(null)
  }

  const handleExpenseFormSubmit = async (data: any) => {
    try {
      await retryManager.executeWithRetry(async () => {
        const url = editingExpense ? `/api/expenses/${editingExpense._id}` : '/api/expenses'
        const method = editingExpense ? 'PUT' : 'POST'
        
        // Transform receipt data - extract URLs from ReceiptFile objects
        const receiptUrls = data.receipts ? data.receipts
          .filter((receipt: any) => receipt && receipt.url) // Filter out invalid receipts
          .map((receipt: any) => receipt.url)
          .filter((url: string) => {
            try {
              new URL(url) // Validate URL format
              return true
            } catch {
              console.warn('Invalid receipt URL:', url)
              return false
            }
          }) : []
        
        const transformedData = {
          ...data,
          receipts: receiptUrls
        }
        
        console.log('Transformed expense data:', transformedData)
        
        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(transformedData),
        })

        if (!response.ok) {
          const error = createExpenseErrorFromResponse(response)
          throw error
        }

        return response.json()
      })

      setShowExpenseForm(false)
      setEditingExpense(null)
      
      if (editingExpense) {
        notifications.showExpenseUpdated(editingExpense._id?.toString())
      } else {
        notifications.showExpenseCreated()
      }
      
      // Refresh the expense list
      setActiveTab('expenses')
    } catch (error) {
      console.error('Error saving expense:', error)
      // Re-throw the error so ExpenseForm can handle it properly
      throw error
    }
  }

  return (
    <div className={className}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Expense Management</h1>
            <p className="text-muted-foreground">
              Complete expense management system with full administrative controls
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleCreateExpense} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Expense
            </Button>
          </div>
        </div>

        {/* Main Dashboard Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="expenses" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Expenses
            </TabsTrigger>
            <TabsTrigger value="categories" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Categories
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              User Activity
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {isLoadingAnalytics ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                  <Card key={i}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-8 w-24 bg-gray-200 rounded animate-pulse mb-2"></div>
                      <div className="h-3 w-32 bg-gray-200 rounded animate-pulse"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : analyticsError ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center text-red-600">
                    <p>Error loading analytics: {analyticsError}</p>
                    <Button onClick={loadAnalytics} className="mt-2">Retry</Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Expenses (30 days)</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      ₹{analytics?.totalAmount?.toLocaleString() || '0'}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {analytics?.totalExpenses || 0} expense{(analytics?.totalExpenses || 0) !== 1 ? 's' : ''}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">This Month</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      ₹{analytics?.monthlyComparison?.currentMonth?.toLocaleString() || '0'}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {analytics?.monthlyComparison?.percentageChange !== undefined ? (
                        analytics.monthlyComparison.percentageChange >= 0 ? (
                          `+${analytics.monthlyComparison.percentageChange.toFixed(1)}% from last month`
                        ) : (
                          `${analytics.monthlyComparison.percentageChange.toFixed(1)}% from last month`
                        )
                      ) : (
                        'No previous month data'
                      )}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {analytics?.topUsers?.length || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Users with expenses this month
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Categories</CardTitle>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{categoriesCount}</div>
                    <p className="text-xs text-muted-foreground">
                      Active expense categories
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button 
                    variant="outline" 
                    className="h-20 flex flex-col items-center gap-2"
                    onClick={handleCreateExpense}
                  >
                    <Plus className="h-6 w-6" />
                    <span>Create Expense</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-20 flex flex-col items-center gap-2"
                    onClick={() => setActiveTab('categories')}
                  >
                    <Settings className="h-6 w-6" />
                    <span>Manage Categories</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-20 flex flex-col items-center gap-2"
                    onClick={() => setActiveTab('reports')}
                  >
                    <FileText className="h-6 w-6" />
                    <span>Generate Report</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Top Categories */}
            {!isLoadingAnalytics && analytics?.topCategories && analytics.topCategories.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Top Expense Categories (Last 30 Days)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics.topCategories.slice(0, 5).map((category, index) => (
                      <div key={category.category} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-medium">
                            {index + 1}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{category.category}</p>
                            <p className="text-xs text-muted-foreground">
                              {category.percentage.toFixed(1)}% of total expenses
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">₹{category.amount.toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Activity */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Recent Activity</CardTitle>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={loadAnalytics}
                  disabled={isLoadingAnalytics}
                  className="flex items-center gap-2"
                >
                  <TrendingUp className="h-4 w-4" />
                  Refresh
                </Button>
              </CardHeader>
              <CardContent>
                {isLoadingAnalytics ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-gray-200 rounded-full animate-pulse"></div>
                          <div>
                            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-1"></div>
                            <div className="h-3 w-24 bg-gray-200 rounded animate-pulse"></div>
                          </div>
                        </div>
                        <div className="h-5 w-16 bg-gray-200 rounded animate-pulse"></div>
                      </div>
                    ))}
                  </div>
                ) : recentActivities.length > 0 ? (
                  <div className="space-y-4">
                    {recentActivities.map((activity) => {
                      const getActivityColor = (type: string) => {
                        switch (type) {
                          case 'expense_created': return 'bg-green-500'
                          case 'expense_updated': return 'bg-blue-500'
                          case 'expense_deleted': return 'bg-red-500'
                          case 'category_created': return 'bg-purple-500'
                          case 'category_updated': return 'bg-orange-500'
                          default: return 'bg-gray-500'
                        }
                      }

                      const getTimeAgo = (date: Date) => {
                        const now = new Date()
                        const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
                        
                        if (diffInHours < 1) return 'Less than an hour ago'
                        if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`
                        
                        const diffInDays = Math.floor(diffInHours / 24)
                        if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`
                        
                        return date.toLocaleDateString()
                      }

                      return (
                        <div key={activity.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${getActivityColor(activity.type)}`}></div>
                            <div>
                              <p className="text-sm font-medium">{activity.description}</p>
                              {activity.amount && (
                                <p className="text-xs text-muted-foreground">
                                  Total: ₹{activity.amount.toLocaleString()}
                                </p>
                              )}
                            </div>
                          </div>
                          <Badge variant="secondary">{getTimeAgo(activity.timestamp)}</Badge>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <p>No recent activity found</p>
                    <p className="text-xs mt-1">Create some expenses to see activity here</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Expenses Tab */}
          <TabsContent value="expenses">
            <ExpenseList
              onViewExpense={handleViewExpense}
              onEditExpense={handleEditExpense}
              onDeleteExpense={handleDeleteExpense}
              onCreateExpense={handleCreateExpense}
              showUserFilter={true}
            />
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories">
            <CategoryManager />
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports">
            <ExpenseReports />
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <ExpenseAnalytics />
          </TabsContent>

          {/* User Activity Tab */}
          <TabsContent value="users">
            <UserActivityStats />
          </TabsContent>
        </Tabs>
      </div>

      {/* Expense Form Modal */}
      {showExpenseForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <ExpenseForm
              expense={editingExpense || undefined}
              onSubmit={handleExpenseFormSubmit}
              onCancel={handleExpenseFormClose}
            />
          </div>
        </div>
      )}

      {/* Expense Details Modal */}
      {selectedExpense && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <ExpenseDetails
              expense={selectedExpense}
              onClose={() => setSelectedExpense(null)}
              onEdit={() => {
                setSelectedExpense(null)
                handleEditExpense(selectedExpense)
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// Main component with error boundary and notification provider
export function AdminExpensesDashboard(props: AdminExpensesDashboardProps) {
  return (
    <ExpenseErrorBoundary>
      <ExpenseNotificationProvider>
        <AdminExpensesDashboardContent {...props} />
      </ExpenseNotificationProvider>
    </ExpenseErrorBoundary>
  )
}

export default AdminExpensesDashboard