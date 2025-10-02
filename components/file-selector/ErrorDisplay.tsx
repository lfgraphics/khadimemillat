'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  AlertTriangle, 
  XCircle, 
  AlertCircle, 
  RefreshCw, 
  FileText,
  X
} from 'lucide-react'
import { 
  createErrorInfo, 
  ErrorSeverity, 
  getErrorSeverity, 
  ErrorMessageKey 
} from './error-handling'
import { FileUploadError } from './types'

interface ErrorDisplayProps {
  error: FileUploadError
  onRetry?: () => void
  onFallback?: () => void
  onDismiss?: () => void
  currentRetries?: number
  className?: string
  compact?: boolean
  showDetails?: boolean
}

export function ErrorDisplay({
  error,
  onRetry,
  onFallback,
  onDismiss,
  currentRetries = 0,
  className,
  compact = false,
  showDetails = true
}: ErrorDisplayProps) {
  const errorInfo = createErrorInfo(error, onRetry, onFallback, currentRetries)
  const severity = getErrorSeverity(errorInfo.key)

  // Get appropriate icon based on severity
  const getIcon = () => {
    switch (severity) {
      case ErrorSeverity.LOW:
        return <AlertCircle className="h-4 w-4" />
      case ErrorSeverity.MEDIUM:
        return <AlertTriangle className="h-4 w-4" />
      case ErrorSeverity.HIGH:
      case ErrorSeverity.CRITICAL:
        return <XCircle className="h-4 w-4" />
      default:
        return <AlertTriangle className="h-4 w-4" />
    }
  }

  // Get appropriate styling based on severity
  const getSeverityStyles = () => {
    switch (severity) {
      case ErrorSeverity.LOW:
        return {
          container: 'border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20',
          icon: 'text-yellow-600 dark:text-yellow-400',
          title: 'text-yellow-800 dark:text-yellow-200',
          message: 'text-yellow-700 dark:text-yellow-300'
        }
      case ErrorSeverity.MEDIUM:
        return {
          container: 'border-orange-200 bg-orange-50 dark:bg-orange-950/20',
          icon: 'text-orange-600 dark:text-orange-400',
          title: 'text-orange-800 dark:text-orange-200',
          message: 'text-orange-700 dark:text-orange-300'
        }
      case ErrorSeverity.HIGH:
        return {
          container: 'border-red-200 bg-red-50 dark:bg-red-950/20',
          icon: 'text-red-600 dark:text-red-400',
          title: 'text-red-800 dark:text-red-200',
          message: 'text-red-700 dark:text-red-300'
        }
      case ErrorSeverity.CRITICAL:
        return {
          container: 'border-red-300 bg-red-100 dark:bg-red-950/30',
          icon: 'text-red-700 dark:text-red-300',
          title: 'text-red-900 dark:text-red-100',
          message: 'text-red-800 dark:text-red-200'
        }
      default:
        return {
          container: 'border-gray-200 bg-gray-50 dark:bg-gray-950/20',
          icon: 'text-gray-600 dark:text-gray-400',
          title: 'text-gray-800 dark:text-gray-200',
          message: 'text-gray-700 dark:text-gray-300'
        }
    }
  }

  const styles = getSeverityStyles()

  if (compact) {
    return (
      <div 
        className={cn(
          'flex items-center gap-2 p-2 rounded-md border',
          styles.container,
          className
        )}
        role="alert"
        aria-live="assertive"
      >
        <div className={styles.icon} aria-hidden="true">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm font-medium truncate', styles.title)}>
            {errorInfo.title}
          </p>
        </div>
        {errorInfo.recovery.canRetry && onRetry && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRetry}
            className="h-6 px-2 text-xs focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label="Retry the failed operation"
          >
            <RefreshCw className="h-3 w-3 mr-1" aria-hidden="true" />
            Retry
          </Button>
        )}
        {onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="h-6 w-6 p-0 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label="Dismiss error message"
          >
            <X className="h-3 w-3" aria-hidden="true" />
          </Button>
        )}
      </div>
    )
  }

  return (
    <Alert 
      className={cn(styles.container, className)}
      role="alert"
      aria-live="assertive"
    >
      <div className={styles.icon} aria-hidden="true">
        {getIcon()}
      </div>
      
      <div className="flex-1">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h4 className={cn('font-medium mb-1', styles.title)}>
              {errorInfo.title}
            </h4>
            
            <AlertDescription className={cn('mb-2', styles.message)}>
              {errorInfo.message}
            </AlertDescription>
            
            {showDetails && errorInfo.suggestion && (
              <p className={cn('text-sm mb-3', styles.message)}>
                💡 {errorInfo.suggestion}
              </p>
            )}

            {/* Retry information */}
            {errorInfo.recovery.maxRetries && (errorInfo.recovery.currentRetries || 0) > 0 && (
              <p className={cn('text-xs mb-2', styles.message)} aria-live="polite">
                Attempt {errorInfo.recovery.currentRetries || 0} of {errorInfo.recovery.maxRetries}
              </p>
            )}
          </div>

          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="h-6 w-6 p-0 ml-2 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label="Dismiss error message"
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </Button>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mt-3" role="group" aria-label="Error recovery actions">
          {errorInfo.recovery.canRetry && onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="h-8 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label={`Retry the failed operation${errorInfo.recovery.maxRetries ? 
                ` (${(errorInfo.recovery.maxRetries - (errorInfo.recovery.currentRetries || 0))} attempts remaining)` : ''}`}
            >
              <RefreshCw className="h-3 w-3 mr-1" aria-hidden="true" />
              Try Again
              {errorInfo.recovery.maxRetries && 
                ` (${(errorInfo.recovery.maxRetries - (errorInfo.recovery.currentRetries || 0))} left)`
              }
            </Button>
          )}

          {errorInfo.recovery.fallbackAction && onFallback && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onFallback}
              className="h-8 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label={`Use alternative method: ${errorInfo.recovery.fallbackLabel || 'Try Alternative'}`}
            >
              <FileText className="h-3 w-3 mr-1" aria-hidden="true" />
              {errorInfo.recovery.fallbackLabel || 'Try Alternative'}
            </Button>
          )}
        </div>

        {/* Technical details (for debugging) */}
        {showDetails && process.env.NODE_ENV === 'development' && (
          <details className="mt-3">
            <summary className={cn('text-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded', styles.message)}>
              Technical Details
            </summary>
            <pre className={cn('text-xs mt-1 p-2 bg-black/5 rounded', styles.message)} aria-label="Technical error details">
              {JSON.stringify({
                type: error.type,
                message: error.message,
                details: error.details
              }, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </Alert>
  )
}

export default ErrorDisplay