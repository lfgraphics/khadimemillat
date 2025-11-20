'use client'

import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Loader2, Calendar as CalendarIcon, Receipt, DollarSign, Tag, User, Building } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ReceiptUpload } from './ReceiptUpload'
import { IExpenseCategory } from '@/models/ExpenseCategory'
import { IExpenseEntry } from '@/models/ExpenseEntry'
import { 
  showExpenseErrorToast, 
  showExpenseSuccessToast,
  showExpenseLoadingToast,
  dismissExpenseLoadingToast,
  ExpenseRetryManager,
  createExpenseErrorFromResponse
} from '@/lib/utils/expense-error-handling'

// Form validation schema
const expenseFormSchema = z.object({
  amount: z.number().positive('Amount must be greater than 0'),
  currency: z.string().min(1, 'Currency is required'),
  category: z.string().min(1, 'Category is required'),
  description: z.string().max(500, 'Description cannot exceed 500 characters').optional(),
  vendor: z.string().max(200, 'Vendor name cannot exceed 200 characters').optional(),
  expenseDate: z.date({
    message: 'Expense date is required',
  }),
  reason: z.string().optional(), // For audit trail when editing
})

type ExpenseFormData = z.infer<typeof expenseFormSchema>

interface ReceiptFile {
  url: string
  publicId: string
  fileName: string
  fileSize: number
  uploadedAt: Date
}

interface ExpenseFormProps {
  expense?: IExpenseEntry // For editing existing expense
  onSubmit: (data: ExpenseFormData & { receipts: ReceiptFile[] }) => Promise<void>
  onCancel: () => void
  className?: string
  disabled?: boolean
}

