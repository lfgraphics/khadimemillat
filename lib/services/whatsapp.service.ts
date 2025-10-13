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
  type?: 'text' | 'template' | 'image' | 'document'
  templateName?: string
  templateParams?: string[]
  imageUrl?: string
  imageCaption?: string
  documentUrl?: string
  documentFilename?: string
  documentCaption?: string
  userName?: string // Name of the recipient (for AiSensy userName field)
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
        return await this.sendAiSensyMessage(cleanPhone, options)
      } else {
        return await this.sendMetaMessage(cleanPhone, options)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      // Enhanced error logging
      console.error('📱 WhatsApp sending failed:', {
        error: errorMessage,
        to: options.to,
        messageType: options.type || 'text',
        messageLength: options.message?.length || 0,
        provider: this.provider,
        hasImage: !!options.imageUrl,
        hasDocument: !!options.documentUrl,
        stack: error instanceof Error ? error.stack : undefined
      })

      return {
        success: false,
        error: errorMessage
      }
    }
  }

  private async sendAiSensyMessage(cleanPhone: string, options: WhatsAppMessage) {
    // AiSensy API - Official implementation based on documentation
    // API Endpoint: https://backend.aisensy.com/campaign/t1/api/v2
    const apiUrl = 'https://backend.aisensy.com/campaign/t1/api/v2'

    // Use your approved "Donation Confirmation" campaign for all message types
    const campaignName = "Donation Confirmation" // Your approved campaign that supports images
    
    // Extract template parameters from the message if it contains donation data
    let templateParams: string[] = []
    
    // Check if message contains template parameters (separated by |)
    if (options.message.includes('|')) {
      // Message contains template parameters separated by |
      templateParams = options.message.split('|')
    } else {
      // Single message parameter
      templateParams = [options.message]
    }

    let requestBody: any = {
      "apiKey": this.accessToken,
      "campaignName": campaignName,
      "destination": cleanPhone,
      "userName": options.userName || "User" // Name of the message recipient
    }

    // Add templateParams only if template has parameters
    if (templateParams.length > 1 || !templateParams[0].includes('Thank you for your donation!')) {
      requestBody.templateParams = templateParams
    }

    // Add optional source field
    if (options.type !== 'text') {
      requestBody.source = "API"
    }

    // Add media support to the same campaign if image/document is provided
    if (options.type === 'image' && options.imageUrl) {
      // Add image using AiSensy media object format
      requestBody.media = {
        url: options.imageUrl,
        filename: "donation-receipt.png" // PNG format for better mobile compatibility
      }
      if (options.imageCaption && options.imageCaption !== options.message) {
        requestBody.caption = options.imageCaption
      }
    } else if (options.type === 'document' && options.documentUrl) {
      // Add document using AiSensy media object format
      requestBody.media = {
        url: options.documentUrl,
        filename: options.documentFilename || 'document.pdf'
      }
      if (options.documentCaption && options.documentCaption !== options.message) {
        requestBody.caption = options.documentCaption
      }
    }

    console.log('🔄 AiSensy API call (Official Format):', {
      destination: cleanPhone,
      messageType: options.type || 'text',
      messageLength: options.message?.length || 0,
      hasApiKey: !!this.accessToken,
      campaignName: requestBody.campaignName,
      hasMedia: !!requestBody.media,
      mediaUrl: requestBody.media?.url,
      mediaFilename: requestBody.media?.filename,
      templateParamsCount: requestBody.templateParams?.length || 0
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
        messageLength: options.message?.length || 0,
        messageType: options.type || 'text',
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

  private async sendMetaMessage(cleanPhone: string, options: WhatsAppMessage) {
    let messageData: any = {
      messaging_product: 'whatsapp',
      to: cleanPhone
    }

    // Handle different message types
    if (options.type === 'image' && options.imageUrl) {
      messageData.type = 'image'
      messageData.image = {
        link: options.imageUrl,
        caption: options.imageCaption || options.message
      }
    } else if (options.type === 'document' && options.documentUrl) {
      messageData.type = 'document'
      messageData.document = {
        link: options.documentUrl,
        filename: options.documentFilename || 'document.pdf',
        caption: options.documentCaption || options.message
      }
    } else {
      // Text message (default)
      messageData.type = 'text'
      messageData.text = {
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
      console.error('📱 Meta API error:', {
        status: response.status,
        statusText: response.statusText,
        error: result.error,
        to: cleanPhone,
        messageType: options.type || 'text',
        messageLength: options.message?.length || 0,
        hasMedia: !!(options.imageUrl || options.documentUrl)
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

  /**
   * Send donation receipt with image using approved template
   */
  async sendDonationReceipt(
    phone: string, 
    donationId: string, 
    donorName: string, 
    amount: number, 
    campaignName?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://khadimemillat.org'
      // Use PNG image endpoint (publicly accessible via middleware)
      const receiptImageUrl = `${baseUrl}/api/receipts/${donationId}/image`
      const thankYouPageUrl = `${baseUrl}/thank-you?donationId=${donationId}`
      
      // Create template parameters for AiSensy template
      const templateParams = [
        donorName, // {{1}}
        '₹', // {{2}}
        amount.toString(), // {{3}}
        '₹', // {{4}}
        amount.toString(), // {{5}}
        campaignName || 'General Donation', // {{6}}
        new Date().toLocaleDateString('en-IN'), // {{7}}
        donationId.slice(-8), // {{8}}
        donationId.slice(-8), // {{9}} - No Razorpay ID available in this method
        thankYouPageUrl // {{10}}
      ]

      const approvedMessage = templateParams.join('|')
      
      return await this.sendMessage({
        to: phone,
        type: 'image',
        message: approvedMessage,
        imageUrl: receiptImageUrl,
        userName: donorName // Pass donor name as recipient name
      })
    } catch (error) {
      console.error('Failed to send donation receipt via WhatsApp:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send receipt'
      }
    }
  }

  /**
   * Send donation confirmation with receipt image using approved template
   */
  async sendDonationConfirmation(
    phone: string,
    donationData: {
      donationId: string
      donorName: string
      amount: number
      currency: string
      campaignName?: string
      programName?: string
      wants80G: boolean
      razorpayPaymentId?: string
    }
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://khadimemillat.org'
      // Use PNG image endpoint (publicly accessible via middleware)
      const receiptImageUrl = `${baseUrl}/api/receipts/${donationData.donationId}/image`
      const thankYouPageUrl = `${baseUrl}/thank-you?donationId=${donationData.donationId}`
      
      // Create template parameters for AiSensy template
      // Template: {{1}} = donorName, {{2}} = currency, {{3}} = amount, {{4}} = currency, {{5}} = amount, 
      // {{6}} = program, {{7}} = date, {{8}} = receiptId, {{9}} = transactionId, {{10}} = thankYouUrl
      const templateParams = [
        donationData.donorName, // {{1}}
        donationData.currency, // {{2}}
        donationData.amount.toString(), // {{3}}
        donationData.currency, // {{4}}
        donationData.amount.toString(), // {{5}}
        donationData.programName || donationData.campaignName || 'General Donation', // {{6}}
        new Date().toLocaleDateString('en-IN'), // {{7}}
        donationData.donationId.slice(-8), // {{8}}
        donationData.razorpayPaymentId || donationData.donationId.slice(-8), // {{9}} - Actual Razorpay transaction ID
        thankYouPageUrl // {{10}}
      ]

      // For AiSensy, we need to send template parameters, not the full message
      const approvedMessage = templateParams.join('|')
      
      return await this.sendMessage({
        to: phone,
        type: 'image',
        message: approvedMessage,
        imageUrl: receiptImageUrl,
        userName: donationData.donorName // Pass donor name as recipient name
      })
    } catch (error) {
      console.error('Failed to send donation confirmation via WhatsApp:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send confirmation'
      }
    }
  }

  /**
   * Send 80G certificate with receipt image using approved template
   */
  async send80GCertificate(
    phone: string,
    donationId: string,
    donorName: string,
    amount: number,
    certificateNumber: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://khadimemillat.org'
      // Use PNG image endpoint (publicly accessible via middleware)
      const receiptImageUrl = `${baseUrl}/api/receipts/${donationId}/image`
      const thankYouPageUrl = `${baseUrl}/thank-you?donationId=${donationId}`
      
      // Create template parameters for AiSensy template
      const templateParams = [
        donorName, // {{1}}
        '₹', // {{2}}
        amount.toString(), // {{3}}
        '₹', // {{4}}
        amount.toString(), // {{5}}
        'General Donation', // {{6}}
        new Date().toLocaleDateString('en-IN'), // {{7}}
        donationId.slice(-8), // {{8}}
        donationId.slice(-8), // {{9}} - No Razorpay ID available in this method
        thankYouPageUrl // {{10}}
      ]

      const approvedMessage = templateParams.join('|')
      
      return await this.sendMessage({
        to: phone,
        type: 'image',
        message: approvedMessage,
        imageUrl: receiptImageUrl,
        userName: donorName // Pass donor name as recipient name
      })
    } catch (error) {
      console.error('Failed to send 80G certificate via WhatsApp:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send certificate'
      }
    }
  }


}

export const whatsappService = new WhatsAppService()
export default WhatsAppService