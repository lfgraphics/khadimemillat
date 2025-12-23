/**
 * Centralized error handling utilities for collection request creation
 */

export interface ErrorDetails {
  message: string;
  code?: string;
  field?: string;
  retryable: boolean;
  userFriendly: boolean;
}

/**
 * Parse and categorize errors from API responses
 */
export function parseApiError(error: any, context: string = 'operation'): ErrorDetails {
  // Handle network/connection errors
  if (error.name === 'AbortError' || error.name === 'TimeoutError') {
    return {
      message: `${context} timed out. Please check your connection and try again.`,
      code: 'TIMEOUT',
      retryable: true,
      userFriendly: true
    };
  }

  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    return {
      message: 'Connection error. Please check your internet connection and try again.',
      code: 'CONNECTION_ERROR',
      retryable: true,
      userFriendly: true
    };
  }

  if (error.message?.includes('NetworkError') || error.message?.includes('Failed to fetch')) {
    return {
      message: 'Network error. Please check your internet connection and try again.',
      code: 'NETWORK_ERROR',
      retryable: true,
      userFriendly: true
    };
  }

  // Handle HTTP status codes
  if (error.status) {
    switch (error.status) {
      case 400:
        return {
          message: error.message || 'Invalid request data. Please check your inputs.',
          code: 'BAD_REQUEST',
          retryable: false,
          userFriendly: true
        };
      case 401:
        return {
          message: 'Session expired. Please refresh the page and try again.',
          code: 'UNAUTHORIZED',
          retryable: false,
          userFriendly: true
        };
      case 403:
        return {
          message: 'Unauthorized. You do not have permission to perform this action.',
          code: 'FORBIDDEN',
          retryable: false,
          userFriendly: true
        };
      case 404:
        return {
          message: 'The requested resource was not found.',
          code: 'NOT_FOUND',
          retryable: false,
          userFriendly: true
        };
      case 429:
        return {
          message: 'Too many requests. Please wait a moment and try again.',
          code: 'RATE_LIMITED',
          retryable: true,
          userFriendly: true
        };
      case 500:
        return {
          message: 'Service temporarily unavailable. Please try again in a few moments.',
          code: 'INTERNAL_ERROR',
          retryable: true,
          userFriendly: true
        };
      case 502:
      case 503:
      case 504:
        return {
          message: 'Service temporarily unavailable. Please try again.',
          code: 'SERVICE_UNAVAILABLE',
          retryable: true,
          userFriendly: true
        };
      default:
        return {
          message: `Service error (${error.status}). Please try again.`,
          code: 'HTTP_ERROR',
          retryable: true,
          userFriendly: true
        };
    }
  }

  // Handle specific error messages
  if (error.message) {
    const message = error.message.toLowerCase();
    
    if (message.includes('user is no longer available') || message.includes('user not found')) {
      return {
        message: 'Selected user is no longer available. Please search for the user again.',
        code: 'USER_NOT_FOUND',
        retryable: false,
        userFriendly: true
      };
    }

    if (message.includes('missing required information')) {
      return {
        message: 'User missing required information. Please provide complete information.',
        code: 'MISSING_USER_INFO',
        retryable: false,
        userFriendly: true
      };
    }

    if (message.includes('pickup time') && message.includes('future')) {
      return {
        message: 'Pickup time must be in the future. Please select a valid date and time.',
        code: 'INVALID_PICKUP_TIME',
        retryable: false,
        userFriendly: true
      };
    }

    if (message.includes('validation')) {
      return {
        message: 'Invalid request data. Please check all required fields.',
        code: 'VALIDATION_ERROR',
        retryable: false,
        userFriendly: true
      };
    }

    if (message.includes('duplicate')) {
      return {
        message: 'A similar collection request already exists.',
        code: 'DUPLICATE_REQUEST',
        retryable: false,
        userFriendly: true
      };
    }

    if (message.includes('connection') || message.includes('timeout')) {
      return {
        message: 'Connection failed. Please try again in a few moments.',
        code: 'CONNECTION_FAILED',
        retryable: true,
        userFriendly: true
      };
    }

    // Return the original message if it seems user-friendly
    if (error.message.length < 200 && !message.includes('stack') && !message.includes('error:')) {
      return {
        message: error.message,
        code: 'CUSTOM_ERROR',
        retryable: true,
        userFriendly: true
      };
    }
  }

  // Fallback for unknown errors
  return {
    message: 'An unexpected error occurred. Please try again.',
    code: 'UNKNOWN_ERROR',
    retryable: true,
    userFriendly: true
  };
}

