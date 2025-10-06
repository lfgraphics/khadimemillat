interface WhatsAppMessage {
  to: string // Phone number in international format
  message: string
  type?: 'text' | 'template'
  templateName?: string
  templateParams?: string[]
}

class WhatsAppService {
  private apiUrl: string
  private accessToken: string
  private phoneNumberId: string

  constructor() {
    this.apiUrl = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v18.0'
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN || ''
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || ''
  }

  private isConfigured(): boolean {
    return !!(this.accessToken && this.phoneNumberId)
  }

  async sendMessage(options: WhatsAppMessage): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!this.isConfigured()) {
        throw new Error('WhatsApp API not configured. Please set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID')
      }

      // Clean phone number (remove any non-digits except +)
      const cleanPhone = options.to.replace(/[^\d+]/g, '')
      
      const messageData = {
        messaging_product: 'whatsapp',
        to: cleanPhone,
        type: 'text',
        text: {
          body: options.message
        }
      }

      const response = await fetch(`${this.apiUrl}/${this.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(messageData)
      })

      const result = await response.json()

      if (!response.ok) {
        // Enhanced error logging for WhatsApp API
        console.error('📱 WhatsApp API error:', {
          status: response.status,
          statusText: response.statusText,
          error: result.error,
          to: cleanPhone,
          messageLength: options.message.length
        })
        throw new Error(result.error?.message || `WhatsApp API error: ${response.status}`)
      }

      return {
        success: true,
        messageId: result.messages?.[0]?.id
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      // Enhanced error logging
      console.error('📱 WhatsApp sending failed:', {
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

  async sendBulkMessages(messages: WhatsAppMessage[]): Promise<{
    sent: number
    failed: number
    results: { phone: string; success: boolean; error?: string }[]
  }> {
    const results = []
    let sent = 0
    let failed = 0

    for (const message of messages) {
      const result = await this.sendMessage(message)
      
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
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    return { sent, failed, results }
  }

  // Message templates
  generateCampaignNotification(campaignTitle: string, programTitle: string, campaignUrl: string): string {
    return `🎯 *New Campaign Launched!*

📋 *Program:* ${programTitle}
🎪 *Campaign:* ${campaignTitle}

Your support can make a real difference! Every contribution helps us create positive impact in our community.

👆 View Campaign: ${campaignUrl}

Thank you for being part of our mission! 🙏

- Khadim-Millat Welfare Foundation`
  }

  generateCustomNotification(title: string, message: string): string {
    return `📢 *${title}*

${message}

- Khadim-Millat Welfare Foundation`
  }

  // Utility to format phone number
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

export const whatsappService = new WhatsAppService()
export default WhatsAppService