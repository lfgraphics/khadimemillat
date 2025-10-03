"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<ErrorFallbackProps>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface ErrorFallbackProps {
  error: Error
  resetError: () => void
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Dashboard Error Boundary caught an error:', error, errorInfo)
    
    this.setState({
      error,
      errorInfo
    })

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // Show error toast
    toast.error('Something went wrong. Please try refreshing the page.')
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback
      return (
        <FallbackComponent 
          error={this.state.error!} 
          resetError={this.resetError}
        />
      )
    }

    return this.props.children
  }
}

function DefaultErrorFallback({ error, resetError }: ErrorFallbackProps) {
  const enhancedError = classifyError(error)
  
  const handleRefresh = () => {
    resetError()
    window.location.reload()
  }

  const getErrorIcon = () => {
    switch (enhancedError.type) {
      case 'network':
        return <RefreshCw className="h-6 w-6 text-blue-600 dark:text-blue-400" />
      case 'permission':
        return <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
      default:
        return <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
    }
  }

  const getErrorTitle = () => {
    switch (enhancedError.type) {
      case 'network':
        return 'Connection Problem'
      case 'permission':
        return 'Access Denied'
      case 'timeout':
        return 'Request Timed Out'
      case 'server':
        return 'Server Error'
      default:
        return 'Something went wrong'
    }
  }

  const getBackgroundColor = () => {
    switch (enhancedError.type) {
      case 'network':
        return 'bg-blue-100 dark:bg-blue-900/20'
      case 'permission':
        return 'bg-yellow-100 dark:bg-yellow-900/20'
      default:
        return 'bg-red-100 dark:bg-red-900/20'
    }
  }

  return (
    <div className="min-h-[400px] flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className={`mx-auto mb-4 h-12 w-12 rounded-full ${getBackgroundColor()} flex items-center justify-center`}>
            {getErrorIcon()}
          </div>
          <CardTitle className="text-lg">{getErrorTitle()}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
            {enhancedError.userMessage || 'An unexpected error occurred while loading the dashboard.'}
          </p>
          
          {process.env.NODE_ENV === 'development' && (
            <details className="text-xs bg-gray-50 dark:bg-gray-800 p-3 rounded border">
              <summary className="cursor-pointer font-medium mb-2">Error Details</summary>
              <pre className="whitespace-pre-wrap text-red-600 dark:text-red-400">
                Type: {enhancedError.type}
                {enhancedError.code && `\nCode: ${enhancedError.code}`}
                {`\nMessage: ${error.message}`}
                {error.stack && `\n\nStack:\n${error.stack}`}
              </pre>
            </details>
          )}
          
          <div className="flex flex-col sm:flex-row gap-2">
            {enhancedError.retryable !== false && (
              <Button 
                onClick={resetError} 
                variant="outline" 
                className="flex-1"
              >
                Try Again
              </Button>
            )}
            <Button 
              onClick={handleRefresh} 
              className="flex-1 flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh Page
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Inline error display component
export interface InlineErrorProps {
  error: Error | string
  onRetry?: () => void
  retrying?: boolean
  className?: string
}

export function InlineError({ error, onRetry, retrying = false, className }: InlineErrorProps) {
  const errorObj = typeof error === 'string' ? new Error(error) : error
  const enhancedError = classifyError(errorObj)

  return (
    <Card className={`border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/10 ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-red-800 dark:text-red-200">
              {enhancedError.userMessage || errorObj.message}
            </p>
            {process.env.NODE_ENV === 'development' && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-mono">
                {errorObj.message}
              </p>
            )}
          </div>
          {onRetry && enhancedError.retryable !== false && (
            <Button
              size="sm"
              variant="outline"
              onClick={onRetry}
              disabled={retrying}
              className="flex-shrink-0"
            >
              {retrying ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  Retrying...
                </>
              ) : (
                'Retry'
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Error toast with retry functionality
export function showErrorToast(error: Error, onRetry?: () => void) {
  const enhancedError = classifyError(error)
  
  toast.error(enhancedError.userMessage || error.message, {
    action: onRetry && enhancedError.retryable !== false ? {
      label: 'Retry',
      onClick: onRetry
    } : undefined,
    duration: enhancedError.type === 'permission' ? 5000 : 4000
  })
}

// Enhanced error types for better error handling
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
}

// Utility to classify errors
export function classifyError(error: Error): EnhancedError {
  const enhancedError = error as EnhancedError
  
  // If already classified, return as is
  if (enhancedError.type) {
    return enhancedError
  }

  // Network errors
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    return {
      ...enhancedError,
      type: 'network',
      retryable: true,
      userMessage: 'Network connection failed. Please check your internet connection and try again.'
    }
  }

  // Timeout errors
  if (error.name === 'AbortError' || error.message.includes('timeout')) {
    return {
      ...enhancedError,
      type: 'timeout',
      retryable: true,
      userMessage: 'Request timed out. Please try again.'
    }
  }

  // Permission errors
  if (error.message.includes('unauthorized') || error.message.includes('permission') || error.message.includes('403')) {
    return {
      ...enhancedError,
      type: 'permission',
      retryable: false,
      userMessage: 'You don\'t have permission to perform this action.'
    }
  }

  // Validation errors
  if (error.message.includes('validation') || error.message.includes('invalid') || error.message.includes('400')) {
    return {
      ...enhancedError,
      type: 'validation',
      retryable: false,
      userMessage: 'Invalid data provided. Please check your input and try again.'
    }
  }

  // Server errors
  if (error.message.includes('500') || error.message.includes('502') || error.message.includes('503')) {
    return {
      ...enhancedError,
      type: 'server',
      retryable: true,
      userMessage: 'Server error occurred. Please try again in a moment.'
    }
  }

  // Default to unknown
  return {
    ...enhancedError,
    type: 'unknown',
    retryable: true,
    userMessage: 'An unexpected error occurred. Please try again.'
  }
}

// Enhanced error recovery hook with better retry logic
export function useErrorRecovery() {
  const [retryCount, setRetryCount] = React.useState(0)
  const [isRecovering, setIsRecovering] = React.useState(false)
  const [lastError, setLastError] = React.useState<EnhancedError | null>(null)

  const recover = React.useCallback(async (
    operation: () => Promise<void>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ) => {
    if (retryCount >= maxRetries) {
      const error = new Error(`Operation failed after ${maxRetries} attempts`) as EnhancedError
      error.type = 'client'
      error.retryable = false
      error.userMessage = `Failed after ${maxRetries} attempts. Please refresh the page or contact support.`
      throw error
    }

    setIsRecovering(true)
    
    try {
      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, retryCount) + Math.random() * 1000
      await new Promise(resolve => setTimeout(resolve, delay))
      
      await operation()
      
      // Reset on success
      setRetryCount(0)
      setLastError(null)
    } catch (error) {
      const enhancedError = classifyError(error as Error)
      setLastError(enhancedError)
      setRetryCount(prev => prev + 1)
      
      // Don't retry if error is not retryable
      if (!enhancedError.retryable) {
        setRetryCount(maxRetries) // Prevent further retries
      }
      
      throw enhancedError
    } finally {
      setIsRecovering(false)
    }
  }, [retryCount])

  const reset = React.useCallback(() => {
    setRetryCount(0)
    setIsRecovering(false)
    setLastError(null)
  }, [])

  const canRetry = React.useCallback((maxRetries: number = 3) => {
    return retryCount < maxRetries && (lastError?.retryable !== false)
  }, [retryCount, lastError])

  return {
    recover,
    reset,
    retryCount,
    isRecovering,
    canRetry,
    lastError
  }
}

// Hook for handling API errors with user-friendly messages
export function useApiErrorHandler() {
  const showError = React.useCallback((error: Error, context?: string) => {
    const enhancedError = classifyError(error)
    
    let message = enhancedError.userMessage || 'An unexpected error occurred'
    
    if (context) {
      message = `${context}: ${message}`
    }

    // Log detailed error for debugging
    console.error('API Error:', {
      message: error.message,
      type: enhancedError.type,
      context,
      stack: error.stack
    })

    // Show user-friendly message
    toast.error(message)
    
    return enhancedError
  }, [])

  const handleAsyncError = React.useCallback(async (
    operation: () => Promise<any>,
    context?: string,
    onError?: (error: EnhancedError) => void
  ): Promise<any | null> => {
    try {
      return await operation()
    } catch (error) {
      const enhancedError = showError(error as Error, context)
      onError?.(enhancedError)
      return null
    }
  }, [showError])

  return {
    showError,
    handleAsyncError
  }
}

export default ErrorBoundary