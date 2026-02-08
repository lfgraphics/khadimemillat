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

import { formatForWhatsApp } from '@/lib/utils/phone'

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

/**
 * Campaign-based WhatsApp message for AiSensy API
 * Supports dynamic templates with parameters
 */
export interface WhatsAppCampaignMessage {
  campaignName: string           // AiSensy campaign name (e.g., "account_creation")
  destination: string             // Phone number with country code (E.164 format)
  userName: string               // Recipient's name
  templateParams?: string[]      // Dynamic parameters in order [{{1}}, {{2}}, ...]
  source?: string                // For segmentation (e.g., "web_signup")
  media?: {
    url: string
    filename: string
  }
  tags?: string[]                // User tags for targeting
  attributes?: Record<string, string> // Custom attributes
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
  }

  private isConfigured(): boolean {
    return !!(this.accessToken && this.phoneNumberId)
  }

  async sendMessage(options: WhatsAppMessage): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!this.isConfigured()) {
        throw new Error('WhatsApp API not configured. Please set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID')
      }

      const cleanPhone = options.to.replace(/[^\d]/g, '')

      if (this.provider === 'aisensy') {
        return await this.sendAiSensyMessage(cleanPhone, options)
      } else {
        return await this.sendMetaMessage(cleanPhone, options)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('WhatsApp message failed:', errorMessage)

      return {
        success: false,
        error: errorMessage
      }
    }
  }

  private async sendAiSensyMessage(cleanPhone: string, options: WhatsAppMessage) {
    const apiUrl = 'https://backend.aisensy.com/campaign/t1/api/v2'
    const campaignName = options.type === 'image' ? "Donation Confirmation Message" : "api_text_campaign"

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

    // Always add templateParams for donation confirmation messages
    // The template expects exactly 10 parameters for donation confirmations
    if (templateParams.length > 1) {
      requestBody.templateParams = templateParams
    } else if (templateParams[0] && templateParams[0].includes('|')) {
      // If single message contains pipe-separated parameters, split them
      requestBody.templateParams = templateParams[0].split('|')
    }

    // Validate template parameters for donation confirmations
    if (requestBody.templateParams && requestBody.templateParams.length !== 10) {
      console.warn('⚠️ Template parameter count mismatch:', {
        expected: 10,
        actual: requestBody.templateParams.length,
        params: requestBody.templateParams,
        campaignName: campaignName
      })

      // Pad with empty strings if too few parameters
      while (requestBody.templateParams.length < 10) {
        requestBody.templateParams.push('')
      }

      // Truncate if too many parameters
      if (requestBody.templateParams.length > 10) {
        requestBody.templateParams = requestBody.templateParams.slice(0, 10)
      }
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
        filename: options.documentFilename || 'document?.pdf'
      }
      if (options.documentCaption && options.documentCaption !== options.message) {
        requestBody.caption = options.documentCaption
      }
    }



    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
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
      console.error('AiSensy API error:', response.status, result)

      // Provide specific error guidance based on AiSensy documentation
      let errorMessage = result.message || result.error || `AiSensy API error: ${response.status} - ${response.statusText}`

      if (response.status === 400) {
        // Check if it's a template parameter mismatch
        if (errorMessage.toLowerCase().includes('template') || errorMessage.toLowerCase().includes('parameter')) {
          errorMessage += ". Template parameter mismatch detected. Expected 10 parameters for donation confirmation template."
        } else {
          errorMessage += `. Please check: 1) API campaign '${campaignName}' exists and is Live, 2) Template is approved, 3) All required fields are provided.`
        }
      } else if (response.status === 401) {
        errorMessage += ". Please verify your API key in AiSensy dashboard: Manage > API Key"
      }

      throw new Error(errorMessage)
    }

    return {
      success: true,
      messageId: result.messageId || result.id || result.campaignId || 'sent'
    }
  }

  private async sendMetaMessage(cleanPhone: string, options: WhatsAppMessage) {
    let messageData: any = {
      messaging_product: 'whatsapp',
      to: cleanPhone.replace(/[^\d]/g, '')
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
        filename: options.documentFilename || 'document?.pdf',
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
        to: cleanPhone.replace(/[^\d]/g, ''),
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
    // Use the centralized phone formatting utility
    // This returns the phone number in the correct format for WhatsApp API (digits only, with country code)
    return formatForWhatsApp(phone)
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
    campaignName?: string,
    razorpayPaymentId?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const baseUrl = 'https://khadimemillat.org'
      // Use PNG image endpoint (publicly accessible via middleware)
      const receiptImageUrl = `${baseUrl}/api/receipts/${donationId}/image`
      const thankYouPageUrl = `${baseUrl}/thank-you?donationId=${donationId}`

      // Create template parameters for AiSensy template
      // Note: Don't include URLs in template parameters to avoid making image clickable to external URLs
      const templateParams = [
        donorName || 'Valued Donor', // {{1}} - Start with donor name
        '₹', // {{2}}
        amount.toString() || '0', // {{3}}
        '₹', // {{4}}
        amount.toString() || '0', // {{5}}
        campaignName || 'General Donation', // {{6}}
        new Date().toLocaleDateString('en-IN'), // {{7}}
        donationId.slice(-8), // {{8}} - Receipt ID (short donation ID)
        razorpayPaymentId || donationId.slice(-8), // {{9}} - Transaction ID (Razorpay payment ID)
        `${thankYouPageUrl}` // {{10}} - Thank you page URL
      ]

      // Ensure all parameters are strings and not empty
      const sanitizedParams = templateParams.map((param, index) => {
        const sanitized = String(param || '').trim()
        return sanitized || (index === 0 ? 'Valued Donor' : // Donor name
          index === 1 || index === 3 ? '₹' : // Currency symbols
            index === 2 || index === 4 ? '0' : // Amounts
              index === 5 ? 'General Donation' : // Campaign name
                index === 6 ? new Date().toLocaleDateString('en-IN') : // Date
                  index === 7 ? donationId.slice(-8) : // Receipt ID
                    index === 8 ? razorpayPaymentId || donationId.slice(-8) : // Transaction ID
                      `${thankYouPageUrl}`) // Thank you page URL
      })

      const approvedMessage = sanitizedParams.join('|')

      return await this.sendMessage({
        to: phone.replace(/[^\d]/g, ''),
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
      // {{6}} = program, {{7}} = date, {{8}} = receiptId, {{9}} = transactionId, {{10}} = thankYouMessage
      const templateParams = [
        donationData.donorName || 'Valued Donor', // {{1}}
        '₹', // {{2}}
        donationData.amount.toString() || '0', // {{3}}
        '₹', // {{4}}
        donationData.amount.toString() || '0', // {{5}}
        donationData.programName || donationData.campaignName || 'General Donation', // {{6}}
        new Date().toLocaleDateString('en-IN'), // {{7}}
        donationData.donationId.slice(-8), // {{8}} - Receipt ID (short donation ID)
        donationData.razorpayPaymentId || donationData.donationId.slice(-8), // {{9}} - Transaction ID (Razorpay payment ID)
        `${thankYouPageUrl}` // {{10}} - Thank you page URL
      ]

      // Ensure all parameters are strings and not empty
      const sanitizedParams = templateParams.map((param, index) => {
        const sanitized = String(param || '').trim()
        if (!sanitized) {
          console.warn(`⚠️ Empty template parameter at index ${index + 1}:`, param)
          return index === 0 ? 'Valued Donor' :
            index === 1 || index === 3 ? '₹' :
              index === 2 || index === 4 ? '0' :
                index === 5 ? 'General Donation' :
                  index === 6 ? new Date().toLocaleDateString('en-IN') :
                    index === 7 ? donationData.donationId.slice(-8) : // Receipt ID
                      index === 8 ? donationData.razorpayPaymentId || donationData.donationId.slice(-8) : // Transaction ID
                        `${thankYouPageUrl}` // Thank you page URL
        }
        return sanitized
      })

      // For AiSensy, we need to send template parameters, not the full message
      const approvedMessage = sanitizedParams.join('|')



      // Try to send with image first, fallback to text if image fails
      try {
        return await this.sendMessage({
          to: phone.replace(/[^\d]/g, ''),
          type: 'image',
          message: approvedMessage,
          imageUrl: receiptImageUrl,
          userName: donationData.donorName
        })
      } catch (imageError) {
        // Fallback to text-only message
        const textMessage = `*Assalamu Alaikum ${donationData.donorName}*\n\nAlhamdulillah! Your generous donation has been received successfully.\n\n💰 *Amount:* ${donationData.currency} ${donationData.amount.toLocaleString('en-IN')}\n📋 *Receipt ID:* ${donationData.donationId.slice(-8)}\n🏛️ *Program:* ${donationData.programName || donationData.campaignName || 'General Donation'}\n📅 *Date:* ${new Date().toLocaleDateString('en-IN')}\n\n🔗 *View Details:* ${thankYouPageUrl}\n\nJazakallahu Khairan! May Allah accept your donation and bless you abundantly.\n\n_Khadim-e-Millat Welfare Foundation_\n📞 +91 80817 47259`

        return await this.sendMessage({
          to: phone.replace(/[^\d]/g, ''),
          type: 'text',
          message: textMessage,
          userName: donationData.donorName
        })
      }
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
    _certificateNumber: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const baseUrl = 'https://khadimemillat.org'
      // Use PNG image endpoint (publicly accessible via middleware)
      const receiptImageUrl = `${baseUrl}/api/receipts/${donationId}/image`
      const thankYouPageUrl = `${baseUrl}/thank-you?donationId=${donationId}`

      // Create template parameters for AiSensy template
      const templateParams = [
        donorName || 'Valued Donor', // {{1}}
        '₹', // {{2}}
        amount.toString() || '0', // {{3}}
        '₹', // {{4}}
        amount.toString() || '0', // {{5}}
        'General Donation', // {{6}}
        new Date().toLocaleDateString('en-IN'), // {{7}}
        donationId.slice(-8), // {{8}}
        donationId.slice(-8), // {{9}} - No Razorpay ID available in this method
        thankYouPageUrl // {{10}}
      ]

      // Ensure all parameters are strings and not empty
      const sanitizedParams = templateParams.map((param, index) => {
        const sanitized = String(param || '').trim()
        return sanitized || (index === 0 ? 'Valued Donor' :
          index === 1 || index === 3 ? '₹' :
            index === 2 || index === 4 ? '0' :
              index === 5 ? 'General Donation' :
                index === 6 ? new Date().toLocaleDateString('en-IN') :
                  index === 7 || index === 8 ? donationId.slice(-8) :
                    thankYouPageUrl)
      })

      const approvedMessage = sanitizedParams.join('|')

      return await this.sendMessage({
        to: phone.replace(/[^\d]/g, ''),
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

  /**
   * Send campaign-based message via AiSensy API
   * Supports any campaign with dynamic parameters
   */
  async sendCampaignMessage(options: WhatsAppCampaignMessage): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!this.isConfigured()) {
        throw new Error('WhatsApp API not configured. Please set WHATSAPP_ACCESS_TOKEN')
      }

      if (this.provider !== 'aisensy') {
        throw new Error('Campaign messages are only supported with AiSensy provider')
      }

      const apiUrl = 'https://backend.aisensy.com/campaign/t1/api/v2'

      // Clean phone number (remove non-digits)
      const cleanPhone = options.destination.replace(/[^\d]/g, '')

      const requestBody: any = {
        apiKey: this.accessToken,
        campaignName: options.campaignName,
        destination: cleanPhone,
        userName: options.userName
      }

      // Add optional fields
      if (options.templateParams && options.templateParams.length > 0) {
        requestBody.templateParams = options.templateParams
      }

      if (options.source) {
        requestBody.source = options.source
      }

      if (options.media) {
        requestBody.media = options.media
      }

      if (options.tags && options.tags.length > 0) {
        requestBody.tags = options.tags
      }

      if (options.attributes) {
        requestBody.attributes = options.attributes
      }

      console.log('[WHATSAPP_CAMPAIGN]', {
        campaign: options.campaignName,
        destination: cleanPhone,
        userName: options.userName,
        params: options.templateParams?.length || 0
      })

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      const responseText = await response.text()
      const contentType = response.headers.get('content-type') || ''

      if (!contentType.includes('application/json')) {
        console.error('❌ AiSensy returned non-JSON response:', {
          status: response.status,
          contentType,
          campaign: options.campaignName
        })

        if (response.status === 404) {
          throw new Error(`Campaign "${options.campaignName}" not found. Please create it in AiSensy dashboard.`)
        } else if (response.status === 401 || response.status === 403) {
          throw new Error(`AiSensy API authentication failed. Please check your API key.`)
        } else if (response.status === 400) {
          throw new Error(`Invalid campaign request for "${options.campaignName}". Please verify campaign is Live and template is approved.`)
        } else {
          throw new Error(`AiSensy API error (Status ${response.status})`)
        }
      }

      let result
      try {
        result = JSON.parse(responseText)
      } catch (parseError) {
        console.error('❌ Failed to parse AiSensy response:', responseText.substring(0, 500))
        throw new Error(`Invalid JSON response from AiSensy API`)
      }

      if (!response.ok) {
        console.error('AiSensy campaign error:', response.status, result)
        const errorMessage = result.message || result.error || `Campaign "${options.campaignName}" failed`
        throw new Error(errorMessage)
      }

      return {
        success: true,
        messageId: result.messageId || result.id || result.campaignId || 'sent'
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('WhatsApp campaign message failed:', errorMessage)

      return {
        success: false,
        error: errorMessage
      }
    }
  }

  /**
   * Send campaign-based message to multiple recipients via AiSensy API
   * More efficient than sending one-by-one
   */
  async sendBulkCampaignMessage(options: {
    campaignName: string
    recipients: Array<{
      destination: string
      userName: string
      templateParams?: string[]
    }>
    source?: string
  }): Promise<{ success: boolean; sent: number; failed: number; errors?: string[] }> {
    try {
      if (!this.isConfigured()) {
        throw new Error('WhatsApp API not configured. Please set WHATSAPP_ACCESS_TOKEN')
      }

      if (this.provider !== 'aisensy') {
        throw new Error('Bulk campaign messages are only supported with AiSensy provider')
      }

      const apiUrl = 'https://backend.aisensy.com/campaign/t1/api/v2'
      let sent = 0
      let failed = 0
      const errors: string[] = []

      console.log(`📤 Sending campaign "${options.campaignName}" to ${options.recipients.length} recipients in batches`)

      for (let i = 0; i < options.recipients.length; i += 10) {
        const batch = options.recipients.slice(i, i + 10)
        const batchPromises = batch.map(recipient => 
          this.sendCampaignMessage({
            campaignName: options.campaignName,
            destination: recipient.destination,
            userName: recipient.userName,
            templateParams: recipient.templateParams,
            source: options.source
          }).then(r => ({ success: r.success, error: r.error }))
          .catch(e => ({ success: false, error: e.message }))
        )
        const results = await Promise.all(batchPromises)
        results.forEach(r => r.success ? sent++ : (failed++, r.error && errors.push(r.error)))
        if (i + 10 < options.recipients.length) await new Promise(r => setTimeout(r, 1000))
      }

      return { success: sent > 0, sent, failed, errors: errors.length > 0 ? errors.slice(0, 10) : undefined }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('❌ WhatsApp bulk campaign message failed:', errorMessage)

      return {
        success: false,
        sent: 0,
        failed: options.recipients.length,
        errors: [errorMessage]
      }
    }
  }
  /**
   * Send account creation notification via "account_creation" campaign
   * Simplified method for user registration notifications
   * Template parameter {{1}} = phone number (e.g., "9876543210")
   */
  async sendAccountCreationNotification(options: {
    phone: string
    userName: string
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    // Extract clean phone number (digits only, no country code prefix)
    const cleanPhone = options.phone.replace(/^\+?91/, '').replace(/[^\d]/g, '')

    return this.sendCampaignMessage({
      campaignName: 'account creation',
      destination: options.phone,
      userName: options.userName,
      templateParams: [cleanPhone],
      source: 'user_registration'
    })
  }

}


export const whatsappService = new WhatsAppService()
export default WhatsAppService
