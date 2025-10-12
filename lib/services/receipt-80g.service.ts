import { emailService } from '@/lib/services/email.service'
import { smsService } from '@/lib/services/sms.service'
import connectDB from '@/lib/db'

export interface CertificateData {
  donationId: string
  donorName: string
  donorPAN: string
  donorEmail: string
  donorPhone?: string
  donorAddress: string
  donorCity: string
  donorState: string
  donorPincode: string
  amount: number
  currency: string
  donationDate: Date
  campaignName?: string
  programName?: string
  certificateNumber: string
  financialYear: string
}

export class Receipt80GService {
  private static readonly ORGANIZATION_NAME = "Khadim-e-Millat Welfare Foundation"
  private static readonly ORGANIZATION_PAN = "AABCK1234E" // Replace with actual PAN
  private static readonly ORGANIZATION_ADDRESS = "123 Main Street, Mumbai, Maharashtra - 400001"
  private static readonly ORGANIZATION_80G_REGISTRATION = "AABCK1234EF20240001" // Replace with actual 80G registration number
  private static readonly ORGANIZATION_80G_VALIDITY = "01/04/2024 to 31/03/2029" // Replace with actual validity period
  private static readonly CERTIFICATE_PREFIX = "KMWF-80G" // Organization prefix for certificate numbers

  /**
   * Convert number to words (Indian format)
   */
  static numberToWords(amount: number): string {
    const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    function convertHundreds(num: number): string {
      let result = '';

      if (num >= 100) {
        result += units[Math.floor(num / 100)] + ' Hundred ';
        num %= 100;
      }

      if (num >= 20) {
        result += tens[Math.floor(num / 10)] + ' ';
        num %= 10;
      } else if (num >= 10) {
        result += teens[num - 10] + ' ';
        return result;
      }

      if (num > 0) {
        result += units[num] + ' ';
      }

      return result;
    }

    if (amount === 0) return 'Zero';

    let result = '';
    let crores = Math.floor(amount / 10000000);
    amount %= 10000000;

    let lakhs = Math.floor(amount / 100000);
    amount %= 100000;

    let thousands = Math.floor(amount / 1000);
    amount %= 1000;

    if (crores > 0) {
      result += convertHundreds(crores) + 'Crore ';
    }

    if (lakhs > 0) {
      result += convertHundreds(lakhs) + 'Lakh ';
    }

    if (thousands > 0) {
      result += convertHundreds(thousands) + 'Thousand ';
    }

    if (amount > 0) {
      result += convertHundreds(amount);
    }

    return result.trim();
  }

  /**
   * Generate a unique certificate number using financial year + sequential counter
   * Format: KMWF-80G-{FY}-{6-digit-sequence}
   * Example: KMWF-80G-2024-25-000123
   */
  static async generateCertificateNumber(financialYear: string, donationId?: string): Promise<{ certificateNumber: string; sequenceNumber: number }> {
    try {
      await connectDB()

      // Import the ReceiptCounter model
      const ReceiptCounter = (await import('@/models/ReceiptCounter')).default

      // Atomically increment the counter for this financial year
      const counterDoc = await ReceiptCounter.findOneAndUpdate(
        { financialYear, prefix: this.CERTIFICATE_PREFIX },
        {
          $inc: { sequence: 1 },
          $set: { lastUsed: new Date() }
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true
        }
      )

      // Format: KMWF-80G-2024-25-000123
      const sequence = counterDoc.sequence.toString().padStart(6, '0')
      const certificateNumber = `${this.CERTIFICATE_PREFIX}-${financialYear}-${sequence}`

      return { certificateNumber, sequenceNumber: counterDoc.sequence }

    } catch (error) {
      console.error('[CERTIFICATE_NUMBER_GENERATION_FAILED]', error)

      // Fallback: use donationId-based approach (less ideal for audits)
      const suffix = donationId ? donationId.toString().slice(-8) : Date.now().toString().slice(-6)
      const certificateNumber = `${this.CERTIFICATE_PREFIX}-${financialYear}-${suffix}`

      return { certificateNumber, sequenceNumber: 0 } // 0 indicates fallback method
    }
  }

  /**
   * Determine financial year based on donation date
   */
  static getFinancialYear(donationDate: Date): string {
    const year = donationDate.getFullYear()
    const month = donationDate.getMonth() + 1 // getMonth() returns 0-11

    if (month >= 4) {
      // April to March of next year
      return `${year}-${(year + 1).toString().slice(2)}`
    } else {
      // January to March belongs to previous FY
      return `${year - 1}-${year.toString().slice(2)}`
    }
  }

