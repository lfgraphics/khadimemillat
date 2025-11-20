'use client'

import React, { useState } from 'react'
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

function AdminExpensesDashboardContent({ className }: AdminExpensesDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedExpense, setSelectedExpense] = useState<IExpenseEntry | null>(null)
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [editingExpense, setEditingExpense] = useState<IExpenseEntry | null>(null)
  const [retryManager] = useState(() => new ExpenseRetryManager())
  const notifications = useExpenseNotifications()

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
        
        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
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
      showExpenseErrorToast(error as Error, {
        onRetry: () => handleExpenseFormSubmit(data),
        showDetails: true
      })
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₹2,45,678</div>
                  <p className="text-xs text-muted-foreground">
                    +12% from last month
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">This Month</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₹45,231</div>
                  <p className="text-xs text-muted-foreground">
                    +8% from last month
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">12</div>
                  <p className="text-xs text-muted-foreground">
                    Admin and moderator users
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Categories</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">8</div>
                  <p className="text-xs text-muted-foreground">
                    Active expense categories
                  </p>
                </CardContent>
              </Card>
            </div>

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

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <div>
                        <p className="text-sm font-medium">New expense created</p>
                        <p className="text-xs text-muted-foreground">Office supplies - ₹2,500</p>
                      </div>
                    </div>
                    <Badge variant="secondary">2 hours ago</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <div>
                        <p className="text-sm font-medium">Category updated</p>
                        <p className="text-xs text-muted-foreground">Travel expenses category modified</p>
                      </div>
                    </div>
                    <Badge variant="secondary">5 hours ago</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <div>
                        <p className="text-sm font-medium">Report generated</p>
                        <p className="text-xs text-muted-foreground">Monthly expense report for November</p>
                      </div>
                    </div>
                    <Badge variant="secondary">1 day ago</Badge>
                  </div>
                </div>
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