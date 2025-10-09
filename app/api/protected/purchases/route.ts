import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@clerk/nextjs/server'
import { getUserPurchases, markItemSoldOffline } from '@/lib/services/purchase.service'
import connectDB from '@/lib/db'
import Purchase from '@/models/Purchase'
const rl = new Map<string, { count: number; ts: number }>()
const WINDOW_MS = 60_000
const MAX_REQ = 20

export async function GET(req: NextRequest) {
  try {
    const { sessionClaims } = getAuth(req) as any
    const userId = sessionClaims?.sub
    const role = sessionClaims?.metadata?.role
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { searchParams } = new URL(req.url)
    const paymentId = searchParams.get('paymentId')
    if (paymentId) {
      if (role !== 'admin' && role !== 'moderator') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      // Basic rate limit per user for payment lookups
      const now = Date.now()
      const key = `pid:${userId}`
      const entry = rl.get(key)
      if (!entry || now - entry.ts > WINDOW_MS) {
        rl.set(key, { count: 1, ts: now })
      } else {
        if (entry.count >= MAX_REQ) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
        entry.count += 1
      }
      await connectDB()
      const purchases = await Purchase.find({ razorpayPaymentId: paymentId }).populate('scrapItemId')
      return NextResponse.json({ purchases })
    }
    const purchases = await getUserPurchases({ userId })
    return NextResponse.json({ purchases })
  } catch (e: any) {
    console.error('[PURCHASES_GET]', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { sessionClaims } = getAuth(req) as any
    const userId = sessionClaims?.sub
    const role = sessionClaims?.metadata?.role
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (role !== 'admin' && role !== 'moderator') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const { scrapItemId, salePrice, buyerName, buyerId, notes } = body || {}
    if (!scrapItemId || typeof salePrice !== 'number') return NextResponse.json({ error: 'scrapItemId and salePrice are required' }, { status: 400 })
    const purchase = await markItemSoldOffline({ scrapItemId, salePrice, soldBy: userId, buyerName, buyerId, notes })
    return NextResponse.json({ success: true, purchase })
  } catch (e: any) {
    console.error('[PURCHASES_POST]', e)
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
