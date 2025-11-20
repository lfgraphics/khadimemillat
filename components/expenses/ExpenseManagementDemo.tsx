'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ExpenseForm, ExpenseList, ExpenseDetails, CategoryManager } from '@/components/expenses'
import { IExpenseEntry } from '@/models/ExpenseEntry'
import { IExpenseCategory } from '@/models/ExpenseCategory'

// Demo component to showcase all expense management UI components
export function ExpenseManagementDemo() {
  const [activeView, setActiveView] = useState<'list' | 'form' | 'details' | 'categories'>('list')
  const [selectedExpense, setSelectedExpense] = useState<IExpenseEntry | null>(null)

  // Mock data for demonstration
  const mockExpense = {
    _id: '507f1f77bcf86cd799439011',
    clerkUserId: 'user_123',
    amount: 1500,
    currency: 'INR',
    category: '507f1f77bcf86cd799439012',
    description: 'Office supplies purchase',
    vendor: 'Staples Inc.',
    expenseDate: new Date('2024-01-15'),
    receipts: ['https://example.com/receipt1.jpg'],
    auditTrail: [
      {
        action: 'created' as const,
        performedBy: 'user_123',
        performedAt: new Date('2024-01-15T10:30:00Z'),
        reason: 'Initial expense entry'
      }
    ],
    isDeleted: false,
    createdAt: new Date('2024-01-15T10:30:00Z'),
    updatedAt: new Date('2024-01-15T10:30:00Z')
  } as unknown as IExpenseEntry

  const mockCategory: IExpenseCategory = {
    _id: '507f1f77bcf86cd799439012',
    name: 'Office Supplies',
    description: 'General office supplies and stationery',
    isActive: true,
    createdBy: 'user_123'
  } as IExpenseCategory

  const handleExpenseSubmit = async (data: any) => {
    console.log('Expense submitted:', data)
    // In real implementation, this would call the API
    return Promise.resolve()
  }

  const handleViewExpense = (expense: IExpenseEntry) => {
    setSelectedExpense(expense)
    setActiveView('details')
  }

  const handleEditExpense = (expense: IExpenseEntry) => {
    setSelectedExpense(expense)
    setActiveView('form')
  }

  const handleDeleteExpense = (expense: IExpenseEntry) => {
    console.log('Delete expense:', expense._id)
    // In real implementation, this would call the API
  }

  const handleCreateExpense = () => {
    setSelectedExpense(null)
    setActiveView('form')
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Expense Management System</h1>
        <p className="text-muted-foreground">
          Demo of all expense management UI components
        </p>
      </div>

      <Tabs value={activeView} onValueChange={(value) => setActiveView(value as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="list">Expense List</TabsTrigger>
          <TabsTrigger value="form">Expense Form</TabsTrigger>
          <TabsTrigger value="details">Expense Details</TabsTrigger>
          <TabsTrigger value="categories">Category Manager</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Expense List Component</CardTitle>
            </CardHeader>
            <CardContent>
              <ExpenseList
                onViewExpense={handleViewExpense}
                onEditExpense={handleEditExpense}
                onDeleteExpense={handleDeleteExpense}
                onCreateExpense={handleCreateExpense}
                showUserFilter={true}
                currentUserId="user_123"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="form" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Expense Form Component</CardTitle>
            </CardHeader>
            <CardContent>
              <ExpenseForm
                expense={selectedExpense || undefined}
                onSubmit={handleExpenseSubmit}
                onCancel={() => setActiveView('list')}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Expense Details Component</CardTitle>
            </CardHeader>
            <CardContent>
              <ExpenseDetails
                expense={selectedExpense || mockExpense}
                category={mockCategory}
                onEdit={() => setActiveView('form')}
                onDelete={() => console.log('Delete expense')}
                onClose={() => setActiveView('list')}
                showActions={true}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Category Manager Component</CardTitle>
            </CardHeader>
            <CardContent>
              <CategoryManager />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">
          This demo showcases all the expense management UI components.
          In a real application, these would be integrated with the backend APIs.
        </p>
        <div className="flex justify-center gap-2">
          <Button variant="outline" onClick={() => setActiveView('list')}>
            View List
          </Button>
          <Button variant="outline" onClick={() => setActiveView('form')}>
            Create Expense
          </Button>
          <Button variant="outline" onClick={() => setActiveView('categories')}>
            Manage Categories
          </Button>
        </div>
      </div>
    </div>
  )
}

export default ExpenseManagementDemo