  /**
   * Validate PAN number format
   */
  static isValidPAN(pan: string): boolean {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/
    return panRegex.test(pan)
  }

  /**
   * Validate certificate number format
   */
  static isValidCertificateNumber(certificateNumber: string): boolean {
    const certRegex = /^KMWF-80G-\d{4}-\d{2}-\d{6}$/
    return certRegex.test(certificateNumber)
  }

  /**
   * Extract financial year from certificate number
   */
  static extractFinancialYearFromCertificate(certificateNumber: string): string | null {
    const match = certificateNumber.match(/^KMWF-80G-(\d{4}-\d{2})-\d{6}$/)
    return match ? match[1] : null
  }

  /**
   * Extract sequence number from certificate number
   */
  static extractSequenceFromCertificate(certificateNumber: string): number | null {
    const match = certificateNumber.match(/^KMWF-80G-\d{4}-\d{2}-(\d{6})$/)
    return match ? parseInt(match[1], 10) : null
  }

  /**
   * Get certificate statistics for a financial year
   */
  static async getCertificateStats(financialYear: string): Promise<{
    totalIssued: number
    currentSequence: number
    lastIssued: Date | null
  }> {
    try {
      await connectDB()
      const ReceiptCounter = (await import('@/models/ReceiptCounter')).default

      const counter = await ReceiptCounter.findOne({
        financialYear,
        prefix: this.CERTIFICATE_PREFIX
      }).lean()

      return {
        totalIssued: (counter as any)?.sequence || 0,
        currentSequence: (counter as any)?.sequence || 0,
        lastIssued: (counter as any)?.lastUsed || null
      }
    } catch (error) {
      console.error('[CERTIFICATE_STATS_ERROR]', error)
      return {
        totalIssued: 0,
        currentSequence: 0,
        lastIssued: null
      }
    }
  }

