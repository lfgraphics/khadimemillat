// Toast notification integration for File Selector errors

import { toast } from 'sonner'
import { 
  FileUploadError, 
  UploadResult 
} from './types'
import { 
  classifyError, 
  getErrorSeverity, 
  getErrorSummary, 
  getDetailedErrorMessage,
  ErrorSeverity,
  ERROR_MESSAGES
} from './error-handling'

// Toast notification options based on error severity
const getToastOptions = (severity: ErrorSeverity) => {
  switch (severity) {
    case ErrorSeverity.LOW:
      return {
        duration: 4000,
        style: { backgroundColor: '#fef3c7', color: '#92400e' }
      }
    case ErrorSeverity.MEDIUM:
      return {
        duration: 6000,
        style: { backgroundColor: '#fed7aa', color: '#c2410c' }
      }
    case ErrorSeverity.HIGH:
      return {
        duration: 8000,
        style: { backgroundColor: '#fecaca', color: '#dc2626' }
      }
    case ErrorSeverity.CRITICAL:
      return {
        duration: 10000,
        style: { backgroundColor: '#fca5a5', color: '#b91c1c' }
      }
    default:
      return { duration: 5000 }
  }
}

// Show error toast with appropriate styling and actions
export function showErrorToast(
  error: FileUploadError,
  options?: {
    onRetry?: () => void
    onFallback?: () => void
    showDetails?: boolean
    currentRetries?: number
  }
) {
  const errorKey = classifyError(error)
  const severity = getErrorSeverity(errorKey)
  const summary = getErrorSummary(errorKey)
  const toastOptions = getToastOptions(severity)
  
  const errorConfig = ERROR_MESSAGES[errorKey]
  
  // Create action buttons if available
  const actions: any[] = []
  
  if (errorConfig.recovery.canRetry && options?.onRetry) {
    const maxRetries = errorConfig.recovery.maxRetries || 3
    const currentRetries = options.currentRetries || 0
    
    if (currentRetries < maxRetries) {
      actions.push({
        label: `Retry (${maxRetries - currentRetries} left)`,
        onClick: options.onRetry
      })
    }
  }
  
  if ('fallbackLabel' in errorConfig.recovery && errorConfig.recovery.fallbackLabel && options?.onFallback) {
    actions.push({
      label: errorConfig.recovery.fallbackLabel,
      onClick: options.onFallback
    })
  }

  // Show toast based on severity
  switch (severity) {
    case ErrorSeverity.LOW:
      toast.warning(summary, {
        description: options?.showDetails ? errorConfig.suggestion : undefined,
        action: actions.length > 0 ? actions[0] : undefined,
        ...toastOptions
      })
      break
      
    case ErrorSeverity.MEDIUM:
      toast.error(summary, {
        description: options?.showDetails ? errorConfig.suggestion : undefined,
        action: actions.length > 0 ? actions[0] : undefined,
        ...toastOptions
      })
      break
      
    case ErrorSeverity.HIGH:
    case ErrorSeverity.CRITICAL:
      toast.error(summary, {
        description: getDetailedErrorMessage(errorKey),
        action: actions.length > 0 ? actions[0] : undefined,
        ...toastOptions
      })
      break
      
    default:
      toast.error(summary, {
        description: errorConfig.suggestion,
        ...toastOptions
      })
  }
}

// Show success toast for successful uploads
export function showSuccessToast(
  result: UploadResult,
  fileName?: string
) {
  const message = fileName 
    ? `${fileName} uploaded successfully`
    : 'File uploaded successfully'
    
  toast.success(message, {
    description: `File size: ${formatBytes(result.bytes)} • Format: ${result.format.toUpperCase()}`,
    duration: 4000
  })
}

// Show progress toast for ongoing uploads
export function showProgressToast(
  fileName: string,
  progress: number
): string | number {
  return toast.loading(`Uploading ${fileName}...`, {
    description: `${progress}% complete`,
    duration: Infinity // Keep showing until dismissed
  })
}

// Update progress toast
export function updateProgressToast(
  toastId: string | number,
  progress: number,
  fileName: string
) {
  toast.loading(`Uploading ${fileName}...`, {
    id: toastId,
    description: `${progress}% complete`,
    duration: Infinity
  })
}

// Dismiss progress toast and show result
export function dismissProgressToast(
  toastId: string | number,
  success: boolean,
  fileName: string,
  result?: UploadResult,
  error?: FileUploadError
) {
  toast.dismiss(toastId)
  
  if (success && result) {
    showSuccessToast(result, fileName)
  } else if (error) {
    showErrorToast(error)
  }
}

// Show validation error toast (for immediate feedback)
export function showValidationErrorToast(
  errors: string[],
  fileName?: string
) {
  const title = fileName 
    ? `${fileName} validation failed`
    : 'File validation failed'
    
  const description = errors.length === 1 
    ? errors[0]
    : `${errors.length} issues found: ${errors[0]}`
    
  toast.error(title, {
    description,
    duration: 6000
  })
}

// Show camera error toast
export function showCameraErrorToast(
  error: FileUploadError,
  onFallback?: () => void
) {
  showErrorToast(error, {
    onFallback,
    showDetails: true
  })
}

// Show network error toast with retry
export function showNetworkErrorToast(
  error: FileUploadError,
  onRetry?: () => void,
  currentRetries?: number
) {
  showErrorToast(error, {
    onRetry,
    currentRetries,
    showDetails: true
  })
}

// Utility function to format bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Batch error notifications (for multiple file uploads)
export function showBatchErrorToast(
  errors: Array<{ fileName: string; error: FileUploadError }>,
  onRetryAll?: () => void
) {
  const errorCount = errors.length
  const title = `${errorCount} file${errorCount > 1 ? 's' : ''} failed to upload`
  
  const firstError = errors[0]
  const description = errorCount === 1 
    ? `${firstError.fileName}: ${firstError.error.message}`
    : `${firstError.fileName} and ${errorCount - 1} other${errorCount > 2 ? 's' : ''}`
    
  toast.error(title, {
    description,
    action: onRetryAll ? {
      label: 'Retry All',
      onClick: onRetryAll
    } : undefined,
    duration: 8000
  })
}

// Show info toast for general information
export function showInfoToast(
  message: string,
  description?: string
) {
  toast.info(message, {
    description,
    duration: 4000
  })
}