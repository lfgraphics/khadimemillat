// Enhanced error handling utilities for File Selector

import { FileUploadError } from './types'

export interface ErrorRecoveryOptions {
  canRetry: boolean
  retryAction?: () => void
  fallbackAction?: () => void
  fallbackLabel?: string
  maxRetries?: number
  currentRetries?: number
}

export interface ErrorDisplayConfig {
  showDetails: boolean
  showRecovery: boolean
  autoHide: boolean
  hideDelay?: number
}

// Error categorization for better user experience
export const ERROR_CATEGORIES = {
  VALIDATION: 'validation',
  NETWORK: 'network', 
  UPLOAD: 'upload',
  CAMERA: 'camera',
  PERMISSION: 'permission',
  SYSTEM: 'system'
} as const

// User-friendly error messages with recovery suggestions
export const ERROR_MESSAGES = {
  // Validation errors
  FILE_TOO_LARGE: {
    title: 'File Too Large',
    message: 'The selected file exceeds the maximum size limit.',
    suggestion: 'Please choose a smaller file or compress the image.',
    recovery: { canRetry: false }
  },
  INVALID_FILE_TYPE: {
    title: 'Invalid File Type',
    message: 'This file type is not supported.',
    suggestion: 'Please select a JPEG, PNG, or WebP image file.',
    recovery: { canRetry: false }
  },
  CORRUPTED_FILE: {
    title: 'Corrupted File',
    message: 'The file appears to be damaged or corrupted.',
    suggestion: 'Please try a different file or re-save the image.',
    recovery: { canRetry: false }
  },
  INVALID_DIMENSIONS: {
    title: 'Invalid Image Dimensions',
    message: 'The image dimensions do not meet requirements.',
    suggestion: 'Please resize the image or choose a different one.',
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
    title: 'Upload Timeout',
    message: 'The upload took too long to complete.',
    suggestion: 'This might be due to a slow connection. Please try again.',
    recovery: { canRetry: true, maxRetries: 2 }
  },
  SERVER_ERROR: {
    title: 'Server Error',
    message: 'The server encountered an error while processing your request.',
    suggestion: 'Please try again in a few moments.',
    recovery: { canRetry: true, maxRetries: 2 }
  },

  // Upload errors
  UPLOAD_FAILED: {
    title: 'Upload Failed',
    message: 'The file could not be uploaded.',
    suggestion: 'Please try uploading the file again.',
    recovery: { canRetry: true, maxRetries: 3 }
  },
  QUOTA_EXCEEDED: {
    title: 'Storage Quota Exceeded',
    message: 'The upload quota has been exceeded.',
    suggestion: 'Please contact support or try again later.',
    recovery: { canRetry: false }
  },
  UNAUTHORIZED: {
    title: 'Upload Not Authorized',
    message: 'You do not have permission to upload files.',
    suggestion: 'Please sign in or contact support.',
    recovery: { canRetry: false }
  },

  // Camera errors
  CAMERA_PERMISSION_DENIED: {
    title: 'Camera Access Denied',
    message: 'Camera permissions are required to take photos.',
    suggestion: 'Please enable camera access in your browser settings.',
    recovery: { canRetry: false, fallbackLabel: 'Select from Files' }
  },
  CAMERA_NOT_AVAILABLE: {
    title: 'Camera Not Available',
    message: 'No camera was found on this device.',
    suggestion: 'Please use the file browser to select an image.',
    recovery: { canRetry: false, fallbackLabel: 'Select from Files' }
  },
  CAMERA_IN_USE: {
    title: 'Camera Busy',
    message: 'The camera is being used by another application.',
    suggestion: 'Please close other apps using the camera and try again.',
    recovery: { canRetry: true, maxRetries: 2, fallbackLabel: 'Select from Files' }
  },

  // Generic errors
  UNKNOWN_ERROR: {
    title: 'Unexpected Error',
    message: 'An unexpected error occurred.',
    suggestion: 'Please try again or contact support if the problem persists.',
    recovery: { canRetry: true, maxRetries: 1 }
  }
} as const

