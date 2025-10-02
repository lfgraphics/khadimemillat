/**
 * Retry utility for handling transient failures
 */

export interface RetryOptions {
  maxAttempts: number;
  delayMs: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: any) => boolean;
}

export class RetryError extends Error {
  public readonly attempts: number;
  public readonly lastError: Error;

  constructor(attempts: number, lastError: Error) {
    super(`Operation failed after ${attempts} attempts: ${lastError.message}`);
    this.name = 'RetryError';
    this.attempts = attempts;
    this.lastError = lastError;
  }
}

/**
 * Retry an async operation with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const {
    maxAttempts,
    delayMs,
    backoffMultiplier = 2,
    shouldRetry = () => true
  } = options;

  let lastError: Error;
  let currentDelay = delayMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry if we've reached max attempts or if shouldRetry returns false
      if (attempt === maxAttempts || !shouldRetry(lastError)) {
        throw new RetryError(attempt, lastError);
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, currentDelay));
      currentDelay *= backoffMultiplier;
    }
  }

  // This should never be reached, but TypeScript requires it
  throw new RetryError(maxAttempts, lastError!);
}

/**
 * Default retry options for network operations
 */
export const DEFAULT_NETWORK_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  delayMs: 1000,
  backoffMultiplier: 2,
  shouldRetry: (error: any) => {
    // Retry on network errors, timeouts, and 5xx status codes
    if (error.name === 'NetworkError' || error.name === 'TimeoutError') {
      return true;
    }
    if (error.status >= 500 && error.status < 600) {
      return true;
    }
    if (error.message?.includes('network') || error.message?.includes('timeout')) {
      return true;
    }
    return false;
  }
};

/**
 * Default retry options for API operations
 */
export const DEFAULT_API_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 2,
  delayMs: 500,
  backoffMultiplier: 2,
  shouldRetry: (error: any) => {
    // Don't retry on client errors (4xx), only on server errors (5xx)
    if (error.status >= 400 && error.status < 500) {
      return false;
    }
    return DEFAULT_NETWORK_RETRY_OPTIONS.shouldRetry!(error);
  }
};

/**
 * Retry wrapper specifically for fetch operations
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retryOptions: RetryOptions = DEFAULT_API_RETRY_OPTIONS
): Promise<Response> {
  return withRetry(async () => {
    const response = await fetch(url, options);
    
    // Throw error for non-ok responses to trigger retry logic
    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
      (error as any).status = response.status;
      throw error;
    }
    
    return response;
  }, retryOptions);
}