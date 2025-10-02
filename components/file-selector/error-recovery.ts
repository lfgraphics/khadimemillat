// Error recovery and retry management for File Selector

import { FileUploadError } from './types'
import { classifyError, ERROR_MESSAGES } from './error-handling'

export interface RetryConfig {
  maxRetries: number
  baseDelay: number // Base delay in milliseconds
  maxDelay: number // Maximum delay in milliseconds
  backoffMultiplier: number // Exponential backoff multiplier
  retryableErrors: string[] // Error types that can be retried
}

export interface RetryState {
  attempts: number
  lastError: FileUploadError | null
  isRetrying: boolean
  nextRetryDelay: number
}

export interface RecoveryAction {
  type: 'retry' | 'fallback' | 'manual'
  label: string
  action: () => void | Promise<void>
  priority: number // Higher priority actions shown first
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
  retryableErrors: ['network', 'upload', 'camera']
}

export class ErrorRecoveryManager {
  private retryConfig: RetryConfig
  private retryState: RetryState
  private retryTimeouts: Map<string, NodeJS.Timeout> = new Map()

  constructor(config: Partial<RetryConfig> = {}) {
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config }
    this.retryState = {
      attempts: 0,
      lastError: null,
      isRetrying: false,
      nextRetryDelay: this.retryConfig.baseDelay
    }
  }

  // Check if an error can be retried
  canRetry(error: FileUploadError): boolean {
    const errorKey = classifyError(error)
    const errorConfig = ERROR_MESSAGES[errorKey]
    
    // Check if error type is retryable
    if (!this.retryConfig.retryableErrors.includes(error.type)) {
      return false
    }
    
    // Check if we haven't exceeded max retries
    if (this.retryState.attempts >= this.retryConfig.maxRetries) {
      return false
    }
    
    // Check error-specific retry configuration
    return errorConfig.recovery.canRetry
  }

  // Calculate delay for next retry using exponential backoff
  private calculateRetryDelay(attempt: number): number {
    const delay = this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt)
    return Math.min(delay, this.retryConfig.maxDelay)
  }

  // Execute retry with exponential backoff
  async executeRetry<T>(
    operation: () => Promise<T>,
    error: FileUploadError,
    onProgress?: (attempt: number, delay: number) => void
  ): Promise<T> {
    if (!this.canRetry(error)) {
      throw error
    }

    this.retryState.attempts++
    this.retryState.lastError = error
    this.retryState.isRetrying = true
    
    const delay = this.calculateRetryDelay(this.retryState.attempts - 1)
    this.retryState.nextRetryDelay = delay

    // Notify about retry progress
    onProgress?.(this.retryState.attempts, delay)

    // Wait for the calculated delay
    await new Promise(resolve => setTimeout(resolve, delay))

    try {
      const result = await operation()
      this.reset() // Reset state on success
      return result
    } catch (retryError) {
      this.retryState.isRetrying = false
      
      // If we can retry again, recursively call executeRetry
      if (this.canRetry(retryError as FileUploadError)) {
        return this.executeRetry(operation, retryError as FileUploadError, onProgress)
      }
      
      // No more retries available
      throw retryError
    }
  }

  // Schedule a retry with a timeout
  scheduleRetry(
    operation: () => void | Promise<void>,
    error: FileUploadError,
    timeoutId: string = 'default'
  ): boolean {
    if (!this.canRetry(error)) {
      return false
    }

    // Clear existing timeout if any
    const existingTimeout = this.retryTimeouts.get(timeoutId)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }

    const delay = this.calculateRetryDelay(this.retryState.attempts)
    
    const timeout = setTimeout(async () => {
      this.retryTimeouts.delete(timeoutId)
      this.retryState.attempts++
      this.retryState.isRetrying = true
      
      try {
        await operation()
        this.reset()
      } catch (retryError) {
        this.retryState.isRetrying = false
        this.retryState.lastError = retryError as FileUploadError
      }
    }, delay)

    this.retryTimeouts.set(timeoutId, timeout)
    return true
  }

  // Cancel scheduled retry
  cancelRetry(timeoutId: string = 'default'): void {
    const timeout = this.retryTimeouts.get(timeoutId)
    if (timeout) {
      clearTimeout(timeout)
      this.retryTimeouts.delete(timeoutId)
    }
    this.retryState.isRetrying = false
  }

  // Get available recovery actions for an error
  getRecoveryActions(
    error: FileUploadError,
    context: {
      onRetry?: () => void | Promise<void>
      onFallback?: () => void | Promise<void>
      onManualFix?: () => void | Promise<void>
    }
  ): RecoveryAction[] {
    const actions: RecoveryAction[] = []
    const errorKey = classifyError(error)
    const errorConfig = ERROR_MESSAGES[errorKey]

    // Add retry action if available
    if (this.canRetry(error) && context.onRetry) {
      const remainingRetries = this.retryConfig.maxRetries - this.retryState.attempts
      actions.push({
        type: 'retry',
        label: `Retry (${remainingRetries} left)`,
        action: context.onRetry,
        priority: 3
      })
    }

    // Add fallback action if available
    if ('fallbackLabel' in errorConfig.recovery && errorConfig.recovery.fallbackLabel && context.onFallback) {
      actions.push({
        type: 'fallback',
        label: errorConfig.recovery.fallbackLabel,
        action: context.onFallback,
        priority: 2
      })
    }

    // Add manual fix actions based on error type
    if (context.onManualFix) {
      switch (error.type) {
        case 'validation':
          actions.push({
            type: 'manual',
            label: 'Choose Different File',
            action: context.onManualFix,
            priority: 1
          })
          break
        case 'camera':
          actions.push({
            type: 'manual',
            label: 'Check Camera Settings',
            action: context.onManualFix,
            priority: 1
          })
          break
        case 'network':
          actions.push({
            type: 'manual',
            label: 'Check Connection',
            action: context.onManualFix,
            priority: 1
          })
          break
      }
    }

    // Sort by priority (higher first)
    return actions.sort((a, b) => b.priority - a.priority)
  }

  // Get current retry state
  getRetryState(): RetryState {
    return { ...this.retryState }
  }

  // Reset retry state
  reset(): void {
    // Clear all timeouts
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout))
    this.retryTimeouts.clear()
    
    // Reset state
    this.retryState = {
      attempts: 0,
      lastError: null,
      isRetrying: false,
      nextRetryDelay: this.retryConfig.baseDelay
    }
  }

  // Update retry configuration
  updateConfig(config: Partial<RetryConfig>): void {
    this.retryConfig = { ...this.retryConfig, ...config }
  }

  // Check if currently retrying
  isRetrying(): boolean {
    return this.retryState.isRetrying
  }

  // Get remaining retry attempts
  getRemainingRetries(): number {
    return Math.max(0, this.retryConfig.maxRetries - this.retryState.attempts)
  }

  // Cleanup resources
  destroy(): void {
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout))
    this.retryTimeouts.clear()
  }
}

// Create a default error recovery manager instance
export const defaultErrorRecovery = new ErrorRecoveryManager()

// Utility function to create error recovery manager with custom config
export function createErrorRecovery(config?: Partial<RetryConfig>): ErrorRecoveryManager {
  return new ErrorRecoveryManager(config)
}

// Helper function to determine if an error should trigger automatic retry
export function shouldAutoRetry(error: FileUploadError): boolean {
  const autoRetryTypes = ['network', 'upload']
  return autoRetryTypes.includes(error.type) && !error.message.includes('400')
}

