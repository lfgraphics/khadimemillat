// Enhanced error handling utilities for Expense Management System

import { toast } from 'sonner'

export interface ExpenseError extends Error {
  code?: string
  statusCode?: number
  details?: any
  retryable?: boolean
}

export interface ErrorRecoveryOptions {
  canRetry: boolean
  retryAction?: () => void | Promise<void>
  maxRetries?: number
  currentRetries?: number
  fallbackAction?: () => void
  fallbackLabel?: string
}

export interface LoadingState {
  isLoading: boolean
  operation?: string
  progress?: number
}

// Error categories for expense operations
export const EXPENSE_ERROR_TYPES = {
  VALIDATION: 'validation',
  AUTHORIZATION: 'authorization', 
  NETWORK: 'network',
  DATABASE: 'database',
  FILE_UPLOAD: 'file_upload',
  BUSINESS_LOGIC: 'business_logic',
  SYSTEM: 'system'
} as const

// User-friendly error messages with recovery suggestions
export const EXPENSE_ERROR_MESSAGES = {
  // Validation errors
  INVALID_AMOUNT: {
    title: 'Invalid Amount',
    message: 'The expense amount must be a positive number.',
    suggestion: 'Please enter a valid amount greater than 0.',
    recovery: { canRetry: false }
  },
  MISSING_CATEGORY: {
    title: 'Category Required',
    message: 'Please select an expense category.',
    suggestion: 'Choose a category from the dropdown list.',
    recovery: { canRetry: false }
  },
  INVALID_DATE: {
    title: 'Invalid Date',
    message: 'The expense date is invalid or in the future.',
    suggestion: 'Please select a valid date that is not in the future.',
    recovery: { canRetry: false }
  },
  DESCRIPTION_TOO_LONG: {
    title: 'Description Too Long',
    message: 'The description exceeds the maximum length of 500 characters.',
    suggestion: 'Please shorten the description.',
    recovery: { canRetry: false }
  },

  // Authorization errors
  INSUFFICIENT_PERMISSIONS: {
    title: 'Access Denied',
    message: 'You do not have permission to perform this action.',
    suggestion: 'Please contact an administrator if you need access.',
    recovery: { canRetry: false }
  },
  EDIT_PERMISSION_DENIED: {
    title: 'Cannot Edit Expense',
    message: 'You can only edit your own expenses.',
    suggestion: 'Contact an administrator if you need to edit this expense.',
    recovery: { canRetry: false }
  },
  EDIT_TIME_LIMIT_EXCEEDED: {
    title: 'Edit Time Limit Exceeded',
    message: 'Expenses older than 30 days cannot be edited without admin approval.',
    suggestion: 'Contact an administrator to edit this expense.',
    recovery: { canRetry: false }
  },

  // Network errors
  NETWORK_ERROR: {
    title: 'Network Error',
    message: 'Unable to connect to the server.',
    suggestion: 'Please check your internet connection and try again.',
    recovery: { canRetry: true, maxRetries: 3 }
  },
  TIMEOUT_ERROR: {
    title: 'Request Timeout',
    message: 'The request took too long to complete.',
    suggestion: 'This might be due to a slow connection. Please try again.',
    recovery: { canRetry: true, maxRetries: 2 }
  },
  SERVER_ERROR: {
    title: 'Server Error',
    message: 'The server encountered an error while processing your request.',
    suggestion: 'Please try again in a few moments.',
    recovery: { canRetry: true, maxRetries: 2 }
  },

  // Database errors
  EXPENSE_NOT_FOUND: {
    title: 'Expense Not Found',
    message: 'The requested expense could not be found.',
    suggestion: 'The expense may have been deleted or you may not have access to it.',
    recovery: { canRetry: false }
  },
  CATEGORY_NOT_FOUND: {
    title: 'Category Not Found',
    message: 'The selected expense category is no longer available.',
    suggestion: 'Please select a different category.',
    recovery: { canRetry: false }
  },
  CATEGORY_INACTIVE: {
    title: 'Category Inactive',
    message: 'The selected category has been deactivated.',
    suggestion: 'Please select an active category.',
    recovery: { canRetry: false }
  },
  DATABASE_CONNECTION_ERROR: {
    title: 'Database Error',
    message: 'Unable to connect to the database.',
    suggestion: 'Please try again in a few moments.',
    recovery: { canRetry: true, maxRetries: 2 }
  },

  // File upload errors
  RECEIPT_UPLOAD_FAILED: {
    title: 'Receipt Upload Failed',
    message: 'The receipt could not be uploaded.',
    suggestion: 'Please try uploading the receipt again.',
    recovery: { canRetry: true, maxRetries: 3 }
  },
  RECEIPT_TOO_LARGE: {
    title: 'Receipt File Too Large',
    message: 'The receipt file exceeds the maximum size limit of 10MB.',
    suggestion: 'Please compress the image or choose a smaller file.',
    recovery: { canRetry: false }
  },
  INVALID_RECEIPT_FORMAT: {
    title: 'Invalid Receipt Format',
    message: 'The receipt file format is not supported.',
    suggestion: 'Please upload a JPEG, PNG, or PDF file.',
    recovery: { canRetry: false }
  },

  // Business logic errors
  EXPENSE_ALREADY_DELETED: {
    title: 'Expense Already Deleted',
    message: 'This expense has already been deleted.',
    suggestion: 'Refresh the page to see the current status.',
    recovery: { canRetry: false }
  },
  DUPLICATE_EXPENSE: {
    title: 'Duplicate Expense',
    message: 'A similar expense already exists.',
    suggestion: 'Please check if this expense has already been recorded.',
    recovery: { canRetry: false }
  },

  // Generic errors
  UNKNOWN_ERROR: {
    title: 'Unexpected Error',
    message: 'An unexpected error occurred.',
    suggestion: 'Please try again or contact support if the problem persists.',
    recovery: { canRetry: true, maxRetries: 1 }
  }
} as const