  /**
   * Generate 80G certificate HTML content
   */
  static generate80GCertificateHTML(data: CertificateData): string {
    const donationDateFormatted = data.donationDate.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })

    const amountInWords = this.numberToWords(data.amount)
    const donorFullAddress = `${data.donorAddress}, ${data.donorCity}, ${data.donorState} - ${data.donorPincode}`

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>80G Donation Certificate</title>
  <style>
    @media (prefers-color-scheme: dark) {
      body { 
        font-family: Arial, sans-serif; 
        margin: 0; 
        padding: 20px; 
        background: #111827; 
        line-height: 1.4; 
        color: #f3f4f6;
      }
      .certificate { 
        background: #1f2937; 
        max-width: 800px; 
        margin: 0 auto; 
        padding: 40px; 
        border: 2px solid #3b82f6; 
        border-radius: 10px; 
        color: #f3f4f6;
      }
      .header { text-align: center; margin-bottom: 30px; }
      .logo { color: #60a5fa; font-size: 24px; font-weight: bold; margin-bottom: 10px; }
      .org-name { font-size: 20px; font-weight: bold; color: #f3f4f6; margin-bottom: 5px; }
      .cert-title { font-size: 18px; font-weight: bold; color: #f87171; margin: 20px 0; text-align: center; text-decoration: underline; }
      .cert-number { background: #374151; padding: 10px; text-align: center; font-weight: bold; margin: 20px 0; border: 1px solid #4b5563; color: #f3f4f6; }
      .content { line-height: 1.6; color: #d1d5db; text-align: justify; }
      .amount { font-size: 16px; font-weight: bold; color: #34d399; }
      .footer { margin-top: 40px; border-top: 1px solid #4b5563; padding-top: 20px; font-size: 12px; color: #9ca3af; }
      .electronic-notice { background: #451a03; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b; color: #fed7aa; }
      table { width: 100%; border-collapse: collapse; margin: 20px 0; }
      td { padding: 10px; border: 1px solid #4b5563; vertical-align: top; color: #f3f4f6; }
      .label { font-weight: bold; width: 35%; background: #374151; }
      .validity-notice { background: #1e3a8a; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #60a5fa; color: #dbeafe; }
      .compliance-text { margin: 20px 0; padding: 15px; background: #14532d; border-radius: 8px; border-left: 4px solid #22c55e; color: #dcfce7; }
      .footer-border { border-top: 1px solid #4b5563; }
    }
    
    @media (prefers-color-scheme: light) {
      body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; line-height: 1.4; }
      .certificate { background: white; max-width: 800px; margin: 0 auto; padding: 40px; border: 2px solid #2563eb; border-radius: 10px; }
      .header { text-align: center; margin-bottom: 30px; }
      .logo { color: #2563eb; font-size: 24px; font-weight: bold; margin-bottom: 10px; }
      .org-name { font-size: 20px; font-weight: bold; color: #1f2937; margin-bottom: 5px; }
      .cert-title { font-size: 18px; font-weight: bold; color: #dc2626; margin: 20px 0; text-align: center; text-decoration: underline; }
      .cert-number { background: #f3f4f6; padding: 10px; text-align: center; font-weight: bold; margin: 20px 0; border: 1px solid #d1d5db; }
      .content { line-height: 1.6; color: #374151; text-align: justify; }
      .amount { font-size: 16px; font-weight: bold; color: #059669; }
      .footer { margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 20px; font-size: 12px; color: #6b7280; }
      .electronic-notice { background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b; }
      table { width: 100%; border-collapse: collapse; margin: 20px 0; }
      td { padding: 10px; border: 1px solid #d1d5db; vertical-align: top; }
      .label { font-weight: bold; width: 35%; background: #f9fafb; }
      .validity-notice { background: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6; }
      .compliance-text { margin: 20px 0; padding: 15px; background: #f0fdf4; border-radius: 8px; border-left: 4px solid #22c55e; }
      .footer-border { border-top: 1px solid #e5e7eb; }
    }
  </style>
</head>
<body>
  <div class="certificate">
    <div class="header">
      <div class="logo"><img src="https://www.khadimemillat.org/android-chrome-512x512.png" alt="Organization Logo" style="height: 60px; margin-right: 10px;">${this.ORGANIZATION_NAME}</div>
      <div class="org-name">${this.ORGANIZATION_NAME}</div>
      <div style="font-size: 14px; margin: 5px 0;">${this.ORGANIZATION_ADDRESS}</div>
      <div style="font-size: 14px;">PAN: <strong>${this.ORGANIZATION_PAN}</strong></div>
      <div style="font-size: 14px;">80G Registration No: <strong>${this.ORGANIZATION_80G_REGISTRATION}</strong></div>
    </div>

    <div class="validity-notice">
      <strong>80G Registration Validity Period:</strong> ${this.ORGANIZATION_80G_VALIDITY}
    </div>

    <div class="cert-title">CERTIFICATE UNDER SECTION 80G OF INCOME TAX ACT, 1961</div>
    
    <div class="cert-number">Certificate No: ${data.certificateNumber}</div>

    <div class="content">
      <p>This is to certify that we have received the following donation from the donor mentioned below:</p>
      
      <table>
        <tr>
          <td class="label">Name of the Donor:</td>
          <td><strong>${data.donorName}</strong></td>
        </tr>
        <tr>
          <td class="label">PAN of the Donor:</td>
          <td><strong>${data.donorPAN}</strong></td>
        </tr>
        <tr>
          <td class="label">Address of the Donor:</td>
          <td>${donorFullAddress}</td>
        </tr>
        <tr>
          <td class="label">Donation Amount (Figures):</td>
          <td class="amount">${data.currency} ${data.amount.toLocaleString('en-IN')}</td>
        </tr>
        <tr>
          <td class="label">Donation Amount (Words):</td>
          <td><strong>${amountInWords} Rupees Only</strong></td>
        </tr>
        <tr>
          <td class="label">Date of Receipt:</td>
          <td>${donationDateFormatted}</td>
        </tr>
        <tr>
          <td class="label">Financial Year:</td>
          <td>${data.financialYear}</td>
        </tr>
        <tr>
          <td class="label">Purpose of Donation:</td>
          <td>${data.programName || 'General Charitable Activities'}</td>
        </tr>
        ${data.campaignName ? `<tr><td class="label">Campaign/Project:</td><td>${data.campaignName}</td></tr>` : ''}
        <tr>
          <td class="label">Transaction Reference:</td>
          <td>${data.donationId}</td>
        </tr>
      </table>

      <div class="compliance-text">
        <p><strong>COMPLIANCE STATEMENT:</strong></p>
        <p>We hereby certify that:</p>
        <ul style="margin: 10px 0; padding-left: 25px;">
          <li>The above donation has been received by us without any consideration.</li>
          <li>The donation is eligible for deduction under Section 80G of the Income Tax Act, 1961.</li>
          <li>We are registered under Section 80G and our registration is valid for the period mentioned above.</li>
          <li>This receipt has been issued in accordance with the provisions of Section 80G of the Income Tax Act, 1961.</li>
        </ul>
      </div>

      <div class="electronic-notice">
        <p><strong>📋 FORM 10BD FILING NOTICE:</strong></p>
        <p>As per Income Tax Department requirements, we will file Form 10BD (Statement of Donations) electronically. The Income Tax Department will generate Form 10BE (Certificate of Donation) which you can access from your e-filing account. Your donation details will be pre-filled in your Income Tax Return automatically.</p>
      </div>
    </div>

    <div style="margin-top: 30px; text-align: center;">
      <div style="margin-bottom: 15px;">
        <strong>Date of Issue:</strong> ${new Date().toLocaleDateString('en-IN')}
      </div>
      <div style="margin-bottom: 15px;">
        <strong>Place:</strong> Mumbai
      </div>
    </div>

    <div class="electronic-notice" style="text-align: center; margin-top: 30px;">
      <p><strong>🔒 ELECTRONICALLY GENERATED CERTIFICATE</strong></p>
      <p style="font-size: 12px; margin: 5px 0;">This certificate is computer-generated and electronically issued. No physical signature is required as per current Income Tax guidelines.</p>
    </div>

    <div style="background-color: #f8f9fa; padding: 15px; margin: 20px 0; border-radius: 8px; text-align: center;">
      <p><strong>📄 CERTIFICATE ACCESS & VERIFICATION</strong></p>
      <p style="font-size: 12px; margin: 5px 0;">Visit your personalized donation page for receipt download, verification, and sharing:</p>
      <p style="margin: 10px 0;"><strong>
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://khadimemillat.org'}/thank-you?donationId=${data.donationId}" 
           style="color: #3B82F6; text-decoration: none; border: 1px solid #3B82F6; padding: 8px 16px; border-radius: 4px; display: inline-block;">
          🔗 View Donation Details
        </a>
      </strong></p>
      <p style="font-size: 11px; color: #666;">This link provides access to download receipts, verify transaction status, and share donation proof.</p>
    </div>

    <div class="footer">
      <p><strong>Important Notes:</strong></p>
      <ul style="margin: 10px 0; padding-left: 20px;">
        <li>Please retain this certificate for your Income Tax records and any future verification.</li>
        <li>Ensure that our 80G registration is valid during the financial year of your donation.</li>
        <li>Cross-verify donation details with Form 10BE in your e-filing account.</li>
        <li>For any queries regarding this certificate, contact us at support@khadimemillat.org or +91 80817 47259</li>
        <li>This certificate is issued in compliance with Section 80G of the Income Tax Act, 1961 and related rules.</li>
      </ul>
      
      <div style="margin-top: 20px; padding-top: 15px; text-align: center; font-size: 11px;" class="footer-border">
        <p><strong>For ${this.ORGANIZATION_NAME}</strong></p>
        <p>Authorized Representative</p>
        <p>(As per Digital Certificate Policy)</p>
      </div>
    </div>
  </div>
</body>
</html>`
  }

  /**
   * Generate and send 80G certificate via email
   */
  static async send80GCertificateByEmail(data: CertificateData): Promise<void> {
    try {
      const certificateHTML = this.generate80GCertificateHTML(data)

      const emailSubject = `80G Tax Exemption Certificate - ${data.certificateNumber}`

      const emailContent = emailService.generateDefaultBrandedEmail({
        title: '80G Tax Exemption Certificate',
        greetingName: data.donorName,
        message: `
          <p>Thank you for your generous donation to ${this.ORGANIZATION_NAME}.</p>
          <p>Please find your 80G Tax Exemption Certificate below for claiming tax deduction under Section 80G of the Income Tax Act, 1961.</p>
          
          <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <h4 style="color: #dc2626; margin-bottom: 10px;">📋 Certificate Details</h4>
            <p><strong>Certificate Number:</strong> ${data.certificateNumber}</p>
            <p><strong>Donation Amount:</strong> ${data.currency} ${data.amount.toLocaleString('en-IN')}</p>
            <p><strong>Financial Year:</strong> ${data.financialYear}</p>
          </div>
          
          <div style="background: #dbeafe; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #3b82f6;">
            <h4 style="color: #1e40af; margin-bottom: 10px;">📋 Important: Form 10BD Filing</h4>
            <p><strong>We will file Form 10BD (Statement of Donations) with the Income Tax Department electronically.</strong></p>
            <ul style="margin: 10px 0; padding-left: 20px; color: #1e40af;">
              <li>The IT Department will generate <strong>Form 10BE (Certificate of Donation)</strong> in your e-filing account</li>
              <li>Your donation will be <strong>pre-filled in your Income Tax Return</strong> automatically</li>
              <li>You can access Form 10BE from your <strong>e-filing portal</strong> during tax filing</li>
              <li>Keep this certificate for your records and verification purposes</li>
            </ul>
          </div>
          
          <p style="color: #059669; font-weight: 600;">🏛️ This certificate is valid for income tax deduction purposes and complies with current IT Department guidelines.</p>
          <p><strong>Note:</strong> This is an electronically generated certificate. No physical signature is required as per current Income Tax rules.</p>
        `
      })

      // TODO: Add PDF generation and attachment functionality
      // For now, we'll include the certificate HTML in the email
      const fullEmailContent = emailContent + '<hr>' + certificateHTML

      await emailService.sendEmail({
        to: data.donorEmail,
        subject: emailSubject,
        html: fullEmailContent
      })

      console.log(`[80G_CERTIFICATE_EMAIL_SENT] ${data.donorEmail} - ${data.certificateNumber}`)
    } catch (error) {
      console.error('[80G_CERTIFICATE_EMAIL_FAILED]', error)
      throw error
    }
  }

  /**
   * Send 80G certificate notification via SMS
   */
  static async send80GCertificateBySMS(data: CertificateData): Promise<void> {
    if (!data.donorPhone) return

    try {
      const smsMessage = `Dear ${data.donorName}, your 80G tax exemption certificate (${data.certificateNumber}) for donation of ${data.currency} ${data.amount} has been generated. Check your email for details. - Khadim-e-Millat`

      await smsService.sendSMS({
        to: data.donorPhone,
        message: smsMessage
      } as any)

      console.log(`[80G_CERTIFICATE_SMS_SENT] ${data.donorPhone} - ${data.certificateNumber}`)
    } catch (error) {
      console.error('[80G_CERTIFICATE_SMS_FAILED]', error)
      throw error
    }
  }

  /**
   * Generate and process 80G certificate for a donation (used internally by notification service)
   */
  static async process80GCertificate(donationData: any, skipEmailSending: boolean = true): Promise<{ certificateNumber: string; financialYear: string; sequenceNumber: number }> {
    if (!donationData.wants80GReceipt || !donationData.donorPAN) {
      throw new Error('80G certificate not requested or PAN not provided')
    }

    if (!this.isValidPAN(donationData.donorPAN)) {
      throw new Error('Invalid PAN number format')
    }

    // Validate address fields
    if (!donationData.donorAddress || !donationData.donorCity || !donationData.donorState || !donationData.donorPincode) {
      throw new Error('Complete address is required for 80G certificate')
    }

    const donationDate = new Date(donationData.createdAt || donationData.donationDate || Date.now())
    const financialYear = this.getFinancialYear(donationDate)
    const { certificateNumber, sequenceNumber } = await this.generateCertificateNumber(financialYear, donationData._id.toString())

    // Get program and campaign names
    let programName = 'General Charitable Activities'
    let campaignName: string | undefined

    try {
      if (donationData.programId) {
        const WelfareProgram = (await import('@/models/WelfareProgram')).default
        const program = await WelfareProgram.findById(donationData.programId).select('title name').lean()
        if (program) programName = (program as any).title || (program as any).name
      }

      if (donationData.campaignId) {
        const Campaign = (await import('@/models/Campaign')).default
        const campaign = await Campaign.findById(donationData.campaignId).select('name title').lean()
        if (campaign) campaignName = (campaign as any).name || (campaign as any).title
      }
    } catch (e) {
      console.warn('[80G_PROGRAM_CAMPAIGN_LOOKUP_FAILED]', e)
    }

    const certificateData: CertificateData = {
      donationId: donationData._id.toString(),
      donorName: donationData.donorName,
      donorPAN: donationData.donorPAN,
      donorEmail: donationData.donorEmail,
      donorPhone: donationData.donorPhone,
      donorAddress: donationData.donorAddress,
      donorCity: donationData.donorCity,
      donorState: donationData.donorState,
      donorPincode: donationData.donorPincode,
      amount: donationData.amount,
      currency: donationData.currency || 'INR',
      donationDate,
      campaignName,
      programName,
      certificateNumber,
      financialYear
    }

    // Only send separate email/SMS if not being handled by main notification service
    if (!skipEmailSending) {
      const receiptPrefs = donationData.receiptPreferences || { email: true }

      if (receiptPrefs.email) {
        await this.send80GCertificateByEmail(certificateData)
      }

      if (receiptPrefs.sms && certificateData.donorPhone) {
        await this.send80GCertificateBySMS(certificateData)
      }
    }

    return { certificateNumber, financialYear, sequenceNumber }
  }
}

export const receipt80GService = Receipt80GService