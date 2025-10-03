/**
 * Comprehensive error handling service for the admin dashboard
 * Provides centralized error classification, retry logic, and user feedback
 */

import { toast } from 'sonner'

export type ErrorType = 
  | 'network'
  | 'validation' 
  | 'permission'
  | 'timeout'
  | 'server'
  | 'client'
  | 'unknown'

export interface EnhancedError extends Error {
  type?: ErrorType
  code?: string | number
  retryable?: boolean
  userMessage?: string
  context?: Record<string, any>
  timestamp?: Date
}

export interface RetryConfig {
  maxRetries: number
  baseDelay: number
  maxDelay: number
  backoffMultiplier: number
  jitter: boolean
}

export interface ErrorHandlingOptions {
  showToast?: boolean
  logError?: boolean
  context?: string
  retryConfig?: Partial<RetryConfig>
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  jitter: true
}

/**
 * Classifies an error and enhances it with additional metadata
 */
export function classifyError(error: Error, context?: Record<string, any>): EnhancedError {
  const enhancedError = error as EnhancedError
  
  // If already classified, return as is
  if (enhancedError.type) {
    return {
      ...enhancedError,
      context: { ...enhancedError.context, ...context },
      timestamp: enhancedError.timestamp || new Date()
    }
  }

  let type: ErrorType = 'unknown'
  let retryable = true
  let userMessage = 'An unexpected error occurred. Please try again.'

  // Network errors
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    type = 'network'
    userMessage = 'Network connection failed. Please check your internet connection and try again.'
  }
  // Timeout errors
  else if (error.name === 'AbortError' || error.message.includes('timeout')) {
    type = 'timeout'
    userMessage = 'Request timed out. Please try again.'
  }
  // Permission errors (401, 403)
  else if (error.message.includes('unauthorized') || error.message.includes('permission') || 
           error.message.includes('403') || error.message.includes('401')) {
    type = 'permission'
    retryable = false
    userMessage = 'You don\'t have permission to perform this action.'
  }
  // Validation errors (400)
  else if (error.message.includes('validation') || error.message.includes('invalid') || 
           error.message.includes('400')) {
    type = 'validation'
    retryable = false
    userMessage = 'Invalid data provided. Please check your input and try again.'
  }
  // Server errors (500, 502, 503)
  else if (error.message.includes('500') || error.message.includes('502') || 
           error.message.includes('503') || error.message.includes('504')) {
    type = 'server'
    userMessage = 'Server error occurred. Please try again in a moment.'
  }
  // Client errors (404, etc.)
  else if (error.message.includes('404')) {
    type = 'client'
    retryable = false
    userMessage = 'The requested resource was not found.'
  }

  return {
    ...enhancedError,
    type,
    retryable,
    userMessage,
    context,
    timestamp: new Date()
  }
}

/**
 * Calculates the delay for the next retry attempt
 */
function calculateRetryDelay(
  attempt: number, 
  config: RetryConfig
): number {
  let delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt)
  
  // Apply maximum delay cap
  delay = Math.min(delay, config.maxDelay)
  
  // Add jitter to prevent thundering herd
  if (config.jitter) {
    delay += Math.random() * 1000
  }
  
  return delay
}

/**
 * Executes an operation with retry logic
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config }
  let lastError: EnhancedError
  
  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = classifyError(error as Error, { attempt })
      
      // Don't retry if error is not retryable or we've exhausted attempts
      if (!lastError.retryable || attempt === retryConfig.maxRetries) {
        throw lastError
      }
      
      // Wait before retrying
      const delay = calculateRetryDelay(attempt, retryConfig)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw lastError!
}

/**
 * Handles errors with comprehensive logging and user feedback
 */
