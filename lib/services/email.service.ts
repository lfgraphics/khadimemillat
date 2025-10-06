import { Resend } from 'resend'

interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
}

class EmailService {
  private resend: Resend

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY)
  }

  async sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!process.env.RESEND_API_KEY) {
        throw new Error('Resend API key not configured')
      }

      const fromEmail = process.env.NOTIFICATION_EMAIL || 'notifications@notifications.khadimemillat.org'
      const fromName = process.env.NOTIFICATION_FROM_NAME || 'KhadiMillat Welfare Foundation'

      const result = await this.resend.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text
      })

      if (result.error) {
        // Log detailed error information
        console.error('📧 Resend API error:', {
          error: result.error,
          to: options.to,
          subject: options.subject
        })
        throw new Error(result.error.message)
      }
      
      return {
        success: true,
        messageId: result.data?.id
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      // Enhanced error logging
      console.error('📧 Email sending failed:', {
        error: errorMessage,
        to: options.to,
        subject: options.subject,
        stack: error instanceof Error ? error.stack : undefined
      })
      
      return {
        success: false,
        error: errorMessage
      }
    }
  }

  async sendBulkEmails(emails: { to: string; subject: string; html: string; text?: string }[]): Promise<{
    sent: number
    failed: number
    results: { email: string; success: boolean; error?: string }[]
  }> {
    const results = []
    let sent = 0
    let failed = 0

    for (const email of emails) {
      const result = await this.sendEmail(email)
      
      results.push({
        email: email.to,
        success: result.success,
        error: result.error
      })

      if (result.success) {
        sent++
      } else {
        failed++
      }

      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    return { sent, failed, results }
  }

  // Email templates
  /**
   * Generates a clean, branded HTML email with site icon, name and a greeting.
   * Uses NEXT_PUBLIC_BASE_URL to build absolute asset URLs for email clients.
   */
  generateDefaultBrandedEmail(params: {
    title: string
    message: string
    greetingName?: string
    siteName?: string
    siteUrl?: string
    iconPath?: string // path beginning with /
  }): string {
    const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || 'https://www.khadimemillat.org').replace(/\/$/, '')
    const siteName = params.siteName || process.env.NOTIFICATION_FROM_NAME || 'Khadim-e-Millat Welfare Foundation'
    const siteUrl = params.siteUrl || baseUrl
    const iconUrl = `${baseUrl}${params.iconPath || '/android-chrome-192x192.png'}`
    const greetingName = (params.greetingName || '').trim()

    const greetingLine = greetingName
      ? `Dear ${greetingName},`
      : 'Dear User,'

    const safeMessage = params.message.replace(/\n/g, '<br>')

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>${params.title}</title>
        </head>
        <body style="margin:0;padding:0;background-color:#f6f7f9;font-family:Segoe UI, Roboto, Helvetica, Arial, sans-serif;color:#111827;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f7f9;padding:24px 0;">
            <tr>
              <td align="center">
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
                  <tr>
                    <td style="padding:20px 24px;border-bottom:1px solid #e5e7eb;background:#fafafa;">
                      <a href="${siteUrl}" style="text-decoration:none;display:inline-flex;align-items:center;gap:10px;">
                        <img src="${iconUrl}" alt="${siteName} icon" width="32" height="32" style="border-radius:6px;display:block;" />
                        <span style="font-size:16px;line-height:24px;color:#111827;font-weight:600;">${siteName}</span>
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:24px 24px 8px 24px;">
                      <h1 style="margin:0;font-size:20px;line-height:28px;color:#111827;">${params.title}</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0 24px 8px 24px;">
                      <p style="margin:0;font-size:14px;line-height:22px;color:#374151;">${greetingLine}</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:8px 24px 24px 24px;">
                      <div style="font-size:14px;line-height:22px;color:#374151;">${safeMessage}</div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:16px 24px;border-top:1px solid #e5e7eb;background:#fafafa;">
                      <p style="margin:0;font-size:12px;line-height:18px;color:#6b7280;">
                        Best regards,<br/>
                        ${siteName}
                      </p>
                    </td>
                  </tr>
                </table>
                <div style="max-width:600px;margin:12px auto 0 auto;color:#9ca3af;font-size:11px;line-height:16px;">
                  You received this email from <a href="${siteUrl}" style="color:#6b7280;text-decoration:underline;">${siteName}</a>.
                </div>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `
  }

  generateCampaignNotificationEmail(campaignTitle: string, campaignUrl: string, programTitle: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>New Campaign Launched</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2563eb;">New Campaign Launched!</h2>
            <p>We're excited to announce a new campaign under our <strong>${programTitle}</strong> program:</p>
            <h3 style="color: #1f2937;">${campaignTitle}</h3>
            <p>Your support can make a real difference in someone's life. Every contribution helps us reach our goals and create positive impact in our community.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${campaignUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Campaign</a>
            </div>
            <p style="color: #6b7280; font-size: 14px;">
              Thank you for being part of our mission to transform communities.
              <br><br>
              Best regards,<br>
              Khadim-Millat Welfare Foundation
            </p>
          </div>
        </body>
      </html>
    `
  }

  generateCustomNotificationEmail(title: string, message: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${title}</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2563eb;">${title}</h2>
            <div style="margin: 20px 0;">
              ${message.replace(/\n/g, '<br>')}
            </div>
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              Best regards,<br>
              Khadim-Millat Welfare Foundation
            </p>
          </div>
        </body>
      </html>
    `
  }
}

export const emailService = new EmailService()
export default EmailService