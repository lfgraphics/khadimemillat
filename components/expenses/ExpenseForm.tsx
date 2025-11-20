'use client'

import React, { useState, useEffect, useRef } from 'react'
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Loader2, Calendar as CalendarIcon, Receipt, DollarSign, Tag, User, Building, Plus } from 'lucide-react'
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
  dismissAllExpenseLoadingToasts,
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

// Category creation schema
const categoryFormSchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100, 'Name cannot exceed 100 characters'),
  description: z.string().max(500, 'Description cannot exceed 500 characters').optional(),
})

type ExpenseFormData = z.infer<typeof expenseFormSchema>
type CategoryFormData = z.infer<typeof categoryFormSchema>

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
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [isCreatingCategory, setIsCreatingCategory] = useState(false)
  const loadingToastRef = useRef<string | number | null>(null)

  // Keep ref in sync with state
  useEffect(() => {
    loadingToastRef.current = loadingToastId
  }, [loadingToastId])

  // Cleanup effect to dismiss any remaining toasts
  useEffect(() => {
    return () => {
      if (loadingToastRef.current) {
        dismissExpenseLoadingToast(loadingToastRef.current, false)
      }
    }
  }, [])

  // Handle cancel with cleanup
  const handleCancel = () => {
    // Dismiss any loading toasts before closing
    if (loadingToastId) {
      dismissExpenseLoadingToast(loadingToastId, false)
      setLoadingToastId(null)
    } else {
      // Emergency cleanup in case there are orphaned toasts
      dismissAllExpenseLoadingToasts()
    }
    onCancel()
  }

  const isEditing = !!expense

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      amount: expense?.amount,
      currency: expense?.currency || 'INR',
      category: expense?.category?.toString() || '',
      description: expense?.description || '',
      vendor: expense?.vendor || '',
      expenseDate: expense?.expenseDate ? new Date(expense.expenseDate) : new Date(),
      reason: '',
    },
  })

  const categoryForm = useForm<CategoryFormData>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: '',
      description: '',
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
            // Dismiss the current toast before creating a new one
            if (loadingToastId) {
              dismissExpenseLoadingToast(loadingToastId, false)
              setLoadingToastId(null)
            }
            // Create new retry toast
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
        setLoadingToastId(null) // Clear the toast ID after dismissing
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
        setLoadingToastId(null) // Clear the toast ID after dismissing
      }
      
      showExpenseErrorToast(error, {
        onRetry: () => handleFormSubmit(data),
        showDetails: true,
        currentRetries: retryManager.getRemainingRetries()
      })
    } finally {
      setIsLoading(false)
      // Don't set loadingToastId to null here - it's handled in success/error blocks
    }
  }

  const handleReceiptsChange = (newReceipts: ReceiptFile[]) => {
    setReceipts(newReceipts)
  }

  const handleCreateCategory = async (data: CategoryFormData) => {
    setIsCreatingCategory(true)
    try {
      const response = await fetch('/api/expenses/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = createExpenseErrorFromResponse(response)
        throw error
      }

      const result = await response.json()
      const newCategory = result.category

      // Add the new category to the list
      setCategories(prev => [...prev, newCategory])
      
      // Select the new category in the expense form
      form.setValue('category', newCategory._id.toString())
      
      // Close the category form
      setShowCategoryForm(false)
      categoryForm.reset()
      
      showExpenseSuccessToast('create', `Category "${newCategory.name}" created successfully`)
    } catch (error) {
      console.error('Error creating category:', error)
      showExpenseErrorToast(error as Error, {
        onRetry: () => handleCreateCategory(data),
        showDetails: true
      })
    } finally {
      setIsCreatingCategory(false)
    }
  }

  // Get category name for display
  const getCategoryName = (categoryId: string | undefined) => {
    if (!categoryId) return 'No Category Selected'
    const category = categories.find(cat => cat._id?.toString() === categoryId)
    return category?.name || 'Unknown Category (Deleted)'
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
                        type="string"
                        inputMode='numeric'
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
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
                    <FormLabel className="flex items-center gap-2 justify-between">
                      <span className="flex items-center gap-2">
                        <Tag className="h-4 w-4" />
                        Category <span className="text-red-500">*</span>
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowCategoryForm(true)}
                        disabled={disabled || isLoading}
                        className="h-6 px-2 text-xs"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        New
                      </Button>
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
                        {categories
                          .filter(category => category._id && category._id.toString().trim() !== '')
                          .map((category) => (
                            <SelectItem key={category._id?.toString()} value={category._id?.toString()!}>
                              {category.name}
                              {category.description && (
                                <span className="text-muted-foreground ml-2">- {category.description}</span>
                              )}
                            </SelectItem>
                          ))}
                        {categories.length === 0 && !isLoadingCategories && (
                          <div className="p-2 text-sm text-muted-foreground">
                            No categories available. Create one first.
                          </div>
                        )}
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
                    <div className="flex gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                'flex-1 pl-3 text-left font-normal',
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
                    </div>
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
                onClick={handleCancel}
                disabled={isLoading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>

      {/* Category Creation Dialog */}
      <Dialog open={showCategoryForm} onOpenChange={setShowCategoryForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Category</DialogTitle>
          </DialogHeader>
          <Form {...categoryForm}>
            <form onSubmit={categoryForm.handleSubmit(handleCreateCategory)} className="space-y-4">
              <FormField
                control={categoryForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category Name <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter category name"
                        {...field}
                        disabled={isCreatingCategory}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={categoryForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter category description (optional)"
                        rows={2}
                        {...field}
                        disabled={isCreatingCategory}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-2 pt-4">
                <Button
                  type="submit"
                  disabled={isCreatingCategory}
                  className="flex-1"
                >
                  {isCreatingCategory ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Category'
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCategoryForm(false)
                    categoryForm.reset()
                  }}
                  disabled={isCreatingCategory}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

export default ExpenseForm