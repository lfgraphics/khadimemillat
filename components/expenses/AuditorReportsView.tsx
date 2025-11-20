'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { 
  DollarSign, 
  TrendingUp, 
  FileText, 
  BarChart3,
  Calendar,
  Eye,
  Shield,
  Users,
  Activity
} from 'lucide-react'
import ExpenseList from './ExpenseList'
import ExpenseDetails from './ExpenseDetails'
import ExpenseReports from './ExpenseReports'
import ExpenseAnalytics from './ExpenseAnalytics'
import AuditTrail from './AuditTrail'
import { IExpenseEntry } from '@/models/ExpenseEntry'
import { toast } from 'sonner'

interface AuditorReportsViewProps {
  className?: string
}

export function AuditorReportsView({ className }: AuditorReportsViewProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedExpense, setSelectedExpense] = useState<IExpenseEntry | null>(null)

  // Handle expense actions (read-only for auditors)
  const handleViewExpense = (expense: IExpenseEntry) => {
    setSelectedExpense(expense)
  }

  const handleEditExpense = (expense: IExpenseEntry) => {
    toast.error('Auditors have read-only access. You cannot edit expenses.')
  }

  const handleDeleteExpense = (expense: IExpenseEntry) => {
    toast.error('Auditors have read-only access. You cannot delete expenses.')
  }

  const handleCreateExpense = () => {
    toast.error('Auditors have read-only access. You cannot create expenses.')
  }

  return (
    <div className={className}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Expense Audit Dashboard</h1>
            <p className="text-muted-foreground">
              Read-only access to expense data for audit and compliance purposes
            </p>
          </div>
          <Badge variant="secondary" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Auditor Access
          </Badge>
        </div>

        {/* Main Dashboard Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="expenses" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              All Expenses
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Audit Trail
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
                    All time organizational expenses
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
                    Current month expenses
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
                    Users with expense permissions
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Audit Events</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">156</div>
                  <p className="text-xs text-muted-foreground">
                    Total audit trail entries
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Compliance Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Compliance Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">98%</div>
                    <p className="text-sm text-muted-foreground">Expenses with Receipts</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">100%</div>
                    <p className="text-sm text-muted-foreground">Audit Trail Coverage</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">2</div>
                    <p className="text-sm text-muted-foreground">Pending Reviews</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Audit Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Audit Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <div>
                        <p className="text-sm font-medium">Expense created</p>
                        <p className="text-xs text-muted-foreground">Office supplies - ₹2,500 by John Doe</p>
                      </div>
                    </div>
                    <Badge variant="secondary">2 hours ago</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <div>
                        <p className="text-sm font-medium">Expense modified</p>
                        <p className="text-xs text-muted-foreground">Travel expense updated by Jane Smith</p>
                      </div>
                    </div>
                    <Badge variant="secondary">5 hours ago</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <div>
                        <p className="text-sm font-medium">Expense deleted</p>
                        <p className="text-xs text-muted-foreground">Duplicate entry removed by Admin</p>
                      </div>
                    </div>
                    <Badge variant="secondary">1 day ago</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <div>
                        <p className="text-sm font-medium">Category updated</p>
                        <p className="text-xs text-muted-foreground">Utilities category modified by Admin</p>
                      </div>
                    </div>
                    <Badge variant="secondary">2 days ago</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Expense Categories Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Expense Categories (This Month)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Office Supplies</Badge>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">₹15,450</p>
                      <p className="text-xs text-muted-foreground">34% of total</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Travel</Badge>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">₹12,300</p>
                      <p className="text-xs text-muted-foreground">27% of total</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Utilities</Badge>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">₹8,900</p>
                      <p className="text-xs text-muted-foreground">20% of total</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Equipment</Badge>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">₹5,600</p>
                      <p className="text-xs text-muted-foreground">12% of total</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Other</Badge>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">₹2,981</p>
                      <p className="text-xs text-muted-foreground">7% of total</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Expenses Tab - Read-only view */}
          <TabsContent value="expenses">
            <ExpenseList
              onViewExpense={handleViewExpense}
              onEditExpense={handleEditExpense}
              onDeleteExpense={handleDeleteExpense}
              onCreateExpense={handleCreateExpense}
              showUserFilter={true}
            />
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports">
            <ExpenseReports />
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <ExpenseAnalytics />
          </TabsContent>

          {/* Audit Trail Tab */}
          <TabsContent value="audit">
            <AuditTrail auditTrail={[]} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Expense Details Modal - Read-only */}
      {selectedExpense && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <ExpenseDetails
              expense={selectedExpense}
              onClose={() => setSelectedExpense(null)}
              onEdit={() => {
                toast.error('Auditors have read-only access. You cannot edit expenses.')
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default AuditorReportsView