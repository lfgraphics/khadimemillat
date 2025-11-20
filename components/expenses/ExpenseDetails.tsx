'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Receipt, 
  Calendar, 
  DollarSign, 
  Tag, 
  Building, 
  User, 
  FileText, 
  Download, 
  Eye, 
  Edit, 
  Trash2,
  Clock,
  AlertTriangle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { IExpenseEntry, IAuditEntry } from '@/models/ExpenseEntry'
import { IExpenseCategory } from '@/models/ExpenseCategory'
import AuditTrail from './AuditTrail'
import EditRestrictions from './EditRestrictions'

interface ExpenseDetailsProps {
  expense: IExpenseEntry
  category?: IExpenseCategory
  currentUserId?: string
  currentUserRole?: string
  onEdit?: () => void
  onDelete?: () => void
  onClose?: () => void
  className?: string
  showActions?: boolean
  showEditRestrictions?: boolean
}

export function ExpenseDetails({
  expense,
  category,
  currentUserId,
  currentUserRole = 'moderator',
  onEdit,
  onDelete,
  onClose,
  className,
  showActions = true,
  showEditRestrictions = true
}: ExpenseDetailsProps) {

  // Format currency
  const formatCurrency = (amount: number, currency: string = 'INR') => {
    const symbol = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency
    return `${symbol}${amount.toLocaleString()}`
  }

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Handle receipt download
  const handleDownloadReceipt = (url: string, index: number) => {
    const link = document.createElement('a')
    link.href = url
    link.download = `receipt-${expense._id?.toString().slice(-6)}-${index + 1}`
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Handle receipt view
  const handleViewReceipt = (url: string) => {
    window.open(url, '_blank')
  }



  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Receipt className="h-6 w-6" />
            Expense Details
          </h2>
          <p className="text-muted-foreground">
            ID: {expense._id?.toString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {showActions && !expense.isDeleted && (
            <>
              {onEdit && (
                <Button variant="outline" onClick={onEdit} className="flex items-center gap-2">
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
              )}
              {onDelete && (
                <Button 
                  variant="outline" 
                  onClick={onDelete} 
                  className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              )}
            </>
          )}
          {onClose && (
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>

      {/* Status Alert */}
      {expense.isDeleted && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This expense has been deleted on {expense.deletedAt ? format(new Date(expense.deletedAt), 'PPP') : 'Unknown date'}.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Amount</p>
                    <p className="text-2xl font-bold">{formatCurrency(expense.amount, expense.currency)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Expense Date</p>
                    <p className="font-medium">{format(new Date(expense.expenseDate), 'PPP')}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Tag className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Category</p>
                    <Badge variant="secondary" className="mt-1">
                      {category?.name || 'Unknown Category'}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Created By</p>
                    <p className="font-medium">{expense.clerkUserId}</p>
                  </div>
                </div>
              </div>

              {expense.vendor && (
                <div className="flex items-center gap-3">
                  <Building className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Vendor</p>
                    <p className="font-medium">{expense.vendor}</p>
                  </div>
                </div>
              )}

              {expense.description && (
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Description</p>
                    <p className="font-medium whitespace-pre-wrap">{expense.description}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Receipts */}
          {expense.receipts && expense.receipts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Receipts ({expense.receipts.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {expense.receipts.map((receiptUrl, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border rounded-lg bg-gray-50 dark:bg-gray-800"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Receipt preview */}
                        <div className="flex-shrink-0">
                          {receiptUrl.toLowerCase().includes('.pdf') ? (
                            <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center">
                              <span className="text-red-600 dark:text-red-400 text-xs font-semibold">PDF</span>
                            </div>
                          ) : (
                            <img
                              src={receiptUrl}
                              alt={`Receipt ${index + 1}`}
                              className="w-12 h-12 object-cover rounded-lg"
                            />
                          )}
                        </div>

                        {/* Receipt info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            Receipt {index + 1}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Uploaded with expense
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewReceipt(receiptUrl)}
                          className="h-8 w-8 p-0"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadReceipt(receiptUrl, index)}
                          className="h-8 w-8 p-0"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Metadata
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="font-medium">
                  {expense.createdAt ? format(new Date(expense.createdAt), 'PPP p') : 'Unknown'}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Last Updated</p>
                <p className="font-medium">
                  {expense.updatedAt ? format(new Date(expense.updatedAt), 'PPP p') : 'Unknown'}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                {expense.isDeleted ? (
                  <Badge variant="destructive">Deleted</Badge>
                ) : (
                  <Badge variant="default">Active</Badge>
                )}
              </div>

              {expense.isDeleted && expense.deletedAt && (
                <div>
                  <p className="text-sm text-muted-foreground">Deleted</p>
                  <p className="font-medium">{format(new Date(expense.deletedAt), 'PPP p')}</p>
                  {expense.deletedBy && (
                    <p className="text-xs text-muted-foreground">by {expense.deletedBy}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Category Details */}
          {category && (
            <Card>
              <CardHeader>
                <CardTitle>Category Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{category.name}</p>
                </div>

                {category.description && (
                  <div>
                    <p className="text-sm text-muted-foreground">Description</p>
                    <p className="text-sm">{category.description}</p>
                  </div>
                )}

                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {category.isActive ? (
                    <Badge variant="default">Active</Badge>
                  ) : (
                    <Badge variant="secondary">Inactive</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Edit Restrictions */}
          {showEditRestrictions && currentUserId && (
            <EditRestrictions
              expense={expense}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
              showDetails={true}
            />
          )}

          {/* Audit Trail */}
          {expense.auditTrail && expense.auditTrail.length > 0 && (
            <AuditTrail
              auditTrail={expense.auditTrail}
              defaultExpanded={false}
              showChangesDetails={true}
              maxHeight="300px"
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default ExpenseDetails