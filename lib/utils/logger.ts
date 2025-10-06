/**
 * Centralized logging utility
 * Controls log output based on environment variables
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  [key: string]: any
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'
  private isVerbose = process.env.LOG_CONFIG === 'true' || process.env.VERBOSE_LOGS === 'true'
  private logLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info'

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    }

    return levels[level] >= levels[this.logLevel]
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString()
    const prefix = this.getPrefix(level)
    
    if (context && Object.keys(context).length > 0) {
      return `${prefix} ${message} ${JSON.stringify(context)}`
    }
    
    return `${prefix} ${message}`
  }

  private getPrefix(level: LogLevel): string {
    const prefixes = {
      debug: '🔍',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌'
    }
    return prefixes[level]
  }

  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment && this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, context))
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message, context))
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, context))
    }
  }

  error(message: string, context?: LogContext): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message, context))
    }
  }

  // Service-specific loggers with controlled verbosity
  service = {
    debug: (service: string, message: string, context?: LogContext) => {
      if (this.isVerbose) {
        this.debug(`[${service.toUpperCase()}] ${message}`, context)
      }
    },
    
    info: (service: string, message: string, context?: LogContext) => {
      if (this.isVerbose || this.isDevelopment) {
        this.info(`[${service.toUpperCase()}] ${message}`, context)
      }
    },
    
    warn: (service: string, message: string, context?: LogContext) => {
      this.warn(`[${service.toUpperCase()}] ${message}`, context)
    },
    
    error: (service: string, message: string, context?: LogContext) => {
      this.error(`[${service.toUpperCase()}] ${message}`, context)
    }
  }

  // Notification-specific logger with reduced verbosity
  notification = {
    debug: (message: string, context?: LogContext) => {
      if (this.isVerbose) {
        this.debug(`[NOTIFICATION] ${message}`, context)
      }
    },
    
    info: (message: string, context?: LogContext) => {
      if (this.isVerbose) {
        this.info(`[NOTIFICATION] ${message}`, context)
      }
    },
    
    warn: (message: string, context?: LogContext) => {
      // Only log warnings if verbose or in development
      if (this.isVerbose || this.isDevelopment) {
        this.warn(`[NOTIFICATION] ${message}`, context)
      }
    },
    
    error: (message: string, context?: LogContext) => {
      this.error(`[NOTIFICATION] ${message}`, context)
    }
  }
}

// Export singleton instance
export const logger = new Logger()

// Export convenience functions for backward compatibility
export const log = {
  debug: logger.debug.bind(logger),
  info: logger.info.bind(logger),
  warn: logger.warn.bind(logger),
  error: logger.error.bind(logger),
  service: logger.service,
  notification: logger.notification
}