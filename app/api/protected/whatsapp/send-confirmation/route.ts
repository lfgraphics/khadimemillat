import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { whatsappService } from '@/lib/services/whatsapp.service'

export async function POST(req: Request) {
  try {
    const { userId, sessionClaims } = await auth()
    if (!userId) return new NextResponse('Unauthorized', { status: 401 })
    const role = (sessionClaims as any)?.metadata?.role || 'user'
    if (!['admin','moderator'].includes(role)) return new NextResponse('Forbidden', { status: 403 })
    const json = await req.json()
    // Minimal implementation: expect phone & type
    if (json.type === 'collection') {
      await whatsappService.sendCollectionConfirmation({ phone: json.phone, pickupTime: new Date(json.pickupTime) })
    } else if (json.type === 'listing') {
      await whatsappService.sendListingConfirmation({ phone: json.phone, items: json.items || [] })
    } else {
      return new NextResponse('Invalid type', { status: 400 })
    }
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error(e)
    return new NextResponse('Server error', { status: 500 })
  }
}
