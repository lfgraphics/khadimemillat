'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Search, 
  Filter, 
  Calendar as CalendarIcon, 
  Eye, 
  Edit, 
  Trash2, 
  Download,
  RefreshCw,
  Plus,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { IExpenseEntry } from '@/models/ExpenseEntry'
import { IExpenseCategory } from '@/models/ExpenseCategory'
import { 
  showExpenseErrorToast, 
  showExpenseLoadingToast,
  dismissExpenseLoadingToast,
  ExpenseRetryManager,
  createExpenseErrorFromResponse
} from '@/lib/utils/expense-error-handling'

interface ExpenseFilters {
  search?: string
  category?: string
  startDate?: Date
  endDate?: Date
  minAmount?: number
  maxAmount?: number
  clerkUserId?: string
  includeDeleted?: boolean
}

interface ExpenseListProps {
  onViewExpense: (expense: IExpenseEntry) => void
  onEditExpense: (expense: IExpenseEntry) => void
  onDeleteExpense: (expense: IExpenseEntry) => void
  onCreateExpense: () => void
  className?: string
  showUserFilter?: boolean // For admin view
  currentUserId?: string
}

export function ExpenseList({
  onViewExpense,
  onEditExpense,
  onDeleteExpense,
  onCreateExpense,
  className,
  showUserFilter = false,
  currentUserId
}: ExpenseListProps) {
  const [expenses, setExpenses] = useState<IExpenseEntry[]>([])
  const [categories, setCategories] = useState<IExpenseCategory[]>([])
  const [filters, setFilters] = useState<ExpenseFilters>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalExpenses, setTotalExpenses] = useState(0)
  const [showFilters, setShowFilters] = useState(false)
  const [retryManager] = useState(() => new ExpenseRetryManager())
  const [isRefreshing, setIsRefreshing] = useState(false)

  const itemsPerPage = 20

  // Load categories with retry
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
          onRetry: loadCategories,
          showDetails: true
        })
      }
    }

    loadCategories()
  }, [])

  // Load expenses with filters and retry
  const loadExpenses = useCallback(async (showLoadingToast = false) => {
    setIsLoading(true)
    setError(null)

    let loadingToastId: string | number | null = null
    if (showLoadingToast) {
      loadingToastId = showExpenseLoadingToast('Loading expenses...')
    }

    try {
      await retryManager.executeWithRetry(
        async () => {
          const params = new URLSearchParams({
            page: currentPage.toString(),
            limit: itemsPerPage.toString(),
          })

          // Add filters to params
          if (filters.search) params.append('search', filters.search)
          if (filters.category) params.append('category', filters.category)
          if (filters.startDate) params.append('startDate', filters.startDate.toISOString())
          if (filters.endDate) params.append('endDate', filters.endDate.toISOString())
          if (filters.minAmount !== undefined) params.append('minAmount', filters.minAmount.toString())
          if (filters.maxAmount !== undefined) params.append('maxAmount', filters.maxAmount.toString())
          if (filters.clerkUserId) params.append('clerkUserId', filters.clerkUserId)
          if (filters.includeDeleted) params.append('includeDeleted', 'true')

          const response = await fetch(`/api/expenses?${params}`)
          if (!response.ok) {
            const error = createExpenseErrorFromResponse(response)
            throw error
          }

          const data = await response.json()
          setExpenses(data.expenses || [])
          setTotalPages(data.totalPages || 1)
          setTotalExpenses(data.total || 0)
        },
        (attempt, delay) => {
          if (attempt > 1 && loadingToastId) {
            dismissExpenseLoadingToast(loadingToastId, false)
            loadingToastId = showExpenseLoadingToast(
              `Loading expenses... (Retry ${attempt})`,
              `Retrying in ${Math.round(delay/1000)}s...`
            )
          }
        }
      )

      if (loadingToastId) {
        dismissExpenseLoadingToast(loadingToastId, true, 'Expenses loaded successfully')
      }
    } catch (error: any) {
      console.error('Error loading expenses:', error)
      setError(error.message || 'Failed to load expenses')
      
      if (loadingToastId) {
        dismissExpenseLoadingToast(loadingToastId, false)
      }
      
      showExpenseErrorToast(error, {
        onRetry: () => loadExpenses(true),
        showDetails: true,
        currentRetries: retryManager.getRemainingRetries()
      })
    } finally {
      setIsLoading(false)
    }
  }, [currentPage, filters, retryManager])

  // Load expenses when filters or page changes
  useEffect(() => {
    loadExpenses()
  }, [loadExpenses])

  // Update filter
  const updateFilter = <K extends keyof ExpenseFilters>(key: K, value: ExpenseFilters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setCurrentPage(1) // Reset to first page when filtering
  }

  // Clear all filters
  const clearFilters = () => {
    setFilters({})
    setCurrentPage(1)
  }

  // Format currency
  const formatCurrency = (amount: number, currency: string = 'INR') => {
    const symbol = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency
    return `${symbol}${amount.toLocaleString()}`
  }

  // Get category name
  const getCategoryName = (categoryId: string) => {
    const category = categories.find(cat => cat._id?.toString() === categoryId)
    return category?.name || 'Unknown'
  }

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = []
    const maxVisible = 5
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2))
    let end = Math.min(totalPages, start + maxVisible - 1)
    
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1)
    }

    for (let i = start; i <= end; i++) {
      pages.push(i)
    }
    return pages
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Expenses</h2>
          <p className="text-muted-foreground">
            {totalExpenses} expense{totalExpenses !== 1 ? 's' : ''} found
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setIsRefreshing(true)
              loadExpenses(true).finally(() => setIsRefreshing(false))
            }}
            disabled={isLoading || isRefreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={cn('h-4 w-4', (isLoading || isRefreshing) && 'animate-spin')} />
            Refresh
          </Button>
          <Button onClick={onCreateExpense} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Expense
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Filters</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="flex items-center gap-1"
              >
                <X className="h-4 w-4" />
                Clear All
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Search */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search description, vendor..."
                    value={filters.search || ''}
                    onChange={(e) => updateFilter('search', e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Category */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Select
                  value={filters.category || 'all'}
                  onValueChange={(value) => updateFilter('category', value === 'all' ? undefined : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category._id?.toString()} value={category._id?.toString() || ''}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date Range */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !filters.startDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.startDate ? format(filters.startDate, 'PPP') : 'Pick start date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.startDate}
                      onSelect={(date) => updateFilter('startDate', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">End Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !filters.endDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.endDate ? format(filters.endDate, 'PPP') : 'Pick end date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.endDate}
                      onSelect={(date) => updateFilter('endDate', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Amount Range */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Min Amount</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={filters.minAmount || ''}
                  onChange={(e) => updateFilter('minAmount', e.target.value ? parseFloat(e.target.value) : undefined)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Max Amount</label>
                <Input
                  type="number"
                  placeholder="No limit"
                  value={filters.maxAmount || ''}
                  onChange={(e) => updateFilter('maxAmount', e.target.value ? parseFloat(e.target.value) : undefined)}
                />
              </div>

              {/* Include Deleted */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Show Deleted</label>
                <Select
                  value={filters.includeDeleted ? 'true' : 'false'}
                  onValueChange={(value) => updateFilter('includeDeleted', value === 'true')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="false">Active Only</SelectItem>
                    <SelectItem value="true">Include Deleted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Expenses Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Receipts</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Loading expenses...
                    </div>
                  </TableCell>
                </TableRow>
              ) : expenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No expenses found. Try adjusting your filters or create a new expense.
                  </TableCell>
                </TableRow>
              ) : (
                expenses.map((expense) => (
                  <TableRow key={expense._id?.toString()}>
                    <TableCell>
                      {format(new Date(expense.expenseDate), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(expense.amount, expense.currency)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {getCategoryName(expense.category.toString())}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {expense.description || '-'}
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate">
                      {expense.vendor || '-'}
                    </TableCell>
                    <TableCell>
                      {expense.receipts && expense.receipts.length > 0 ? (
                        <Badge variant="outline">
                          {expense.receipts.length} receipt{expense.receipts.length !== 1 ? 's' : ''}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {expense.isDeleted ? (
                        <Badge variant="destructive">Deleted</Badge>
                      ) : (
                        <Badge variant="default">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewExpense(expense)}
                          className="h-8 w-8 p-0"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {!expense.isDeleted && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onEditExpense(expense)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onDeleteExpense(expense)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalExpenses)} of {totalExpenses} expenses
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            
            {getPageNumbers().map((page) => (
              <Button
                key={page}
                variant={page === currentPage ? "default" : "outline"}
                size="sm"
                onClick={() => handlePageChange(page)}
                className="w-8 h-8 p-0"
              >
                {page}
              </Button>
            ))}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ExpenseList