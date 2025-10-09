import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@clerk/nextjs/server'
import { completePurchase } from '@/lib/services/purchase.service'
import { sendSystemMessage } from '@/lib/services/conversation.service'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { sessionClaims } = getAuth(req) as any
    const userId = sessionClaims?.sub
    const role = sessionClaims?.metadata?.role
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (role !== 'admin' && role !== 'moderator') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const { razorpayPaymentId, razorpaySignature } = body || {}
    const purchase = await completePurchase({ purchaseId: id, razorpayPaymentId, razorpaySignature, completedBy: userId })
    if (purchase.conversationId) {
      await sendSystemMessage({ conversationId: purchase.conversationId.toString(), content: 'Purchase completed. Item has been sold.' })
    }
    return NextResponse.json({ success: true, purchase })
  } catch (e: any) {
    console.error('[PURCHASE_COMPLETE]', e)
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