export function ExpenseForm({
  expense,
  onSubmit,
  onCancel,
  className,
  disabled = false
}: ExpenseFormProps) {
  const [categories, setCategories] = useState<IExpenseCategory[]>([])
  const [receipts, setReceipts] = useState<ReceiptFile[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingCategories, setIsLoadingCategories] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryManager] = useState(() => new ExpenseRetryManager())
  const [loadingToastId, setLoadingToastId] = useState<string | number | null>(null)

  const isEditing = !!expense

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      amount: expense?.amount || 0,
      currency: expense?.currency || 'INR',
      category: expense?.category?.toString() || '',
      description: expense?.description || '',
      vendor: expense?.vendor || '',
      expenseDate: expense?.expenseDate ? new Date(expense.expenseDate) : new Date(),
      reason: '',
    },
  })

  // Load categories on component mount with retry
  useEffect(() => {
    const loadCategories = async () => {
      try {
        await retryManager.executeWithRetry(async () => {
          const response = await fetch('/api/expenses/categories')
          if (!response.ok) {
            const error = createExpenseErrorFromResponse(response)
            throw error
          }
          const data = await response.json()
          setCategories(data.categories || [])
        })
      } catch (error) {
        console.error('Error loading categories:', error)
        showExpenseErrorToast(error as Error, {
          onRetry: () => {
            setIsLoadingCategories(true)
            loadCategories()
          },
          showDetails: true
        })
      } finally {
        setIsLoadingCategories(false)
      }
    }

    loadCategories()
  }, [])

  // Load existing receipts for editing
  useEffect(() => {
    if (expense?.receipts) {
      const existingReceipts: ReceiptFile[] = expense.receipts.map((url, index) => ({
        url,
        publicId: `existing-${index}`,
        fileName: `Receipt ${index + 1}`,
        fileSize: 0, // Unknown for existing receipts
        uploadedAt: expense.createdAt ? new Date(expense.createdAt) : new Date(),
      }))
      setReceipts(existingReceipts)
    }
  }, [expense])

  const handleFormSubmit = async (data: ExpenseFormData) => {
    setIsLoading(true)
    setError(null)

    const operation = isEditing ? 'Updating expense...' : 'Creating expense...'
    const toastId = showExpenseLoadingToast(operation)
    setLoadingToastId(toastId)

    try {
      await retryManager.executeWithRetry(
        async () => {
          await onSubmit({ ...data, receipts })
        },
        (attempt, delay) => {
          if (attempt > 1) {
            const retryMessage = `${operation} (Retry ${attempt}/${retryManager.getRemainingRetries() + attempt})`
            if (loadingToastId) {
              dismissExpenseLoadingToast(loadingToastId, false)
            }
            const newToastId = showExpenseLoadingToast(retryMessage, `Retrying in ${Math.round(delay/1000)}s...`)
            setLoadingToastId(newToastId)
          }
        }
      )
      
      // Success
      if (loadingToastId) {
        dismissExpenseLoadingToast(
          loadingToastId, 
          true, 
          isEditing ? 'Expense updated successfully' : 'Expense created successfully'
        )
      }
      
      if (!isEditing) {
        // Reset form for new expense
        form.reset()
        setReceipts([])
      }
      
    } catch (error: any) {
      console.error('Error submitting expense:', error)
      setError(error.message || 'Failed to save expense')
      
      if (loadingToastId) {
        dismissExpenseLoadingToast(loadingToastId, false)
      }
      
      showExpenseErrorToast(error, {
        onRetry: () => handleFormSubmit(data),
        showDetails: true,
        currentRetries: retryManager.getRemainingRetries()
      })
    } finally {
      setIsLoading(false)
      setLoadingToastId(null)
    }
  }

  const handleReceiptsChange = (newReceipts: ReceiptFile[]) => {
    setReceipts(newReceipts)
  }

  // Get category name for display
  const getCategoryName = (categoryId: string) => {
    const category = categories.find(cat => cat._id?.toString() === categoryId)
    return category?.name || 'Unknown Category'
  }

  return (
    <Card className={cn('w-full max-w-4xl mx-auto', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          {isEditing ? 'Edit Expense' : 'Create New Expense'}
          {isEditing && (
            <Badge variant="secondary" className="ml-2">
              ID: {expense._id?.toString().slice(-6)}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Amount Field */}
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Amount <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        disabled={disabled || isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Currency Field */}
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={disabled || isLoading}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="INR">INR (₹)</SelectItem>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Category Field */}
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      Category <span className="text-red-500">*</span>
                    </FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value} 
                      disabled={disabled || isLoading || isLoadingCategories}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={isLoadingCategories ? "Loading categories..." : "Select category"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category._id?.toString()} value={category._id?.toString() || ''}>
                            {category.name}
                            {category.description && (
                              <span className="text-muted-foreground ml-2">- {category.description}</span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Expense Date Field */}
              <FormField
                control={form.control}
                name="expenseDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      Expense Date <span className="text-red-500">*</span>
                    </FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                            disabled={disabled || isLoading}
                          >
                            {field.value ? (
                              format(field.value, 'PPP')
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date('1900-01-01')
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Vendor Field */}
            <FormField
              control={form.control}
              name="vendor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Vendor
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter vendor name (optional)"
                      {...field}
                      disabled={disabled || isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description Field */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter expense description (optional)"
                      rows={3}
                      {...field}
                      disabled={disabled || isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Reason Field (only for editing) */}
            {isEditing && (
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Reason for Edit
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter reason for editing this expense (optional)"
                        rows={2}
                        {...field}
                        disabled={disabled || isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Receipt Upload Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Receipts</h3>
              <ReceiptUpload
                expenseId={expense?._id?.toString()}
                existingReceipts={receipts}
                onReceiptsChange={handleReceiptsChange}
                disabled={disabled || isLoading}
                maxReceipts={5}
              />
            </div>

            {/* Error Display */}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={disabled || isLoading || isLoadingCategories}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isEditing ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    {isEditing ? 'Update Expense' : 'Create Expense'}
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

export default ExpenseForm