/**
 * Error logging utility for monitoring and debugging
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

  private constructor() {}

  public static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }

  /**
   * Log an error with context information
   */
  public logError(entry: Omit<ErrorLogEntry, 'timestamp'>): void {
    const logEntry: ErrorLogEntry = {
      ...entry,
      timestamp: new Date(),
    };

    // Add to in-memory logs
    this.logs.push(logEntry);

    // Log error details in development
    if (process.env.NODE_ENV === 'development') {
      console.error(`[${logEntry.component}] ${logEntry.action}:`, {
        error: logEntry.error,
        userId: logEntry.userId,
        metadata: logEntry.metadata,
        timestamp: logEntry.timestamp.toISOString(),
      });
    }

    // In production, you might want to send to external logging service
    if (process.env.NODE_ENV === 'production') {
      this.sendToExternalLogger(logEntry);
    }

    // Keep only last 100 logs in memory
    if (this.logs.length > 100) {
      this.logs = this.logs.slice(-100);
    }
  }

  /**
   * Log user creation errors
   */
  public logUserCreationError(error: Error | string, metadata?: Record<string, any>): void {
    this.logError({
      component: 'UserCreationForm',
      action: 'create_user',
      error,
      metadata,
    });
  }

  /**
   * Log donation request creation errors
   */
  public logDonationRequestError(error: Error | string, userId?: string, metadata?: Record<string, any>): void {
    this.logError({
      component: 'CreateDonationRequestForm',
      action: 'create_donation_request',
      error,
      userId,
      metadata,
    });
  }

  /**
   * Log workflow transition errors
   */
  public logWorkflowError(error: Error | string, workflow: string, metadata?: Record<string, any>): void {
    this.logError({
      component: 'UserManagementClient',
      action: `workflow_${workflow}`,
      error,
      metadata,
    });
  }

  /**
   * Get recent error logs (for debugging)
   */
  public getRecentLogs(limit: number = 10): ErrorLogEntry[] {
    return this.logs.slice(-limit);
  }

  /**
   * Clear all logs
   */
  public clearLogs(): void {
    this.logs = [];
  }

  /**
   * Send error to external logging service (placeholder)
   */
  private sendToExternalLogger(entry: ErrorLogEntry): void {
    // Placeholder for external logging service integration
    // You could integrate with services like Sentry, LogRocket, etc.
    
    // Example: Send to API endpoint
    // fetch('/api/logs/error', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(entry),
    // }).catch(console.error);
  }
}

// Export singleton instance
export const errorLogger = ErrorLogger.getInstance();

// Helper function for consistent error message formatting
export function formatErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred';
}

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