import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import CampaignDonation from '@/models/CampaignDonation'

interface ReceiptData {
  donorName: string
  donorPAN?: string
  donorAddress?: string
  donorCity?: string
  donorState?: string
  donorPincode?: string
  amount: number
  currency: string
  receiptId: string
  certificateNumber?: string
  wants80G: boolean
  campaignName?: string
  programName?: string
  donationDate: string
  donationId: string
  razorpayPaymentId?: string
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ donationId: string }> }
) {
  try {
    await connectDB()
    
    const { donationId } = await context.params
    
    // Fetch donation details
    const donation = await CampaignDonation.findById(donationId)
      .populate('campaignId', 'name title')
      .populate('programId', 'title name')
      .lean()
    
    if (!donation) {
      return NextResponse.json({ error: 'Donation not found' }, { status: 404 })
    }

    const donationData = donation as any
    
    // Validate required data
    if (!donationData.donorName || !donationData.amount) {
      return NextResponse.json({ error: 'Invalid donation data' }, { status: 400 })
    }
    
    const campaignName = donationData.campaignId?.name || donationData.campaignId?.title
    const programName = donationData.programId?.title || donationData.programId?.name || 'General Donation'
    const donationDate = new Date(donationData.createdAt).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
    
    // Try Puppeteer first, fall back to SVG redirect
    try {
      // Dynamic import with error handling
      const puppeteer = await import('puppeteer').catch(() => null)
      
      if (!puppeteer) {
        throw new Error('Puppeteer not available')
      }

      // Simple Chrome executable detection
      const findChrome = () => {
        const fs = require('fs')
        const path = require('path')
        
        // Check environment variable first (if explicitly set)
        if (process.env.CHROME_EXECUTABLE_PATH && process.env.CHROME_EXECUTABLE_PATH.trim()) {
          if (fs.existsSync(process.env.CHROME_EXECUTABLE_PATH)) {
            return process.env.CHROME_EXECUTABLE_PATH
          }
        }

        // Try the two main serverless paths where Chrome gets installed
        const possiblePaths = [
          '/vercel/path0/.cache/puppeteer/chrome/linux-141.0.7390.76/chrome-linux64/chrome',
          path.join(process.cwd(), '.cache/puppeteer/chrome/linux-141.0.7390.76/chrome-linux64/chrome'),
        ]

        for (const chromePath of possiblePaths) {
          if (fs.existsSync(chromePath)) {
            console.log(`Found Chrome at: ${chromePath}`)
            return chromePath
          }
        }

        // Try Puppeteer's default
        try {
          const execPath = puppeteer.default.executablePath()
          if (fs.existsSync(execPath)) {
            return execPath
          }
        } catch (error) {
          console.log('Puppeteer executablePath() failed:', error instanceof Error ? error.message : String(error))
        }

        return null
      }

      const chromeExecutablePath = findChrome()
      
      if (!chromeExecutablePath) {
        // Try @sparticuz/chromium as fallback for serverless environments
        try {
          const chromium = await import('@sparticuz/chromium').catch(() => null)
          if (chromium) {
            console.log('Using @sparticuz/chromium as fallback')
            const browser = await puppeteer.default.launch({
              args: chromium.default.args,
              defaultViewport: { width: 1280, height: 720 },
              executablePath: await chromium.default.executablePath(),
              headless: true,
            })
            
            // Generate HTML for the receipt (simplified for image generation)
            const receiptHTML = generateReceiptImageHTML({
              donorName: donationData.donorName,
              donorPAN: donationData.donorPAN,
              donorAddress: donationData.donorAddress,
              donorCity: donationData.donorCity,
              donorState: donationData.donorState,
              donorPincode: donationData.donorPincode,
              amount: donationData.amount,
              currency: 'INR',
              receiptId: donationData._id.toString().slice(-8),
              certificateNumber: donationData.certificate80G?.certificateNumber,
              wants80G: donationData.wants80GReceipt || false,
              campaignName,
              programName,
              donationDate,
              donationId: donationData._id.toString(),
              razorpayPaymentId: donationData.razorpayPaymentId
            })

            const page = await browser.newPage()
            
            try {
              await page.setViewport({ width: 800, height: 1200, deviceScaleFactor: 2 })
              await page.setContent(receiptHTML, { 
                waitUntil: 'networkidle0',
                timeout: 15000
              })
              
              const imageBuffer = await page.screenshot({
                type: 'png',
                fullPage: true,
                omitBackground: false,
                encoding: 'binary'
              })
              
              await browser.close()

              // Ensure proper buffer handling and validate image
              const validImageBuffer = Buffer.isBuffer(imageBuffer) ? imageBuffer : Buffer.from(imageBuffer)
              
              // Validate that we have a proper PNG buffer
              if (validImageBuffer.length === 0) {
                throw new Error('Generated image buffer is empty')
              }
              
              // Check PNG signature (first 8 bytes should be PNG signature)
              const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])
              if (validImageBuffer.length >= 8 && !validImageBuffer.subarray(0, 8).equals(pngSignature)) {
                console.warn('Generated buffer does not have valid PNG signature')
              }

              // Return the image with proper headers
              return new NextResponse(new Uint8Array(validImageBuffer), {
                headers: {
                  'Content-Type': 'image/png',
                  'Content-Disposition': `attachment; filename="donation-receipt-${donationData._id.toString().slice(-8)}.png"`,
                  'Cache-Control': 'public, max-age=3600',
                  'Content-Length': validImageBuffer.length.toString()
                }
              })
            } catch (pageError) {
              await browser.close().catch(() => {})
              throw pageError
            }
          }
        } catch (chromiumError) {
          console.log('Chromium fallback failed:', chromiumError instanceof Error ? chromiumError.message : String(chromiumError))
        }
        
        throw new Error('No Chrome executable found. Searched common paths but Chrome is not available.')
      }

      console.log(`Using Chrome executable: ${chromeExecutablePath}`)
      
      // Launch browser with optimized settings for image generation
      const browser = await puppeteer.default.launch({
        headless: true,
        executablePath: chromeExecutablePath,
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-first-run',
          '--no-zygote',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--run-all-compositor-stages-before-draw',
          '--disable-background-timer-throttling',
          '--disable-renderer-backgrounding',
          '--disable-backgrounding-occluded-windows',
          '--disable-ipc-flooding-protection',
          '--single-process', // Important for serverless environments
          '--disable-extensions',
          '--disable-default-apps',
          '--disable-sync',
          '--no-default-browser-check',
          '--disable-translate',
          '--disable-plugins',
          '--disable-background-networking',
          '--disable-background-media',
          '--disable-client-side-phishing-detection',
          '--disable-component-update',
          '--disable-hang-monitor',
          '--disable-prompt-on-repost',
          '--disable-domain-reliability',
          '--disable-features=TranslateUI',
          '--disable-features=BlinkGenPropertyTrees'
        ],
        defaultViewport: null,
        ignoreDefaultArgs: ['--disable-extensions']
      })
      
      // Generate HTML for the receipt (simplified for image generation)
      const receiptHTML = generateReceiptImageHTML({
        donorName: donationData.donorName,
        donorPAN: donationData.donorPAN,
        donorAddress: donationData.donorAddress,
        donorCity: donationData.donorCity,
        donorState: donationData.donorState,
        donorPincode: donationData.donorPincode,
        amount: donationData.amount,
        currency: 'INR',
        receiptId: donationData._id.toString().slice(-8),
        certificateNumber: donationData.certificate80G?.certificateNumber,
        wants80G: donationData.wants80GReceipt || false,
        campaignName,
        programName,
        donationDate,
        donationId: donationData._id.toString(),
        razorpayPaymentId: donationData.razorpayPaymentId
      })

      const page = await browser.newPage()
      
      try {
        await page.setViewport({ width: 800, height: 1200, deviceScaleFactor: 2 })
        await page.setContent(receiptHTML, { 
          waitUntil: 'networkidle0',
          timeout: 15000
        })
        
        const imageBuffer = await page.screenshot({
          type: 'png',
          fullPage: true,
          omitBackground: false,
          // quality: 90,
          encoding: 'binary'
        })
        
        await browser.close()

        // Ensure proper buffer handling and validate image
        const validImageBuffer = Buffer.isBuffer(imageBuffer) ? imageBuffer : Buffer.from(imageBuffer)
        
        // Validate that we have a proper PNG buffer
        if (validImageBuffer.length === 0) {
          throw new Error('Generated image buffer is empty')
        }
        
        // Check PNG signature (first 8 bytes should be PNG signature)
        const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])
        if (validImageBuffer.length >= 8 && !validImageBuffer.subarray(0, 8).equals(pngSignature)) {
          console.warn('Generated buffer does not have valid PNG signature')
        }

        // Return the image with proper headers
        return new NextResponse(new Uint8Array(validImageBuffer), {
          headers: {
            'Content-Type': 'image/png',
            'Content-Disposition': `attachment; filename="donation-receipt-${donationData._id.toString().slice(-8)}.png"`,
            'Cache-Control': 'public, max-age=3600',
            'Content-Length': validImageBuffer.length.toString()
          }
        })
      } catch (pageError) {
        await browser.close().catch(() => {})
        throw pageError
      }
      
    } catch (puppeteerError) {
      console.log('Puppeteer failed, falling back to HTML receipt:', puppeteerError instanceof Error ? puppeteerError.message : String(puppeteerError))
      
      // Return error response instead of redirecting to SVG
      return NextResponse.json(
        { error: 'Failed to generate receipt image. Please try downloading as HTML.' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Error generating receipt image:', error)
    return NextResponse.json(
      { error: 'Failed to generate receipt image' },
      { status: 500 }
    )
  }
}

function generateReceiptHTML(data: ReceiptData): string {
  const amountInWords = numberToWords(data.amount)
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Donation Receipt</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    @media (prefers-color-scheme: dark) {
      body {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: linear-gradient(135deg, #374151 0%, #1f2937 100%);
        padding: 40px;
        min-height: 100vh;
        line-height: 1.5;
      }
      
      .receipt-container {
        background: #111827;
        max-width: 700px;
        margin: 0 auto;
        border-radius: 20px;
        box-shadow: 0 25px 50px rgba(0,0,0,0.5);
        overflow: hidden;
        border: 1px solid #374151;
      }
      
      .header {
        background: linear-gradient(135deg, #1e40af, #1e3a8a);
        color: white;
        padding: 40px;
        position: relative;
        display: flex;
        align-items: flex-end;
        gap: 20px;
        border-bottom: 3px solid #10b981;
      }
      
      .header::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: linear-gradient(90deg, #10b981, #059669, #047857);
      }
      
      .logo-section {
        flex-shrink: 0;
      }
      
      .logo {
        width: 80px;
        height: 80px;
        background: rgba(255,255,255,0.2);
        border: 2px solid rgba(255,255,255,0.4);
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 32px;
        font-weight: 800;
        backdrop-filter: blur(10px);
        box-shadow: 0 8px 25px rgba(0,0,0,0.2);
      }
      
      .org-info {
        flex: 1;
      }
      
      .org-name {
        font-size: 24px;
        font-weight: 700;
        opacity: 0.98;
        margin-bottom: 8px;
        letter-spacing: -0.5px;
        line-height: 1.2;
      }
      
      .org-tagline {
        font-size: 14px;
        opacity: 0.85;
        font-weight: 400;
      }
      
      .receipt-type {
        background: linear-gradient(135deg, #059669, #047857);
        color: white;
        padding: 6px 16px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
        display: inline-block;
      }
      
      .content {
        padding: 48px 40px;
        background: #111827;
      }
      
      .success-section {
        text-align: center;
        margin-bottom: 40px;
      }
      
      .success-icon {
        width: 80px;
        height: 80px;
        background: linear-gradient(135deg, #10b981, #059669);
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 36px;
        font-weight: bold;
        margin-bottom: 20px;
        box-shadow: 0 8px 25px rgba(16, 185, 129, 0.3);
      }
      
      .success-text {
        font-size: 28px;
        font-weight: 700;
        color: #f3f4f6;
        margin-bottom: 8px;
        letter-spacing: -0.5px;
      }
      
      .success-subtext {
        color: #9ca3af;
        font-size: 16px;
        font-weight: 500;
      }
      
      .amount-highlight {
        background: linear-gradient(135deg, #1e3a8a, #1e40af);
        border: 2px solid #3b82f6;
        border-radius: 16px;
        padding: 24px;
        margin-bottom: 32px;
        text-align: center;
      }
      
      .amount-label {
        color: #93c5fd;
        font-size: 14px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 1px;
        margin-bottom: 8px;
      }
      
      .amount-value {
        font-size: 36px;
        font-weight: 800;
        color: #60a5fa;
        margin-bottom: 4px;
        letter-spacing: -1px;
      }
      
      .amount-words {
        color: #93c5fd;
        font-size: 14px;
        font-weight: 500;
        font-style: italic;
      }
      
      .details-grid {
        display: grid;
        gap: 20px;
        margin-bottom: 32px;
      }
      
      .detail-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 18px 0;
        border-bottom: 2px solid #374151;
      }
      
      .detail-row:last-child {
        border-bottom: none;
      }
      
      .detail-label {
        color: #9ca3af;
        font-weight: 600;
        font-size: 15px;
      }
      
      .detail-value {
        font-weight: 600;
        color: #f3f4f6;
        font-size: 15px;
        text-align: right;
      }
      
      .receipt-id {
        font-family: 'Courier New', monospace;
        background: #374151;
        padding: 4px 8px;
        border-radius: 6px;
        font-size: 13px;
        color: #d1d5db;
      }
      
      .certificate-section {
        background: linear-gradient(135deg, #451a03, #78350f);
        border: 3px solid #f59e0b;
        border-radius: 16px;
        padding: 28px;
        margin-bottom: 32px;
        position: relative;
        color: #fed7aa;
      }
      
      .certificate-section::before {
        content: '🏛️';
        position: absolute;
        top: -15px;
        left: 20px;
        background: #f59e0b;
        color: white;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
      }
      
      .certificate-title {
        color: #fed7aa;
        font-weight: 700;
        font-size: 18px;
        margin-bottom: 16px;
        padding-left: 8px;
      }
      
      .certificate-number {
        font-family: 'Courier New', monospace;
        font-size: 16px;
        font-weight: 700;
        color: #fbbf24;
        background: rgba(0,0,0,0.3);
        padding: 8px 12px;
        border-radius: 8px;
        display: inline-block;
      }
      
      .certificate-note {
        color: #fed7aa;
        font-size: 13px;
        font-weight: 500;
        margin-top: 12px;
        line-height: 1.4;
      }
      
      .cert-field-label {
        color: #fed7aa;
        font-size: 14px;
      }
      
      .cert-field-label-small {
        color: #fed7aa;
        font-size: 13px;
      }
      
      .cert-field-value {
        color: #fbbf24;
        font-weight: 600;
      }
      
      .footer {
        background: #1f2937;
        padding: 32px 40px;
        text-align: center;
        border-top: 3px solid #374151;
      }
      
      .footer-text {
        color: #9ca3af;
        font-size: 15px;
        font-weight: 500;
        line-height: 1.6;
        margin-bottom: 20px;
      }
      
      .organization-info {
        padding-top: 20px;
        border-top: 1px solid #374151;
      }
      
      .org-title {
        color: #f3f4f6;
        font-size: 18px;
        font-weight: 700;
        margin-bottom: 12px;
      }
      
      .org-details {
        color: #9ca3af;
        font-size: 13px;
        font-weight: 500;
        line-height: 1.6;
      }
      
      .verification-section {
        background: linear-gradient(135deg, #14532d, #166534);
        border: 2px solid #22c55e;
        border-radius: 12px;
        padding: 20px;
        margin-top: 24px;
        color: #dcfce7;
      }
      
      .verification-title {
        color: #86efac;
        font-weight: 700;
        font-size: 14px;
        margin-bottom: 8px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .verification-text {
        color: #dcfce7;
        font-size: 12px;
        font-weight: 500;
      }
    }
    
    @media (prefers-color-scheme: light) {
      body {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 40px;
        min-height: 100vh;
        line-height: 1.5;
      }
      
      .receipt-container {
        background: white;
        max-width: 700px;
        margin: 0 auto;
        border-radius: 20px;
        box-shadow: 0 25px 50px rgba(0,0,0,0.15);
        overflow: hidden;
      }
      
      .header {
        background: linear-gradient(135deg, #2563eb, #1d4ed8);
        color: white;
        padding: 40px;
        text-align: center;
        position: relative;
      }
      
      .header::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: linear-gradient(90deg, #10b981, #059669, #047857);
      }
      
      .logo {
        font-size: 32px;
        font-weight: 800;
        margin-bottom: 12px;
        letter-spacing: -0.5px;
      }
      
      .org-name {
        font-size: 20px;
        font-weight: 500;
        opacity: 0.95;
        margin-bottom: 20px;
        letter-spacing: 0.5px;
      }
      
      .receipt-title {
        background: rgba(255,255,255,0.25);
        padding: 14px 28px;
        border-radius: 30px;
        display: inline-block;
        font-size: 16px;
        font-weight: 600;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255,255,255,0.2);
      }
      
      .content {
        padding: 48px 40px;
      }
      
      .success-section {
        text-align: center;
        margin-bottom: 40px;
      }
      
      .success-icon {
        width: 80px;
        height: 80px;
        background: linear-gradient(135deg, #10b981, #059669);
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 36px;
        font-weight: bold;
        margin-bottom: 20px;
        box-shadow: 0 8px 25px rgba(16, 185, 129, 0.3);
      }
      
      .success-text {
        font-size: 28px;
        font-weight: 700;
        color: #1f2937;
        margin-bottom: 8px;
        letter-spacing: -0.5px;
      }
      
      .success-subtext {
        color: #6b7280;
        font-size: 16px;
        font-weight: 500;
      }
      
      .amount-highlight {
        background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
        border: 2px solid #0284c7;
        border-radius: 16px;
        padding: 24px;
        margin-bottom: 32px;
        text-align: center;
      }
      
      .amount-label {
        color: #0369a1;
        font-size: 14px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 1px;
        margin-bottom: 8px;
      }
      
      .amount-value {
        font-size: 36px;
        font-weight: 800;
        color: #0284c7;
        margin-bottom: 4px;
        letter-spacing: -1px;
      }
      
      .amount-words {
        color: #0369a1;
        font-size: 14px;
        font-weight: 500;
        font-style: italic;
      }
      
      .details-grid {
        display: grid;
        gap: 20px;
        margin-bottom: 32px;
      }
      
      .detail-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 18px 0;
        border-bottom: 2px solid #f1f5f9;
      }
      
      .detail-row:last-child {
        border-bottom: none;
      }
      
      .detail-label {
        color: #64748b;
        font-weight: 600;
        font-size: 15px;
      }
      
      .detail-value {
        font-weight: 600;
        color: #1e293b;
        font-size: 15px;
        text-align: right;
      }
      
      .receipt-id {
        font-family: 'Courier New', monospace;
        background: #f1f5f9;
        padding: 4px 8px;
        border-radius: 6px;
        font-size: 13px;
      }
      
      .certificate-section {
        background: linear-gradient(135deg, #fef3c7, #fde68a);
        border: 3px solid #f59e0b;
        border-radius: 16px;
        padding: 28px;
        margin-bottom: 32px;
        position: relative;
      }
      
      .certificate-section::before {
        content: '🏛️';
        position: absolute;
        top: -15px;
        left: 20px;
        background: #f59e0b;
        color: white;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
      }
      
      .certificate-title {
        color: #92400e;
        font-weight: 700;
        font-size: 18px;
        margin-bottom: 16px;
        padding-left: 8px;
      }
      
      .certificate-number {
        font-family: 'Courier New', monospace;
        font-size: 16px;
        font-weight: 700;
        color: #92400e;
        background: rgba(255,255,255,0.7);
        padding: 8px 12px;
        border-radius: 8px;
        display: inline-block;
      }
      
      .certificate-note {
        color: #92400e;
        font-size: 13px;
        font-weight: 500;
        margin-top: 12px;
        line-height: 1.4;
      }
      
      .cert-field-label {
        color: #92400e;
        font-size: 14px;
      }
      
      .cert-field-label-small {
        color: #92400e;
        font-size: 13px;
      }
      
      .cert-field-value {
        color: #92400e;
        font-weight: 600;
      }
      
      .footer {
        background: #f8fafc;
        padding: 32px 40px;
        text-align: center;
        border-top: 3px solid #e2e8f0;
      }
      
      .footer-text {
        color: #64748b;
        font-size: 15px;
        font-weight: 500;
        line-height: 1.6;
        margin-bottom: 20px;
      }
      
      .organization-info {
        padding-top: 20px;
        border-top: 1px solid #e2e8f0;
      }
      
      .org-title {
        color: #1e293b;
        font-size: 18px;
        font-weight: 700;
        margin-bottom: 12px;
      }
      
      .org-details {
        color: #64748b;
        font-size: 13px;
        font-weight: 500;
        line-height: 1.6;
      }
      
      .verification-section {
        background: linear-gradient(135deg, #f0fdf4, #dcfce7);
        border: 2px solid #22c55e;
        border-radius: 12px;
        padding: 20px;
        margin-top: 24px;
      }
      
      .verification-title {
        color: #15803d;
        font-weight: 700;
        font-size: 14px;
        margin-bottom: 8px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .verification-text {
        color: #166534;
        font-size: 12px;
        font-weight: 500;
      }
    }
  </style>
      margin-bottom: 20px;
      letter-spacing: 0.5px;
    }
    
    .receipt-title {
      background: rgba(255,255,255,0.25);
      padding: 14px 28px;
      border-radius: 30px;
      display: inline-block;
      font-size: 16px;
      font-weight: 600;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255,255,255,0.2);
    }
    
    .content {
      padding: 48px 40px;
    }
    
    .success-section {
      text-align: center;
      margin-bottom: 40px;
    }
    
    .success-icon {
      width: 80px;
      height: 80px;
      background: linear-gradient(135deg, #10b981, #059669);
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 36px;
      font-weight: bold;
      margin-bottom: 20px;
      box-shadow: 0 8px 25px rgba(16, 185, 129, 0.3);
    }
    
    .success-text {
      font-size: 28px;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 8px;
      letter-spacing: -0.5px;
    }
    
    .success-subtext {
      color: #6b7280;
      font-size: 16px;
      font-weight: 500;
    }
    
    .amount-highlight {
      background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
      border: 2px solid #0284c7;
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 32px;
      text-align: center;
    }
    
    .amount-label {
      color: #0369a1;
      font-size: 14px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 8px;
    }
    
    .amount-value {
      font-size: 36px;
      font-weight: 800;
      color: #0284c7;
      margin-bottom: 4px;
      letter-spacing: -1px;
    }
    
    .amount-words {
      color: #0369a1;
      font-size: 14px;
      font-weight: 500;
      font-style: italic;
    }
    
    .details-grid {
      display: grid;
      gap: 20px;
      margin-bottom: 32px;
    }
    
    .detail-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 18px 0;
      border-bottom: 2px solid #f1f5f9;
    }
    
    .detail-row:last-child {
      border-bottom: none;
    }
    
    .detail-label {
      color: #64748b;
      font-weight: 600;
      font-size: 15px;
    }
    
    .detail-value {
      font-weight: 600;
      color: #1e293b;
      font-size: 15px;
      text-align: right;
    }
    
    .receipt-id {
      font-family: 'Courier New', monospace;
      background: #f1f5f9;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 13px;
    }
    
    .certificate-section {
      background: linear-gradient(135deg, #fef3c7, #fde68a);
      border: 3px solid #f59e0b;
      border-radius: 16px;
      padding: 28px;
      margin-bottom: 32px;
      position: relative;
    }
    
    .certificate-section::before {
      content: '🏛️';
      position: absolute;
      top: -15px;
      left: 20px;
      background: #f59e0b;
      color: white;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
    }
    
    .certificate-title {
      color: #92400e;
      font-weight: 700;
      font-size: 18px;
      margin-bottom: 16px;
      padding-left: 8px;
    }
    
    .certificate-number {
      font-family: 'Courier New', monospace;
      font-size: 16px;
      font-weight: 700;
      color: #92400e;
      background: rgba(255,255,255,0.7);
      padding: 8px 12px;
      border-radius: 8px;
      display: inline-block;
    }
    
    .certificate-note {
      color: #92400e;
      font-size: 13px;
      font-weight: 500;
      margin-top: 12px;
      line-height: 1.4;
    }
    
    .footer {
      background: #f8fafc;
      padding: 32px 40px;
      text-align: center;
      border-top: 3px solid #e2e8f0;
    }
    
    .footer-text {
      color: #64748b;
      font-size: 15px;
      font-weight: 500;
      line-height: 1.6;
      margin-bottom: 20px;
    }
    
    .organization-info {
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
    }
    
    .org-title {
      color: #1e293b;
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 12px;
    }
    
    .org-details {
      color: #64748b;
      font-size: 13px;
      font-weight: 500;
      line-height: 1.6;
    }
    
    .verification-section {
      background: linear-gradient(135deg, #f0fdf4, #dcfce7);
      border: 2px solid #22c55e;
      border-radius: 12px;
      padding: 20px;
      margin-top: 24px;
    }
    
    .verification-title {
      color: #15803d;
      font-weight: 700;
      font-size: 14px;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .verification-text {
      color: #166534;
      font-size: 12px;
      font-weight: 500;
    }
  </style>
</head>
<body>
  <div class="receipt-container">
    <div class="header">
      <div class="logo-section">
        <div class="logo">KM</div>
      </div>
      <div class="org-info">
        <div class="org-name">Khadim-e-Millat<br>Welfare Foundation</div>
        <div class="org-tagline">Serving humanity with compassion and care</div>
      </div>
      <div class="receipt-type">${data.wants80G ? '🏛️ Tax Deductible Receipt' : '📄 Donation Receipt'}</div>
    </div>
    
    <div class="content">
      <div class="success-section">
        <div class="success-icon">✓</div>
        <div class="success-text">Donation Successful!</div>
        <div class="success-subtext">Jazakallahu Khairan for your generous contribution</div>
      </div>
      
      <div class="amount-highlight">
        <div class="amount-label">Donation Amount</div>
        <div class="amount-value">${data.currency} ${data.amount.toLocaleString('en-IN')}</div>
        <div class="amount-words">${amountInWords} Only</div>
      </div>
      
      <div class="details-grid">
        <div class="detail-row">
          <span class="detail-label">Donor Name</span>
          <span class="detail-value">${data.donorName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Program</span>
          <span class="detail-value">${data.programName}</span>
        </div>
        ${data.campaignName ? `
        <div class="detail-row">
          <span class="detail-label">Campaign</span>
          <span class="detail-value">${data.campaignName}</span>
        </div>
        ` : ''}
        <div class="detail-row">
          <span class="detail-label">Date</span>
          <span class="detail-value">${data.donationDate}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Receipt ID</span>
          <span class="detail-value">
            <span class="receipt-id">${data.receiptId}</span>
          </span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Transaction ID</span>
          <span class="detail-value">
            <span class="receipt-id">${data.razorpayPaymentId || data.donationId.slice(-8)}</span>
          </span>
        </div>
      </div>
      
      ${data.wants80G && data.certificateNumber ? `
      <div class="certificate-section">
        <div class="certificate-title">🏛️ 80G Tax Exemption Certificate</div>
        <div style="margin-bottom: 12px;">
          <strong class="cert-field-label">Certificate Number:</strong><br>
          <span class="certificate-number">${data.certificateNumber}</span>
        </div>
        <div style="margin-bottom: 12px;">
          <strong class="cert-field-label-small">Financial Year:</strong> 
          <span class="cert-field-value">${data.certificateNumber.includes('-') ? data.certificateNumber.split('-')[2] + '-' + data.certificateNumber.split('-')[3] : 'Current'}</span>
        </div>
        <div class="certificate-note">
          This certificate is issued under Section 80G of the Income Tax Act, 1961. 
          Certificate Number format: KMWF-80G-{FY}-{Sequence}. Keep this certificate for your records and tax filing purposes.
          <br><br>
          <strong>Organization Details:</strong><br>
          • Name: Khadim-e-Millat Welfare Foundation<br>
          • 80G Registration: Valid under Income Tax Act, 1961<br>
          • This receipt is eligible for tax deduction under Section 80G
        </div>
      </div>
      ` : ''}
    </div>
    
    <div class="footer">
      <div class="footer-text">
        Thank you for your generous donation. Your contribution helps us serve those in need and make a positive impact in our community.
      </div>
      
      <div class="organization-info">
        <div class="org-title">Khadim-e-Millat Welfare Foundation</div>
        <div class="org-details">
          Registered Charity Organization<br>
          80G Registration: Valid as per Income Tax Act, 1961<br>
          PAN: AABCK1234E | Email: support@khadimemillat.org<br>
          <br>
          <strong>Certificate Numbering System:</strong><br>
          Format: KMWF-80G-{Financial Year}-{Sequential Number}<br>
          All certificates are sequentially numbered for audit compliance
        </div>
        
        <div class="verification-section">
          <div class="verification-title">Receipt Verification</div>
          <div class="verification-text">
            This is a computer-generated receipt. For verification, please contact us with Receipt ID: ${data.receiptId}<br>
            ${data.certificateNumber ? `Certificate Number: ${data.certificateNumber}` : ''}
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
  `
}

// Helper function to convert numbers to words (Indian format)
function numberToWords(amount: number): string {
  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine']
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

  function convertHundreds(num: number): string {
    let result = ''
    
    if (num >= 100) {
      result += units[Math.floor(num / 100)] + ' Hundred '
      num %= 100
    }
    
    if (num >= 20) {
      result += tens[Math.floor(num / 10)] + ' '
      num %= 10
    } else if (num >= 10) {
      result += teens[num - 10] + ' '
      return result.trim()
    }
    
    if (num > 0) {
      result += units[num] + ' '
    }
    
    return result.trim()
  }

  if (amount === 0) return 'Zero'
  
  let crores = Math.floor(amount / 10000000)
  amount %= 10000000
  let lakhs = Math.floor(amount / 100000)
  amount %= 100000
  let thousands = Math.floor(amount / 1000)
  amount %= 1000
  let hundreds = amount

  let result = ''
  
  if (crores > 0) {
    result += convertHundreds(crores) + ' Crore '
  }
  
  if (lakhs > 0) {
    result += convertHundreds(lakhs) + ' Lakh '
  }
  
  if (thousands > 0) {
    result += convertHundreds(thousands) + ' Thousand '
  }
  
  if (hundreds > 0) {
    result += convertHundreds(hundreds) + ' '
  }
  
  return result.trim() + ' Rupees'
}

function generateReceiptImageHTML(data: ReceiptData): string {
  const amountInWords = numberToWords(data.amount)
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Donation Receipt</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px;
      min-height: 100vh;
      line-height: 1.5;
    }
    
    .receipt-container {
      background: white;
      max-width: 700px;
      margin: 0 auto;
      border-radius: 20px;
      box-shadow: 0 25px 50px rgba(0,0,0,0.15);
      overflow: hidden;
    }
    
    .header {
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      color: white;
      padding: 40px;
      text-align: center;
      position: relative;
    }
    
    .header::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, #10b981, #059669, #047857);
    }
    
    .logo {
      font-size: 32px;
      font-weight: 800;
      margin-bottom: 12px;
      letter-spacing: -0.5px;
    }
    
    .org-name {
      font-size: 20px;
      font-weight: 500;
      opacity: 0.95;
      margin-bottom: 20px;
      letter-spacing: 0.5px;
    }
    
    .receipt-title {
      background: rgba(255,255,255,0.25);
      padding: 14px 28px;
      border-radius: 30px;
      display: inline-block;
      font-size: 16px;
      font-weight: 600;
      border: 1px solid rgba(255,255,255,0.2);
    }
    
    .content {
      padding: 48px 40px;
    }
    
    .success-section {
      text-align: center;
      margin-bottom: 40px;
    }
    
    .success-icon {
      width: 80px;
      height: 80px;
      background: linear-gradient(135deg, #10b981, #059669);
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 36px;
      font-weight: bold;
      margin-bottom: 20px;
      box-shadow: 0 8px 25px rgba(16, 185, 129, 0.3);
    }
    
    .success-text {
      font-size: 28px;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 8px;
      letter-spacing: -0.5px;
    }
    
    .success-subtext {
      color: #6b7280;
      font-size: 16px;
      font-weight: 500;
    }
    
    .amount-highlight {
      background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
      border: 2px solid #0284c7;
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 32px;
      text-align: center;
    }
    
    .amount-label {
      color: #0369a1;
      font-size: 14px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 8px;
    }
    
    .amount-value {
      font-size: 36px;
      font-weight: 800;
      color: #0284c7;
      margin-bottom: 4px;
      letter-spacing: -1px;
    }
    
    .amount-words {
      color: #0369a1;
      font-size: 14px;
      font-weight: 500;
      font-style: italic;
    }
    
    .details-grid {
      display: grid;
      gap: 20px;
      margin-bottom: 32px;
    }
    
    .detail-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 18px 0;
      border-bottom: 2px solid #f1f5f9;
    }
    
    .detail-row:last-child {
      border-bottom: none;
    }
    
    .detail-label {
      color: #64748b;
      font-weight: 600;
      font-size: 15px;
    }
    
    .detail-value {
      font-weight: 600;
      color: #1e293b;
      font-size: 15px;
      text-align: right;
    }
    
    .receipt-id {
      font-family: 'Courier New', monospace;
      background: #f1f5f9;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 13px;
    }
    
    .certificate-section {
      background: linear-gradient(135deg, #fef3c7, #fde68a);
      border: 3px solid #f59e0b;
      border-radius: 16px;
      padding: 28px;
      margin-bottom: 32px;
      position: relative;
    }
    
    .certificate-section::before {
      content: '🏛️';
      position: absolute;
      top: -15px;
      left: 20px;
      background: #f59e0b;
      color: white;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
    }
    
    .certificate-title {
      color: #92400e;
      font-weight: 700;
      font-size: 18px;
      margin-bottom: 16px;
      padding-left: 8px;
    }
    
    .certificate-number {
      font-family: 'Courier New', monospace;
      font-size: 16px;
      font-weight: 700;
      color: #92400e;
      background: rgba(255,255,255,0.7);
      padding: 8px 12px;
      border-radius: 8px;
      display: inline-block;
    }
    
    .certificate-note {
      color: #92400e;
      font-size: 13px;
      font-weight: 500;
      margin-top: 12px;
      line-height: 1.4;
    }
    
    .cert-field-label {
      color: #92400e;
      font-size: 14px;
    }
    
    .cert-field-value {
      color: #92400e;
      font-weight: 600;
    }
    
    .footer {
      background: #f8fafc;
      padding: 32px 40px;
      text-align: center;
      border-top: 3px solid #e2e8f0;
    }
    
    .footer-text {
      color: #64748b;
      font-size: 15px;
      font-weight: 500;
      line-height: 1.6;
      margin-bottom: 20px;
    }
    
    .organization-info {
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
    }
    
    .org-title {
      color: #1e293b;
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 12px;
    }
    
    .org-details {
      color: #64748b;
      font-size: 13px;
      font-weight: 500;
      line-height: 1.6;
    }
    
    .verification-section {
      background: linear-gradient(135deg, #f0fdf4, #dcfce7);
      border: 2px solid #22c55e;
      border-radius: 12px;
      padding: 20px;
      margin-top: 24px;
    }
    
    .verification-title {
      color: #15803d;
      font-weight: 700;
      font-size: 14px;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .verification-text {
      color: #166534;
      font-size: 12px;
      font-weight: 500;
    }
  </style>
</head>
<body>
  <div class="receipt-container">
    <div class="header">
      <div class="logo">
       <img src="https://www.khadimemillat.org/android-chrome-512x512.png" alt="KMWF Logo" style="width: 40px; height: 40px; border-radius: 8px; margin-bottom: 8px;">
      </div>
      <div class="org-name">Khadim-e-Millat Welfare Foundation</div>
      <div class="receipt-title">Donation Receipt</div>
    </div>
    
    <div class="content">
      <div class="success-section">
        <div class="success-icon">✓</div>
        <div class="success-text">Thank You!</div>
        <div class="success-subtext">Your donation has been received successfully.</div>
      </div>
      
      <div class="amount-highlight">
        <div class="amount-label">Total Donation Amount</div>
        <div class="amount-value">₹${data.amount.toLocaleString('en-IN')}</div>
        <div class="amount-words">${amountInWords}</div>
      </div>
      
      <div class="details-grid">
        <div class="detail-row">
          <span class="detail-label">Donor Name</span>
          <span class="detail-value">${data.donorName}</span>
        </div>
        
        <div class="detail-row">
          <span class="detail-label">Receipt ID</span>
          <span class="detail-value">
            <span class="receipt-id">${data.receiptId}</span>
          </span>
        </div>
        
        <div class="detail-row">
          <span class="detail-label">Donation Date</span>
          <span class="detail-value">${data.donationDate}</span>
        </div>
        
        ${data.campaignName ? `
        <div class="detail-row">
          <span class="detail-label">Campaign</span>
          <span class="detail-value">${data.campaignName}</span>
        </div>
        ` : ''}
        
        <div class="detail-row">
          <span class="detail-label">Program</span>
          <span class="detail-value">${data.programName}</span>
        </div>
        
        <div class="detail-row">
          <span class="detail-label">Payment Method</span>
          <span class="detail-value">Online Payment</span>
        </div>
      </div>
      
      ${data.wants80G && data.certificateNumber ? `
      <div class="certificate-section">
        <div class="certificate-title">80G Tax Exemption Certificate</div>
        <div class="detail-row">
          <span class="cert-field-label">Certificate Number</span>
          <span class="cert-field-value certificate-number">${data.certificateNumber}</span>
        </div>
        ${data.donorPAN ? `
        <div class="detail-row">
          <span class="cert-field-label">Donor PAN</span>
          <span class="cert-field-value">${data.donorPAN}</span>
        </div>
        ` : ''}
        ${data.donorAddress ? `
        <div class="detail-row">
          <span class="cert-field-label">Donor Address</span>
          <span class="cert-field-value">${data.donorAddress}${data.donorCity ? `, ${data.donorCity}` : ''}${data.donorState ? `, ${data.donorState}` : ''}${data.donorPincode ? ` - ${data.donorPincode}` : ''}</span>
        </div>
        ` : ''}
        <div class="certificate-note">
          This certificate is valid for claiming tax deduction under Section 80G of the Income Tax Act, 1961.
          Save this receipt for your tax filing records.
        </div>
      </div>
      ` : ''}
    </div>
    
    <div class="footer">
      <div class="footer-text">
        This is a computer-generated receipt. For any queries, please contact us.
      </div>
      
      <div class="organization-info">
        <div class="org-title">Khadim-e-Millat Welfare Foundation</div>
        <div class="org-details">
          Regd. under Indian Trust Act 1882 | 80G Approved by IT Department<br>
          <strong>PAN:</strong> AABCK1234E | <strong>80G Registration:</strong> AABCK1234EF20240001<br>
          <strong>80G Validity:</strong> 01/04/2024 to 31/03/2029<br>
          <strong>Address:</strong> 123 Main Street, Mumbai, Maharashtra - 400001<br>
          Email: contact@khadimemillat.org | Phone: +91-XXXXXXXXXX<br>
          Visit: www.khadimemillat.org
        </div>
      </div>
      
      <div class="verification-section">
        <div class="verification-title">Secure & Verified</div>
        <div class="verification-text">
          This receipt is digitally generated and verified. Receipt ID can be used to verify the authenticity of this donation.
        </div>
        <div style="margin-top: 15px; padding: 10px; background: rgba(59, 130, 246, 0.1); border-radius: 8px; border: 1px solid rgba(59, 130, 246, 0.3);">
          <div style="font-weight: 600; color: #3B82F6; margin-bottom: 5px;">📄 Access Your Donation Details</div>
          <div style="font-size: 12px; color: #374151;">
            Visit: <strong>${process.env.NEXT_PUBLIC_APP_URL || 'https://khadimemillat.org'}/thank-you?donationId=${data.donationId}</strong><br>
            Download receipts, verify status, and share donation proof
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
  `
}

