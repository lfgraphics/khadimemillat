interface SMSMessage {
  to: string // Phone number in international format
  message: string
}

class SMSService {
  private apiUrl: string
  private apiKey: string
  private senderId: string
  private isEnabled: boolean

  constructor() {
    this.apiUrl = process.env.SMS_API_URL || ''
    this.apiKey = process.env.SMS_API_KEY || ''
    this.senderId = process.env.SMS_SENDER_ID || 'KMWF'
    this.isEnabled = process.env.SMS_ENABLED === 'true'
  }

  private isConfigured(): boolean {
    return !!(this.apiKey && this.apiUrl && this.isEnabled)
  }

  async sendSMS(options: SMSMessage): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          error: 'SMS service is disabled or not configured'
        }
      }

      // Clean phone number (remove any non-digits except +)
      const cleanPhone = options.to.replace(/[^\d+]/g, '')
      
      // Example implementation for a generic SMS API
      // You can replace this with your preferred SMS provider (Twilio, AWS SNS, etc.)
      const messageData = {
        to: cleanPhone,
        message: options.message,
        sender_id: this.senderId
      }

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(messageData)
      })

      const result = await response.json()

      if (!response.ok) {
        // Enhanced error logging for SMS API
        console.error('📱 SMS API error:', {
          status: response.status,
          statusText: response.statusText,
          error: result.error,
          to: cleanPhone,
          messageLength: options.message.length
        })
        throw new Error(result.error?.message || `SMS API error: ${response.status}`)
      }

      return {
        success: true,
        messageId: result.message_id || result.id
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      // Enhanced error logging
      console.error('📱 SMS sending failed:', {
        error: errorMessage,
        to: options.to,
        messageLength: options.message.length,
        stack: error instanceof Error ? error.stack : undefined
      })
      
      return {
        success: false,
        error: errorMessage
      }
    }
  }

  async sendBulkSMS(messages: SMSMessage[]): Promise<{
    sent: number
    failed: number
    results: { phone: string; success: boolean; error?: string }[]
  }> {
    const results = []
    let sent = 0
    let failed = 0

    for (const message of messages) {
      const result = await this.sendSMS(message)
      
      results.push({
        phone: message.to,
        success: result.success,
        error: result.error
      })

      if (result.success) {
        sent++
      } else {
        failed++
      }

      // Add delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    return { sent, failed, results }
  }

  // Message templates
  generateCampaignNotification(campaignTitle: string, programTitle: string): string {
    return `🎯 New Campaign: "${campaignTitle}" launched under ${programTitle}. Support the cause and make a difference! - KMWF`
  }

  generateCustomNotification(title: string, message: string): string {
    return `📢 ${title}: ${message} - KMWF`
  }

  // Utility to format phone number for SMS
  formatPhoneNumber(phone: string): string {
    // Remove all non-digits
    let cleaned = phone.replace(/\D/g, '')
    
    // If it starts with 91 (India code), add +
    if (cleaned.startsWith('91') && cleaned.length === 12) {
      return `+${cleaned}`
    }
    
    // If it's 10 digits, assume Indian number
    if (cleaned.length === 10) {
      return `+91${cleaned}`
    }
    
    // If it already has country code but no +
    if (cleaned.length > 10 && !phone.startsWith('+')) {
      return `+${cleaned}`
    }
    
    return phone
  }
}

export const smsService = new SMSService()
export default SMSService