export type ErrorMessageKey = keyof typeof ERROR_MESSAGES

// Enhanced error classification
export function classifyError(error: FileUploadError): ErrorMessageKey {
  const message = error.message.toLowerCase()
  const type = error.type

  // Validation errors
  if (type === 'validation') {
    if (message.includes('size') || message.includes('large')) {
      return 'FILE_TOO_LARGE'
    }
    if (message.includes('type') || message.includes('format')) {
      return 'INVALID_FILE_TYPE'
    }
    if (message.includes('corrupt') || message.includes('damaged')) {
      return 'CORRUPTED_FILE'
    }
    if (message.includes('dimension') || message.includes('width') || message.includes('height')) {
      return 'INVALID_DIMENSIONS'
    }
  }

  // Network errors
  if (type === 'network') {
    if (message.includes('timeout')) {
      return 'TIMEOUT_ERROR'
    }
    return 'NETWORK_ERROR'
  }

  // Upload errors
  if (type === 'upload') {
    if (message.includes('quota') || message.includes('limit')) {
      return 'QUOTA_EXCEEDED'
    }
    if (message.includes('unauthorized') || message.includes('permission')) {
      return 'UNAUTHORIZED'
    }
    if (message.includes('server') || message.includes('500')) {
      return 'SERVER_ERROR'
    }
    return 'UPLOAD_FAILED'
  }

  // Camera errors
  if (type === 'camera') {
    if (message.includes('permission') || message.includes('denied')) {
      return 'CAMERA_PERMISSION_DENIED'
    }
    if (message.includes('not found') || message.includes('unavailable')) {
      return 'CAMERA_NOT_AVAILABLE'
    }
    if (message.includes('in use') || message.includes('busy')) {
      return 'CAMERA_IN_USE'
    }
  }

  return 'UNKNOWN_ERROR'
}

// Create enhanced error info with recovery options
export function createErrorInfo(
  error: FileUploadError,
  retryAction?: () => void,
  fallbackAction?: () => void,
  currentRetries: number = 0
) {
  const errorKey = classifyError(error)
  const errorConfig = ERROR_MESSAGES[errorKey]
  
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

// Error severity levels for different UI treatments
export enum ErrorSeverity {
  LOW = 'low',      // Minor issues, user can continue
  MEDIUM = 'medium', // Significant issues, user should address
  HIGH = 'high',    // Critical issues, blocks user progress
  CRITICAL = 'critical' // System-level issues, requires immediate attention
}

// Determine error severity
export function getErrorSeverity(errorKey: ErrorMessageKey): ErrorSeverity {
  switch (errorKey) {
    case 'FILE_TOO_LARGE':
    case 'INVALID_FILE_TYPE':
    case 'INVALID_DIMENSIONS':
      return ErrorSeverity.MEDIUM
    
    case 'CORRUPTED_FILE':
    case 'CAMERA_PERMISSION_DENIED':
    case 'CAMERA_NOT_AVAILABLE':
      return ErrorSeverity.HIGH
    
    case 'NETWORK_ERROR':
    case 'TIMEOUT_ERROR':
    case 'CAMERA_IN_USE':
      return ErrorSeverity.MEDIUM
    
    case 'SERVER_ERROR':
    case 'QUOTA_EXCEEDED':
    case 'UNAUTHORIZED':
      return ErrorSeverity.HIGH
    
    case 'UPLOAD_FAILED':
      return ErrorSeverity.MEDIUM
    
    case 'UNKNOWN_ERROR':
      return ErrorSeverity.CRITICAL
    
    default:
      return ErrorSeverity.MEDIUM
  }
}

// Generate user-friendly error summary for toast notifications
export function getErrorSummary(errorKey: ErrorMessageKey): string {
  const config = ERROR_MESSAGES[errorKey]
  return `${config.title}: ${config.message}`
}

// Generate detailed error message with suggestion
export function getDetailedErrorMessage(errorKey: ErrorMessageKey): string {
  const config = ERROR_MESSAGES[errorKey]
  return `${config.message} ${config.suggestion}`
}