export type ExpenseErrorKey = keyof typeof EXPENSE_ERROR_MESSAGES

// Enhanced error classification for expense operations
export function classifyExpenseError(error: ExpenseError | Error): ExpenseErrorKey {
  const message = error.message.toLowerCase()
  const statusCode = 'statusCode' in error ? error.statusCode : 0

  // Authorization errors (4xx)
  if (statusCode === 401 || message.includes('unauthorized')) {
    return 'INSUFFICIENT_PERMISSIONS'
  }
  if (statusCode === 403 || message.includes('access denied') || message.includes('permission')) {
    if (message.includes('edit') || message.includes('modify')) {
      if (message.includes('30 days') || message.includes('time limit')) {
        return 'EDIT_TIME_LIMIT_EXCEEDED'
      }
      return 'EDIT_PERMISSION_DENIED'
    }
    return 'INSUFFICIENT_PERMISSIONS'
  }

  // Validation errors (400)
  if (statusCode === 400 || message.includes('validation')) {
    if (message.includes('amount') && (message.includes('positive') || message.includes('greater'))) {
      return 'INVALID_AMOUNT'
    }
    if (message.includes('category') && message.includes('required')) {
      return 'MISSING_CATEGORY'
    }
    if (message.includes('date') && (message.includes('invalid') || message.includes('future'))) {
      return 'INVALID_DATE'
    }
    if (message.includes('description') && message.includes('500')) {
      return 'DESCRIPTION_TOO_LONG'
    }
  }

  // Not found errors (404)
  if (statusCode === 404 || message.includes('not found')) {
    if (message.includes('expense')) {
      return 'EXPENSE_NOT_FOUND'
    }
    if (message.includes('category')) {
      return 'CATEGORY_NOT_FOUND'
    }
  }

  // Business logic errors
  if (message.includes('inactive') && message.includes('category')) {
    return 'CATEGORY_INACTIVE'
  }
  if (message.includes('already deleted')) {
    return 'EXPENSE_ALREADY_DELETED'
  }
  if (message.includes('duplicate')) {
    return 'DUPLICATE_EXPENSE'
  }

  // File upload errors
  if (message.includes('receipt') || message.includes('upload')) {
    if (message.includes('size') || message.includes('large') || message.includes('10mb')) {
      return 'RECEIPT_TOO_LARGE'
    }
    if (message.includes('format') || message.includes('type')) {
      return 'INVALID_RECEIPT_FORMAT'
    }
    return 'RECEIPT_UPLOAD_FAILED'
  }

  // Network errors
  if ((statusCode && statusCode >= 500) || message.includes('server error') || message.includes('internal')) {
    return 'SERVER_ERROR'
  }
  if (message.includes('timeout')) {
    return 'TIMEOUT_ERROR'
  }
  if (message.includes('network') || message.includes('connection') || statusCode === 0) {
    if (message.includes('database')) {
      return 'DATABASE_CONNECTION_ERROR'
    }
    return 'NETWORK_ERROR'
  }

  return 'UNKNOWN_ERROR'
}

// Create enhanced error info with recovery options
export function createExpenseErrorInfo(
  error: ExpenseError | Error,
  retryAction?: () => void | Promise<void>,
  fallbackAction?: () => void,
  currentRetries: number = 0
) {
  const errorKey = classifyExpenseError(error)
  const errorConfig = EXPENSE_ERROR_MESSAGES[errorKey]
  
  const recovery: ErrorRecoveryOptions = {
    ...errorConfig.recovery,
    retryAction,
    fallbackAction,
    currentRetries
  }

  // Disable retry if max retries reached
  if (recovery.maxRetries && currentRetries >= recovery.maxRetries) {
    recovery.canRetry = false
  }

  return {
    key: errorKey,
    title: errorConfig.title,
    message: errorConfig.message,
    suggestion: errorConfig.suggestion,
    recovery,
    originalError: error
  }
}