export function handleError(
  error: Error, 
  options: ErrorHandlingOptions = {}
): EnhancedError {
  const {
    showToast = true,
    logError = true,
    context,
    retryConfig
  } = options

  const enhancedError = classifyError(error, { context })

  // Log error for debugging
  if (logError) {
    console.error('Error handled:', {
      type: enhancedError.type,
      message: enhancedError.message,
      context: enhancedError.context,
      timestamp: enhancedError.timestamp,
      stack: enhancedError.stack
    })
  }

  // Show user-friendly toast
  if (showToast) {
    let message = enhancedError.userMessage || enhancedError.message
    
    if (context) {
      message = `${context}: ${message}`
    }

    const toastOptions: any = {
      duration: enhancedError.type === 'permission' ? 5000 : 4000
    }

    // Add retry action for retryable errors
    if (enhancedError.retryable && retryConfig) {
      toastOptions.action = {
        label: 'Retry',
        onClick: () => {
          // This would need to be handled by the calling component
          console.log('Retry requested for error:', enhancedError.message)
        }
      }
    }

    toast.error(message, toastOptions)
  }

  return enhancedError
}

/**
 * Wraps an async operation with comprehensive error handling
 */
export async function safeAsyncOperation<T>(
  operation: () => Promise<T>,
  options: ErrorHandlingOptions & {
    fallbackValue?: T
    onError?: (error: EnhancedError) => void
  } = {}
): Promise<T | null> {
  const { fallbackValue = null, onError, ...errorOptions } = options

  try {
    if (options.retryConfig) {
      return await withRetry(operation, options.retryConfig)
    } else {
      return await operation()
    }
  } catch (error) {
    const enhancedError = handleError(error as Error, errorOptions)
    
    // Call custom error handler if provided
    onError?.(enhancedError)
    
    return fallbackValue as T
  }
}

/**
 * Creates a fetch wrapper with built-in error handling and retry logic
 */
export async function safeFetch(
  url: string,
  options: RequestInit & {
    timeout?: number
    retryConfig?: Partial<RetryConfig>
    errorHandling?: ErrorHandlingOptions
  } = {}
): Promise<Response> {
  const {
    timeout = 10000,
    retryConfig,
    errorHandling = {},
    ...fetchOptions
  } = options

  const operation = async (): Promise<Response> => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return response
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }

  try {
    if (retryConfig) {
      return await withRetry(operation, retryConfig)
    } else {
      return await operation()
    }
  } catch (error) {
    throw handleError(error as Error, {
      context: `Fetch ${url}`,
      ...errorHandling
    })
  }
}

/**
 * Utility for handling form submission errors
 */
export function handleFormError(
  error: Error,
  setFieldError?: (field: string, message: string) => void
): EnhancedError {
  const enhancedError = classifyError(error)

  // Handle validation errors with field-specific messages
  if (enhancedError.type === 'validation' && setFieldError) {
    try {
      // Try to parse validation error details
      const errorData = JSON.parse(enhancedError.message)
      if (errorData.fields) {
        Object.entries(errorData.fields).forEach(([field, message]) => {
          setFieldError(field, message as string)
        })
        return enhancedError
      }
    } catch {
      // If parsing fails, show general error
    }
  }

  // Show general error toast
  toast.error(enhancedError.userMessage || 'Form submission failed')
  
  return enhancedError
}

/**
 * Error boundary helper for React components
 */
export function createErrorBoundaryHandler(componentName: string) {
  return (error: Error, errorInfo: React.ErrorInfo) => {
    const enhancedError = classifyError(error, {
      component: componentName,
      errorInfo
    })

    console.error(`Error in ${componentName}:`, {
      error: enhancedError,
      errorInfo
    })

    // Could send to error reporting service here
    // reportError(enhancedError)
  }
}

/**
 * Global error handler for unhandled promise rejections
 */
export function setupGlobalErrorHandling() {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason))
    const enhancedError = handleError(error, {
      context: 'Unhandled Promise Rejection',
      showToast: true
    })
    
    console.error('Unhandled promise rejection:', enhancedError)
    
    // Prevent the default browser behavior
    event.preventDefault()
  })

  // Handle uncaught errors
  window.addEventListener('error', (event) => {
    const enhancedError = handleError(event.error, {
      context: 'Uncaught Error',
      showToast: true
    })
    
    console.error('Uncaught error:', enhancedError)
  })
}