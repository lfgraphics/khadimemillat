import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@clerk/nextjs/server'
import connectDB from '@/lib/db'
import Purchase from '@/models/Purchase'

export async function GET(req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    const { orderId } = await params
    const { sessionClaims } = getAuth(req) as any
    const userId = sessionClaims?.sub
    const role = sessionClaims?.metadata?.role
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (role !== 'admin' && role !== 'moderator') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    await connectDB()
    const purchase = await Purchase.findOne({ razorpayOrderId: orderId }).populate('scrapItemId')
    if (!purchase) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({
      purchase: {
        _id: purchase._id,
        scrapItemId: purchase.scrapItemId,
        buyerId: purchase.buyerId,
        buyerName: purchase.buyerName,
        buyerEmail: purchase.buyerEmail,
        buyerPhone: purchase.buyerPhone,
        salePrice: purchase.salePrice,
        paymentMethod: purchase.paymentMethod,
        status: purchase.status,
        razorpayOrderId: purchase.razorpayOrderId,
        razorpayPaymentId: purchase.razorpayPaymentId,
        paymentVerified: purchase.paymentVerified,
        completedAt: purchase.completedAt,
        createdAt: purchase.createdAt,
        updatedAt: purchase.updatedAt
      }
    })
  } catch (e: any) {
    console.error('[PURCHASE_BY_ORDER_GET]', e)
    return NextResponse.json({ error: e.message || 'Failed to fetch purchase' }, { status: 500 })
  }
}
