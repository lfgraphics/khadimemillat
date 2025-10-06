import { ConfigValidator } from './services/config-validator.service'
import { schedulerService } from './services/scheduler.service'

let validationPerformed = false

/**
 * Performs startup validation for notification services
 * This should be called early in the application lifecycle
 * @deprecated Use initializeServer from lib/server-startup.ts instead
 */
export function performStartupValidation(): void {
  if (validationPerformed) {
    return // Only run validation once
  }

  try {
    // Use minimal logging to reduce console noise
    const verbose = process.env.NODE_ENV === 'development' || process.env.LOG_CONFIG === 'true'
    ConfigValidator.logConfigurationStatus(verbose)
    
    // Start analytics scheduler (non-blocking)
    try {
      schedulerService.startScheduler()
    } catch (schedulerError) {
      if (verbose) {
        console.warn('⚠️ Failed to start analytics scheduler:', schedulerError)
      }
      // Don't fail startup if scheduler fails
    }
    
    // Mark validation as performed
    validationPerformed = true
    
    if (verbose) {
      console.log('✅ Startup validation completed successfully')
    }
  } catch (error) {
    console.error('❌ Startup validation failed:', error)
    // Don't throw error to prevent app from crashing
    // Just log the issue and continue
  }
}

/**
 * Validates critical services and throws if they're not configured
 * Use this for critical paths that require notification services
 */
export function validateCriticalServices(): void {
  try {
    ConfigValidator.validateAtStartup()
  } catch (error) {
    console.error('Critical service validation failed:', error)
    throw error
  }
}

/**
 * Gets service availability status for runtime checks
 */
export function getServiceAvailability() {
  return ConfigValidator.getServiceAvailability()
}