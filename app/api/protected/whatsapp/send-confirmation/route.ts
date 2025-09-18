import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'

const whatsappConfirmationSchema = z.object({
  phone: z.string().min(3),
  normalizedPhone: z.string().optional(),
  message: z.string().min(1),
  collectionRequestId: z.string().optional(),
  donationId: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    const { userId, sessionClaims } = await auth()
    if (!userId) return new NextResponse('Unauthorized', { status: 401 })

    const role = (sessionClaims as any)?.metadata?.role
    if (!['admin','moderator'].includes(role)) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    const body = await request.json()
    const parsed = whatsappConfirmationSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { phone, normalizedPhone, message, collectionRequestId, donationId } = parsed.data
    // Normalize if not provided
    const norm = normalizedPhone || phone.replace(/[^0-9]/g,'')

    console.log('[WHATSAPP_CONFIRMATION_SENT]', {
      sentBy: userId,
      phone,
      normalized: norm,
      message,
      collectionRequestId,
      donationId,
      timestamp: new Date().toISOString()
    })

    // Future: integrate WhatsApp Business API provider here

    return NextResponse.json({ success: true, message: 'WhatsApp confirmation logged successfully' })
  } catch (error) {
    console.error('WhatsApp confirmation error:', error)
    return NextResponse.json({ error: 'Failed to process WhatsApp confirmation' }, { status: 500 })
  }
}