// Show expense error toast with appropriate styling and actions
export function showExpenseErrorToast(
  error: ExpenseError | Error,
  options?: {
    onRetry?: () => void | Promise<void>
    onFallback?: () => void
    showDetails?: boolean
    currentRetries?: number
  }
) {
  const errorInfo = createExpenseErrorInfo(
    error,
    options?.onRetry,
    options?.onFallback,
    options?.currentRetries || 0
  )

  const actions: any[] = []
  
  // Add retry action if available
  if (errorInfo.recovery.canRetry && options?.onRetry) {
    const maxRetries = errorInfo.recovery.maxRetries || 3
    const currentRetries = options.currentRetries || 0
    
    if (currentRetries < maxRetries) {
      actions.push({
        label: `Retry (${maxRetries - currentRetries} left)`,
        onClick: options.onRetry
      })
    }
  }
  
  // Add fallback action if available
  if (errorInfo.recovery.fallbackLabel && options?.onFallback) {
    actions.push({
      label: errorInfo.recovery.fallbackLabel,
      onClick: options.onFallback
    })
  }

  // Show error toast
  toast.error(errorInfo.title, {
    description: options?.showDetails ? 
      `${errorInfo.message} ${errorInfo.suggestion}` : 
      errorInfo.message,
    action: actions.length > 0 ? actions[0] : undefined,
    duration: errorInfo.recovery.canRetry ? 8000 : 6000
  })
}

// Show success toast for expense operations
export function showExpenseSuccessToast(
  operation: 'create' | 'update' | 'delete' | 'upload',
  details?: string
) {
  const messages = {
    create: 'Expense created successfully',
    update: 'Expense updated successfully', 
    delete: 'Expense deleted successfully',
    upload: 'Receipt uploaded successfully'
  }

  toast.success(messages[operation], {
    description: details,
    duration: 4000
  })
}

// Show loading toast for long operations
export function showExpenseLoadingToast(
  operation: string,
  details?: string
): string | number {
  return toast.loading(operation, {
    description: details,
    duration: Infinity
  })
}

// Update loading toast
export function updateExpenseLoadingToast(
  toastId: string | number,
  operation: string,
  details?: string
) {
  toast.loading(operation, {
    id: toastId,
    description: details,
    duration: Infinity
  })
}

// Dismiss loading toast and show result
export function dismissExpenseLoadingToast(
  toastId: string | number,
  success: boolean,
  successMessage?: string,
  error?: ExpenseError | Error
) {
  console.log('Dismissing loading toast:', toastId, success ? 'success' : 'error')
  
  // Force dismiss the specific toast
  toast.dismiss(toastId)
  
  // Small delay to ensure dismissal completes
  setTimeout(() => {
    if (success) {
      toast.success(successMessage || 'Operation completed successfully', {
        duration: 4000
      })
    } else if (error) {
      showExpenseErrorToast(error)
    }
  }, 100)
}

// Dismiss all loading toasts (emergency cleanup)
export function dismissAllExpenseLoadingToasts() {
  console.log('Dismissing all loading toasts')
  // Dismiss all toasts
  toast.dismiss()
}

// Utility function to create expense error from API response
export function createExpenseErrorFromResponse(
  response: Response,
  responseData?: any
): ExpenseError {
  const error = new Error(
    responseData?.error || 
    responseData?.message || 
    `HTTP ${response.status} ${response.statusText}`
  ) as ExpenseError

  error.statusCode = response.status
  error.details = responseData?.details
  error.retryable = response.status >= 500 || response.status === 0

  return error
}

// Utility function to handle API errors consistently
export async function handleExpenseApiError(
  response: Response,
  operation: string = 'operation'
): Promise<never> {
  let responseData: any
  
  try {
    responseData = await response.json()
  } catch {
    responseData = { error: `Failed to ${operation}` }
  }

  const error = createExpenseErrorFromResponse(response, responseData)
  throw error
}

// Retry mechanism for expense operations
export class ExpenseRetryManager {
  private retryCount = 0
  private maxRetries = 3
  private baseDelay = 1000

  constructor(maxRetries = 3, baseDelay = 1000) {
    this.maxRetries = maxRetries
    this.baseDelay = baseDelay
  }

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    onProgress?: (attempt: number, delay: number) => void
  ): Promise<T> {
    try {
      const result = await operation()
      this.retryCount = 0 // Reset on success
      return result
    } catch (error) {
      const expenseError = error as ExpenseError
      
      // Check if error is retryable and we haven't exceeded max retries
      if (expenseError.retryable && this.retryCount < this.maxRetries) {
        this.retryCount++
        const delay = this.baseDelay * Math.pow(2, this.retryCount - 1) // Exponential backoff
        
        onProgress?.(this.retryCount, delay)
        
        await new Promise(resolve => setTimeout(resolve, delay))
        return this.executeWithRetry(operation, onProgress)
      }
      
      throw error
    }
  }

  reset() {
    this.retryCount = 0
  }

  getRemainingRetries(): number {
    return Math.max(0, this.maxRetries - this.retryCount)
  }
}