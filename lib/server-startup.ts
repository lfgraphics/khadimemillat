/**
 * Server startup initialization
 * This runs once when the server starts, not on every request
 */

import { ConfigValidator } from './services/config-validator.service'
import { schedulerService } from './services/scheduler.service'

let serverInitialized = false

/**
 * Initialize server-side services and validation
 * This should only run once when the server starts
 */
export function initializeServer(): void {
  if (serverInitialized) {
    return
  }

  try {
    // Only log detailed configuration in development or if explicitly requested
    const shouldLogVerbose = process.env.NODE_ENV === 'development' || 
                             process.env.LOG_CONFIG === 'true'

    if (shouldLogVerbose) {
      console.log('🚀 Initializing Khadim-e-Millat Welfare Foundation server...')
    }

    // Always validate, but control verbosity
    ConfigValidator.logConfigurationStatus(shouldLogVerbose)

    // Additional check for production
    if (!shouldLogVerbose) {
      const validation = ConfigValidator.validateNotificationServices()
      if (!validation.criticalServicesConfigured) {
        console.error('❌ Critical notification services not configured')
        console.error('   Set LOG_CONFIG=true environment variable to see detailed status')
      }
    }
    
    // Initialize scheduler service (no automatic jobs)
    try {
      schedulerService.startScheduler()
      if (shouldLogVerbose) {
        console.log('✅ Scheduler service initialized (no automatic jobs)')
      }
    } catch (schedulerError) {
      if (shouldLogVerbose) {
        console.warn('⚠️ Failed to initialize scheduler service:', schedulerError)
      }
    }
    
    serverInitialized = true
    
  } catch (error) {
    console.error('❌ Server initialization failed:', error)
    // Don't throw to prevent server crash, but log the error
  }
}

/**
 * Get initialization status
 */
export function isServerInitialized(): boolean {
  return serverInitialized
}

/**
 * Force re-initialization (useful for testing)
 */
export function resetServerInitialization(): void {
  serverInitialized = false
}