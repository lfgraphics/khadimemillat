/**
 * WhatsApp Service with support for both AiSensy and Meta WhatsApp Business API
 * 
 * For AiSensy setup:
 * 1. Create an API campaign in your AiSensy dashboard named 'api_text_campaign'
 * 2. Get your API key from Manage > API Key in AiSensy dashboard
 * 3. Set WHATSAPP_ACCESS_TOKEN to your AiSensy API key
 * 4. The service auto-detects AiSensy when token starts with 'eyJ' (JWT format)
 * 
 * For Meta API:
 * - Set WHATSAPP_ACCESS_TOKEN to your Meta access token (non-JWT format)
 * - Service will use Meta WhatsApp Business API
 */

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
  private provider: 'meta' | 'aisensy'

  constructor() {
    // Detect provider based on token format
    const token = process.env.WHATSAPP_ACCESS_TOKEN || ''
    this.provider = token.startsWith('eyJ') ? 'aisensy' : 'meta' // JWT tokens start with 'eyJ'
    
    // Set API URL based on provider
    if (this.provider === 'aisensy') {
      this.apiUrl = process.env.WHATSAPP_API_URL || 'https://backend.aisensy.com/campaign/t1/api/v2'
    } else {
      this.apiUrl = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v18.0'
    }
    
    this.accessToken = token
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || ''

    // Debug logging
    console.log('🔧 WhatsApp Service initialized:', {
      provider: this.provider,
      apiUrl: this.apiUrl,
      hasToken: !!this.accessToken,
      tokenPrefix: this.accessToken ? this.accessToken.substring(0, 10) + '...' : 'No token',
      hasPhoneNumberId: !!this.phoneNumberId
    })
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
      
      if (this.provider === 'aisensy') {
        return await this.sendAiSensyMessage(cleanPhone, options.message)
      } else {
        return await this.sendMetaMessage(cleanPhone, options.message)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      // Enhanced error logging
      console.error('📱 WhatsApp sending failed:', {
        error: errorMessage,
        to: options.to,
        messageLength: options.message.length,
        provider: this.provider,
        stack: error instanceof Error ? error.stack : undefined
      })
      
      return {
        success: false,
        error: errorMessage
      }
    }
  }

  private async sendAiSensyMessage(cleanPhone: string, message: string) {
    // AiSensy API - Official implementation based on documentation
    // API Endpoint: https://backend.aisensy.com/campaign/t1/api/v2
    const apiUrl = 'https://backend.aisensy.com/campaign/t1/api/v2'
    
    // Note: AiSensy requires a pre-created campaign. For text messages, 
    // we need to use a template-based approach or create a simple text campaign
    const requestBody = {
      "apiKey": this.accessToken,
      "campaignName": "api_text_campaign", // This should be created in AiSensy dashboard
      "destination": cleanPhone,
      "userName": "User", // Required field
      "source": "API",
      "templateParams": [message] // If using template, otherwise might need different approach
    }

    console.log('🔄 AiSensy API call (Official Format):', {
      destination: cleanPhone,
      messageLength: message.length,
      hasApiKey: !!this.accessToken,
      campaignName: requestBody.campaignName
    })
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    })

    // Log response details for debugging
    console.log('📡 AiSensy API Response:', {
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get('content-type'),
      url: apiUrl
    })

    // Get response text first to handle both JSON and HTML responses
    const responseText = await response.text()
    
    // Check if response is JSON or HTML
    const contentType = response.headers.get('content-type') || ''
    
    if (!contentType.includes('application/json')) {
      console.error('❌ AiSensy returned non-JSON response:', {
        status: response.status,
        contentType,
        url: apiUrl,
        responseStart: responseText.substring(0, 300)
      })
      
      // Provide specific error messages based on common issues
      if (responseText.includes('<!DOCTYPE') || responseText.includes('<html>')) {
        if (response.status === 404) {
          throw new Error(`AiSensy API endpoint not found. Please verify the URL: ${apiUrl}`)
        } else if (response.status === 401 || response.status === 403) {
          throw new Error(`AiSensy API authentication failed. Please check your API key in the dashboard: Manage > API Key`)
        } else if (response.status === 400) {
          throw new Error(`AiSensy API request invalid. Please ensure you have created an API campaign named 'api_text_campaign' in your AiSensy dashboard.`)
        } else {
          throw new Error(`AiSensy API error (Status ${response.status}): The API returned an HTML error page instead of JSON. This usually indicates authentication or configuration issues.`)
        }
      }
      
      throw new Error(`AiSensy API returned unexpected content type: ${contentType}. Response: ${responseText.substring(0, 200)}`)
    }

    let result
    try {
      result = JSON.parse(responseText)
    } catch (parseError) {
      console.error('❌ Failed to parse AiSensy JSON response:', responseText.substring(0, 500))
      throw new Error(`Invalid JSON response from AiSensy API: ${responseText.substring(0, 200)}`)
    }

    if (!response.ok) {
      console.error('📱 AiSensy API error:', {
        status: response.status,
        statusText: response.statusText,
        error: result,
        to: cleanPhone,
        messageLength: message.length,
        apiUrl: apiUrl,
        campaignName: requestBody.campaignName
      })
      
      // Provide specific error guidance based on AiSensy documentation
      let errorMessage = result.message || result.error || `AiSensy API error: ${response.status} - ${response.statusText}`
      
      if (response.status === 400) {
        errorMessage += ". Please check: 1) API campaign 'api_text_campaign' exists and is Live, 2) Template is approved, 3) All required fields are provided."
      } else if (response.status === 401) {
        errorMessage += ". Please verify your API key in AiSensy dashboard: Manage > API Key"
      }
      
      throw new Error(errorMessage)
    }

    console.log('✅ AiSensy API success:', {
      result: result,
      status: response.status,
      campaignName: requestBody.campaignName
    })

    return {
      success: true,
      messageId: result.messageId || result.id || result.campaignId || 'sent'
    }
  }

  private async sendMetaMessage(cleanPhone: string, message: string) {
    const messageData = {
      messaging_product: 'whatsapp',
      to: cleanPhone,
      type: 'text',
      text: {
        body: message
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
      console.error('📱 Meta API error:', {
        status: response.status,
        statusText: response.statusText,
        error: result.error,
        to: cleanPhone,
        messageLength: message.length
      })
      throw new Error(result.error?.message || `Meta API error: ${response.status}`)
    }

    return {
      success: true,
      messageId: result.messages?.[0]?.id
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

      // Add delay between messages to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    return { sent, failed, results }
  }

  formatPhoneNumber(phone: string): string {
    // Remove all non-digits
    const cleaned = phone.replace(/\D/g, '')
    
    // If it starts with 91 (India) and has 12 digits, add +
    if (cleaned.startsWith('91') && cleaned.length === 12) {
      return `+${cleaned}`
    }
    
    // If it starts with 0 and has 11 digits (local Indian number), replace 0 with +91
    if (cleaned.startsWith('0') && cleaned.length === 11) {
      return `+91${cleaned.substring(1)}`
    }
    
    // If it has 10 digits (Indian mobile without country code), add +91
    if (cleaned.length === 10) {
      return `+91${cleaned}`
    }
    
    // If it doesn't start with +, add it
    if (!phone.startsWith('+')) {
      return `+${cleaned}`
    }
    
    return phone
  }

  generateCustomNotification(title: string, message: string): string {
    return `*${title}*\n\n${message}\n\n_From: Khadim-e-Millat Welfare Foundation_`
  }
}

export const whatsappService = new WhatsAppService()
export default WhatsAppService