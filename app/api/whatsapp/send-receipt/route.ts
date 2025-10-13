import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { resendDonationReceiptWhatsApp, send80GCertificateWhatsApp } from '@/lib/services/donation-notification.service'
import connectDB from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const body = await request.json()
    const { donationId, phoneNumber, type = 'receipt' } = body

    // Validate required fields
    if (!donationId || !phoneNumber) {
      return NextResponse.json(
        { error: 'Missing required fields: donationId, phoneNumber' },
        { status: 400 }
      )
    }

    // Validate phone number format
    if (!/^\+?[\d\s-()]+$/.test(phoneNumber)) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      )
    }

    let result

    if (type === '80g' || type === 'certificate') {
      // Send 80G certificate
      result = await send80GCertificateWhatsApp(donationId, phoneNumber)
    } else {
      // Send regular receipt (default)
      result = await resendDonationReceiptWhatsApp(donationId, phoneNumber)
    }

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `${type === '80g' ? '80G certificate' : 'Receipt'} sent successfully via WhatsApp`,
        messageId: result.messageId
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to send via WhatsApp'
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error sending WhatsApp receipt:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}

// GET endpoint to check WhatsApp service status
export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if WhatsApp service is configured
    const isConfigured = !!(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID)
    const provider = process.env.WHATSAPP_ACCESS_TOKEN?.startsWith('eyJ') ? 'AiSensy' : 'Meta'

    return NextResponse.json({
      configured: isConfigured,
      provider: isConfigured ? provider : null,
      features: {
        textMessages: true,
        images: true,
        documents: true,
        receiptImages: true,
        bulkMessages: true
      }
    })
  } catch (error) {
    console.error('Error checking WhatsApp status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}