export interface ServiceConfig {
  name: string
  required: boolean
  envVars: string[]
  isConfigured: boolean
  status: 'ok' | 'warning' | 'error'
  missingVars?: string[]
  errorMessage?: string
}

export interface ValidationResult {
  allServicesConfigured: boolean
  criticalServicesConfigured: boolean
  services: ServiceConfig[]
  summary: {
    total: number
    configured: number
    warnings: number
    errors: number
  }
}

export class ConfigValidator {
  private static readonly SERVICE_CONFIGS = [
    {
      name: 'Web Push',
      required: true,
      envVars: ['NEXT_PUBLIC_VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY']
    },
    {
      name: 'Email (Resend)',
      required: true,
      envVars: ['RESEND_API_KEY', 'NOTIFICATION_EMAIL']
    },
    {
      name: 'WhatsApp',
      required: false,
      envVars: ['WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID']
    },
    {
      name: 'SMS',
      required: false,
      envVars: ['SMS_API_KEY', 'SMS_API_URL', 'SMS_ENABLED']
    }
  ]

  /**
   * Validates all notification service configurations
   */
  static validateNotificationServices(): ValidationResult {
    const services: ServiceConfig[] = []
    let configuredCount = 0
    let warningCount = 0
    let errorCount = 0

    for (const config of this.SERVICE_CONFIGS) {
      const serviceConfig = this.validateService(config)
      services.push(serviceConfig)

      if (serviceConfig.isConfigured) {
        configuredCount++
      } else if (serviceConfig.required) {
        errorCount++
      } else {
        warningCount++
      }
    }

    const criticalServicesConfigured = services
      .filter(s => s.required)
      .every(s => s.isConfigured)

    return {
      allServicesConfigured: services.every(s => s.isConfigured),
      criticalServicesConfigured,
      services,
      summary: {
        total: services.length,
        configured: configuredCount,
        warnings: warningCount,
        errors: errorCount
      }
    }
  }

  /**
   * Validates a single service configuration
   */
  private static validateService(config: {
    name: string
    required: boolean
    envVars: string[]
  }): ServiceConfig {
    const missingVars: string[] = []
    
    for (const envVar of config.envVars) {
      if (!process.env[envVar]) {
        missingVars.push(envVar)
      }
    }

    const isConfigured = missingVars.length === 0
    let status: 'ok' | 'warning' | 'error'
    let errorMessage: string | undefined

    if (isConfigured) {
      status = 'ok'
    } else if (config.required) {
      status = 'error'
      errorMessage = `Missing required environment variables: ${missingVars.join(', ')}`
    } else {
      status = 'warning'
      errorMessage = `Missing optional environment variables: ${missingVars.join(', ')}`
    }

    return {
      name: config.name,
      required: config.required,
      envVars: config.envVars,
      isConfigured,
      status,
      missingVars: missingVars.length > 0 ? missingVars : undefined,
      errorMessage
    }
  }

  /**
   * Logs the configuration status with detailed information
   */
  static logConfigurationStatus(verbose: boolean = true): void {
    const validation = this.validateNotificationServices()
    
    if (!verbose) {
      // Minimal logging for production
      if (validation.criticalServicesConfigured) {
        console.log(`✅ Notification services: ${validation.summary.configured}/${validation.summary.total} configured`)
      } else {
        console.log(`❌ Notification services: ${validation.summary.errors} critical error(s)`)
      }
      return
    }

    // Detailed logging for development
    console.log('\n🔧 Notification Services Configuration Status')
    console.log('=' .repeat(50))
    
    // Summary
    console.log(`📊 Summary: ${validation.summary.configured}/${validation.summary.total} services configured`)
    if (validation.summary.errors > 0) {
      console.log(`❌ Critical errors: ${validation.summary.errors}`)
    }
    if (validation.summary.warnings > 0) {
      console.log(`⚠️  Warnings: ${validation.summary.warnings}`)
    }
    
    console.log('')

    // Individual service status
    for (const service of validation.services) {
      const icon = service.status === 'ok' ? '✅' : service.status === 'warning' ? '⚠️' : '❌'
      const requiredText = service.required ? '(Required)' : '(Optional)'
      
      console.log(`${icon} ${service.name} ${requiredText}`)
      
      if (service.errorMessage) {
        console.log(`   ${service.errorMessage}`)
      }
      
      if (service.missingVars && service.missingVars.length > 0) {
        console.log(`   Missing: ${service.missingVars.join(', ')}`)
      }
      
      console.log('')
    }

    // Overall status
    if (validation.criticalServicesConfigured) {
      console.log('✅ All critical notification services are properly configured')
    } else {
      console.log('❌ Some critical notification services are missing configuration')
      console.log('   The application may not function properly without these services')
    }
    
    console.log('=' .repeat(50))
  }

  /**
   * Checks if a specific service is properly configured
   */
  static isServiceConfigured(serviceName: string): boolean {
    const validation = this.validateNotificationServices()
    const service = validation.services.find(s => 
      s.name.toLowerCase() === serviceName.toLowerCase()
    )
    return service?.isConfigured ?? false
  }

  /**
   * Gets the configuration status for a specific service
   */
  static getServiceStatus(serviceName: string): ServiceConfig | null {
    const validation = this.validateNotificationServices()
    return validation.services.find(s => 
      s.name.toLowerCase() === serviceName.toLowerCase()
    ) ?? null
  }

  /**
   * Validates configuration at startup and throws if critical services are missing
   */
  static validateAtStartup(verbose: boolean = false): void {
    const validation = this.validateNotificationServices()
    
    // Log configuration status (verbose in development, minimal in production)
    this.logConfigurationStatus(verbose)
    
    // Throw error if critical services are not configured
    if (!validation.criticalServicesConfigured) {
      const criticalErrors = validation.services
        .filter(s => s.required && !s.isConfigured)
        .map(s => s.errorMessage)
        .join('\n')
      
      throw new Error(
        `Critical notification services are not properly configured:\n${criticalErrors}\n\n` +
        'Please configure the required environment variables before starting the application.'
      )
    }
  }

  /**
   * Gets a summary of service availability for runtime checks
   */
  static getServiceAvailability(): {
    webPush: boolean
    email: boolean
    whatsapp: boolean
    sms: boolean
  } {
    return {
      webPush: this.isServiceConfigured('Web Push'),
      email: this.isServiceConfigured('Email (Resend)'),
      whatsapp: this.isServiceConfigured('WhatsApp'),
      sms: this.isServiceConfigured('SMS')
    }
  }
}