/**
 * Format error message for display to users
 */
export function formatErrorMessage(error: any, context: string = 'operation'): string {
  const errorDetails = parseApiError(error, context);
  return errorDetails.message;
}

/**
 * Determine if an error is retryable
 */
export function isRetryableError(error: any): boolean {
  const errorDetails = parseApiError(error);
  return errorDetails.retryable;
}

/**
 * Log error with appropriate level and context
 */
export function logError(error: any, context: string, additionalInfo?: any) {
  const errorDetails = parseApiError(error, context);
  
  const logData = {
    context,
    code: errorDetails.code,
    message: errorDetails.message,
    originalError: error.message || error,
    retryable: errorDetails.retryable,
    timestamp: new Date().toISOString(),
    ...additionalInfo
  };

  // In production, you might want to send this to a logging service
  if (errorDetails.code === 'UNKNOWN_ERROR' || !errorDetails.userFriendly) {
    console.error('[ERROR_HANDLER]', logData);
  } else {
    console.warn('[ERROR_HANDLER]', logData);
  }
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(error: any, context: string = 'operation') {
  const errorDetails = parseApiError(error, context);
  
  return {
    success: false,
    error: errorDetails.message,
    code: errorDetails.code,
    retryable: errorDetails.retryable,
    timestamp: new Date().toISOString()
  };
}

/**
 * Retry mechanism with exponential backoff
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Don't retry if error is not retryable
      if (!isRetryableError(error)) {
        throw error;
      }
      
      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break;
      }
      
      // Calculate delay with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Error logger for monitoring and debugging
 * Consolidated from error-logger.ts to avoid redundancy
 */
export interface ErrorLogEntry {
  timestamp: Date;
  component: string;
  action: string;
  error: Error | string;
  userId?: string;
  metadata?: Record<string, any>;
}

export class ErrorLogger {
  private static instance: ErrorLogger;
  private logs: ErrorLogEntry[] = [];

  private constructor() { }

  public static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }

  public logError(entry: Omit<ErrorLogEntry, 'timestamp'>): void {
    const logEntry: ErrorLogEntry = {
      ...entry,
      timestamp: new Date(),
    };

    this.logs.push(logEntry);

    if (process.env.NODE_ENV === 'development') {
      console.error(`[${logEntry.component}] ${logEntry.action}:`, {
        error: logEntry.error,
        userId: logEntry.userId,
        metadata: logEntry.metadata,
        timestamp: logEntry.timestamp.toISOString(),
      });
    }

    // Keep only last 100 logs
    if (this.logs.length > 100) {
      this.logs = this.logs.slice(-100);
    }
  }

  public getRecentLogs(limit: number = 10): ErrorLogEntry[] {
    return this.logs.slice(-limit);
  }

  public clearLogs(): void {
    this.logs = [];
  }

  public logWorkflowError(error: Error | string, workflow: string, metadata?: Record<string, any>): void {
    this.logError({
      component: 'UserManagementClient',
      action: `workflow_${workflow}`,
      error,
      metadata,
    });
  }

  public logDonationRequestError(error: Error | string, userId?: string, metadata?: Record<string, any>): void {
    this.logError({
      component: 'CreateDonationRequestForm',
      action: 'create_donation_request',
      error,
      userId,
      metadata,
    });
  }
}

export const errorLogger = ErrorLogger.getInstance();

// Helper function to extract error details for logging
export function extractErrorDetails(error: unknown): Record<string, any> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  return {
    error: String(error),
  };
}
