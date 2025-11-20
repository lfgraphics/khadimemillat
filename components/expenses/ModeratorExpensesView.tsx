'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  DollarSign, 
  TrendingUp, 
  FileText, 
  Plus,
  BarChart3,
  Calendar,
  Receipt
} from 'lucide-react'
import ExpenseList from './ExpenseList'
import ExpenseForm from './ExpenseForm'
import ExpenseDetails from './ExpenseDetails'
import ExpenseReports from './ExpenseReports'
import { IExpenseEntry } from '@/models/ExpenseEntry'
import { toast } from 'sonner'
import { useUser } from '@clerk/nextjs'

interface ModeratorExpensesViewProps {
  className?: string
}

interface ExpenseStats {
  totalAmount: number
  monthlyAmount: number
  expenseCount: number
  pendingReceipts: number
  recentExpenses: Array<{
    _id: string
    amount: number
    description: string
    category: { name: string }
    expenseDate: string
    receipts?: string[]
  }>
}

export function ModeratorExpensesView({ className }: ModeratorExpensesViewProps) {
  const { user } = useUser()
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedExpense, setSelectedExpense] = useState<IExpenseEntry | null>(null)
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [editingExpense, setEditingExpense] = useState<IExpenseEntry | null>(null)
  const [stats, setStats] = useState<ExpenseStats | null>(null)
  const [isLoadingStats, setIsLoadingStats] = useState(true)

  // Handle expense actions
  const handleViewExpense = (expense: IExpenseEntry) => {
    setSelectedExpense(expense)
  }

  const handleEditExpense = (expense: IExpenseEntry) => {
    // Check if user can edit this expense (only their own expenses)
    if (expense.clerkUserId !== user?.id) {
      toast.error('You can only edit expenses you created')
      return
    }
    setEditingExpense(expense)
    setShowExpenseForm(true)
  }

  const handleDeleteExpense = async (expense: IExpenseEntry) => {
    // Check if user can delete this expense (only their own expenses)
    if (expense.clerkUserId !== user?.id) {
      toast.error('You can only delete expenses you created')
      return
    }

    if (!confirm('Are you sure you want to delete this expense? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/expenses/${expense._id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete expense')
      }

      toast.success('Expense deleted successfully')
      // Refresh stats and expense list
      loadStats()
      setActiveTab('expenses')
    } catch (error) {
      console.error('Error deleting expense:', error)
      toast.error('Failed to delete expense')
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
        throw new Error('Failed to save expense')
      }

      setShowExpenseForm(false)
      setEditingExpense(null)
      toast.success(editingExpense ? 'Expense updated successfully' : 'Expense created successfully')
      
      // Refresh stats and expense list
      loadStats()
      setActiveTab('expenses')
    } catch (error) {
      console.error('Error saving expense:', error)
      toast.error('Failed to save expense')
      throw error
    }
  }

  // Load real expense statistics
  const loadStats = async () => {
    if (!user?.id) return
    
    try {
      setIsLoadingStats(true)
      
      // Get user activity stats
      const statsResponse = await fetch(`/api/expenses/user-activity?userId=${user.id}&days=365`)
      if (!statsResponse.ok) {
        throw new Error('Failed to load stats')
      }
      const statsData = await statsResponse.json()
      
      // Get recent expenses separately
      const expensesResponse = await fetch(`/api/expenses?limit=5&clerkUserId=${user.id}`)
      let recentExpenses = []
      if (expensesResponse.ok) {
        const expensesData = await expensesResponse.json()
        recentExpenses = expensesData.expenses || []
      }
      
      // Calculate monthly amount from current month
      const currentMonth = new Date().getMonth()
      const currentYear = new Date().getFullYear()
      
      // Get monthly stats from the monthly trend
      const currentMonthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`
      const monthlyData = statsData.stats?.monthlyTrend?.find((trend: any) => trend.month === currentMonthKey)
      const monthlyAmount = monthlyData?.amount || 0
      
      // Calculate pending receipts from recent expenses
      const pendingReceipts = recentExpenses.filter((expense: any) => !expense.receipts || expense.receipts.length === 0).length
      
      setStats({
        totalAmount: statsData.stats?.totalAmount || 0,
        monthlyAmount,
        expenseCount: statsData.stats?.totalExpenses || 0,
        pendingReceipts,
        recentExpenses: recentExpenses.slice(0, 5)
      })
    } catch (error) {
      console.error('Error loading stats:', error)
      toast.error('Failed to load expense statistics')
    } finally {
      setIsLoadingStats(false)
    }
  }

  // Load stats on component mount and when user changes
  useEffect(() => {
    if (user?.id) {
      loadStats()
    }
  }, [user?.id])

  return (
    <div className={className}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Expense Management</h1>
            <p className="text-muted-foreground">
              Create and manage organizational expenses with receipt uploads
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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="expenses" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              My Expenses
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="receipts" className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Receipts
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">My Total Expenses</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {isLoadingStats ? (
                      <div className="h-8 w-24 bg-muted animate-pulse rounded" />
                    ) : (
                      `₹${stats?.totalAmount?.toLocaleString('en-IN') || '0'}`
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stats?.expenseCount || 0} total expenses
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
                    {isLoadingStats ? (
                      <div className="h-8 w-24 bg-muted animate-pulse rounded" />
                    ) : (
                      `₹${stats?.monthlyAmount?.toLocaleString('en-IN') || '0'}`
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Current month expenses
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Receipts</CardTitle>
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {isLoadingStats ? (
                      <div className="h-8 w-12 bg-muted animate-pulse rounded" />
                    ) : (
                      stats?.pendingReceipts || 0
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Expenses without receipts
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
                    onClick={() => setActiveTab('receipts')}
                  >
                    <Receipt className="h-6 w-6" />
                    <span>Upload Receipts</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-20 flex flex-col items-center gap-2"
                    onClick={() => setActiveTab('reports')}
                  >
                    <FileText className="h-6 w-6" />
                    <span>View Reports</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Expenses */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingStats ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-muted rounded-full animate-pulse"></div>
                          <div className="space-y-1">
                            <div className="h-4 w-32 bg-muted animate-pulse rounded"></div>
                            <div className="h-3 w-48 bg-muted animate-pulse rounded"></div>
                          </div>
                        </div>
                        <div className="text-right space-y-1">
                          <div className="h-4 w-16 bg-muted animate-pulse rounded"></div>
                          <div className="h-5 w-20 bg-muted animate-pulse rounded"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : stats?.recentExpenses && stats.recentExpenses.length > 0 ? (
                  <div className="space-y-4">
                    {stats.recentExpenses.map((expense, index) => {
                      const expenseDate = new Date(expense.expenseDate)
                      const today = new Date()
                      const diffTime = Math.abs(today.getTime() - expenseDate.getTime())
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                      
                      let timeLabel = 'Today'
                      if (diffDays === 1) timeLabel = 'Yesterday'
                      else if (diffDays > 1) timeLabel = `${diffDays} days ago`
                      
                      const colors = ['bg-green-500', 'bg-blue-500', 'bg-orange-500', 'bg-purple-500', 'bg-pink-500']
                      
                      return (
                        <div key={expense._id} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 ${colors[index % colors.length]} rounded-full`}></div>
                            <div>
                              <p className="text-sm font-medium">{expense.category?.name || 'Uncategorized'}</p>
                              <p className="text-xs text-muted-foreground">
                                {expense.description || 'No description'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">₹{expense.amount.toLocaleString('en-IN')}</p>
                            <Badge variant="secondary">{timeLabel}</Badge>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No expenses yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Create your first expense to see it here
                    </p>
                    <Button onClick={handleCreateExpense}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Expense
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Expenses Tab - Show only current user's expenses */}
          <TabsContent value="expenses">
            <ExpenseList
              onViewExpense={handleViewExpense}
              onEditExpense={handleEditExpense}
              onDeleteExpense={handleDeleteExpense}
              onCreateExpense={handleCreateExpense}
              showUserFilter={false}
              currentUserId={user?.id}
            />
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports">
            <ExpenseReports />
          </TabsContent>

          {/* Receipts Tab */}
          <TabsContent value="receipts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Receipt Management</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Upload and manage receipts for your expenses
                </p>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No receipts to manage</h3>
                  <p className="text-muted-foreground mb-4">
                    Create an expense first, then upload receipts for it
                  </p>
                  <Button onClick={handleCreateExpense}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Expense
                  </Button>
                </div>
              </CardContent>
            </Card>
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

export default ModeratorExpensesView