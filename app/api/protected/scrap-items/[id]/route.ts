import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import ScrapItem, { type IScrapItem } from '@/models/ScrapItem'
import { uploadImage } from '@/lib/cloudinary-server'
import { getAuth } from '@clerk/nextjs/server'
import { purchaseService } from '@/lib/services/purchase.service'
import { closeConversation } from '@/lib/services/conversation.service'
import Conversation from '@/models/Conversation'

// PATCH: update scrap item (after photos, condition, marketplaceListing, repairingCost, sold state)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB()
    const { id } = await params
    const json = await req.json()
    const update: any = {}
    const { sessionClaims }: any = getAuth(req)
    const role = sessionClaims?.metadata?.role as string | undefined
    if (role !== 'admin' && role !== 'moderator') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (typeof json.name === 'string' && json.name.trim()) update.name = json.name.trim()
    if (json.condition) update.condition = json.condition
    if (typeof json.repairingCost === 'number') update.repairingCost = json.repairingCost
    if (json.marketplaceListing) {
      update['marketplaceListing.listed'] = !!json.marketplaceListing.listed
      if (typeof json.marketplaceListing.demandedPrice === 'number') update['marketplaceListing.demandedPrice'] = json.marketplaceListing.demandedPrice
      // Do not set sale-related fields up-front when marking as sold=true; the purchase service will authoritatively set them
      if (json.marketplaceListing.sold === true) {
        // Skip setting marketplaceListing.salePrice and marketplaceListing.sold here
      } else {
        if (typeof json.marketplaceListing.salePrice === 'number') update['marketplaceListing.salePrice'] = json.marketplaceListing.salePrice
        if (typeof json.marketplaceListing.sold === 'boolean') update['marketplaceListing.sold'] = json.marketplaceListing.sold
      }

  // Enhanced sold workflow: delegate authoritative updates to purchase service; avoid duplicating here
  // Note: soldVia maps to payment method as follows:
  // - 'online' => paymentMethod 'online' (handled via Razorpay verification elsewhere)
  // - 'offline' or 'chat' => treated as offline completion via admin flow
      if (json.marketplaceListing.sold === true) {
        const sale = json.marketplaceListing
        if (typeof sale.salePrice !== 'number' || sale.salePrice <= 0) {
          return NextResponse.json({ error: 'Sale price is required and must be positive' }, { status: 400 })
        }
        if (sale.soldVia === 'chat' && !sale.conversationId) {
          return NextResponse.json({ error: 'conversationId is required when sold via chat' }, { status: 400 })
        }
        if (sale.soldVia === 'online') {
          return NextResponse.json({ error: 'Online sales must be completed via Razorpay checkout and verification' }, { status: 400 })
        }
        // Do not set sold fields directly here; handled by purchase service below based on soldVia
      }

      // No strict over-ask validation here; UI may warn. Only ensure positive price above.
    }

    // Handle after photo uploads (array of base64 strings or existing ids)
    if (Array.isArray(json.afterPhotos)) {
      const uploaded: string[] = []
      for (const ph of json.afterPhotos) {
        if (typeof ph === 'string' && ph.startsWith('data:')) {
          const up = await uploadImage(ph, { folder: 'kmwf/items/after' })
          uploaded.push(up.public_id)
        } else if (typeof ph === 'string') {
          uploaded.push(ph)
        }
      }
      update['photos.after'] = uploaded
    }

    // Handle before photo uploads/updates
    if (Array.isArray(json.beforePhotos)) {
      const uploaded: string[] = []
      for (const ph of json.beforePhotos) {
        if (typeof ph === 'string' && ph.startsWith('data:')) {
          const up = await uploadImage(ph, { folder: 'kmwf/items/before' })
          uploaded.push(up.public_id)
        } else if (typeof ph === 'string') {
          uploaded.push(ph)
        }
      }
      update['photos.before'] = uploaded
    }

    const updated = await ScrapItem.findByIdAndUpdate(id, { $set: update }, { new: true }).lean()
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    // Delegate sale handling based on soldVia
    if (json?.marketplaceListing?.sold === true) {
      try {
        const sale = json.marketplaceListing
        // Guard sale price does not exceed demandedPrice if set
        const itemForGuard = await ScrapItem.findById(id).lean()
        const demanded = (itemForGuard as unknown as { marketplaceListing?: { demandedPrice?: number } } | null)?.marketplaceListing?.demandedPrice
        if (typeof demanded === 'number' && sale.salePrice > demanded) {
          // Allow override but record note for audit
          update.notes = [
            ...(Array.isArray((itemForGuard as any)?.notes) ? (itemForGuard as any).notes : []),
            `Override: salePrice ${sale.salePrice} > demanded ${demanded} at ${new Date().toISOString()}`
          ]
        }
        if (sale.soldVia === 'offline') {
          await purchaseService.markItemSoldOffline({
            scrapItemId: id,
            salePrice: sale.salePrice,
            soldBy: (getAuth(req) as any)?.sessionClaims?.sub,
            buyerName: sale.soldToName,
            buyerId: sale.soldToUserId
          })
        } else if (sale.soldVia === 'chat') {
          // For chat-based offline finalization, validate buyer is in the conversation participants
          if (sale.conversationId) {
            const convo = await Conversation.findById(sale.conversationId).lean()
            if (!convo) {
              return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
            }
            const participants: string[] = (convo as any).participants || []
            const chatBuyerId: string = (convo as any).buyerId
            let buyerIdToUse: string | undefined = sale.soldToUserId
            let buyerNameToUse: string | undefined = sale.soldToName
            if (buyerIdToUse) {
              if (!participants.includes(buyerIdToUse)) {
                return NextResponse.json({ error: 'Provided buyer is not a participant in the conversation' }, { status: 400 })
              }
            } else {
              // Default to conversation buyer
              buyerIdToUse = chatBuyerId
            }
            // If buyer name not provided, attempt default label
            if (!buyerNameToUse) buyerNameToUse = 'Chat Buyer'
            await purchaseService.markItemSoldOffline({
              scrapItemId: id,
              salePrice: sale.salePrice,
              soldBy: (getAuth(req) as any)?.sessionClaims?.sub,
              buyerName: buyerNameToUse,
              buyerId: buyerIdToUse,
              conversationId: String((convo as any)._id)
            })
          }
        }
      } catch (err) {
        console.error('[CREATE_OFFLINE_PURCHASE_ERROR]', err)
      }
    }
    // Return latest item state from DB
    const fresh = await ScrapItem.findById(id).lean()
    return NextResponse.json({ success: true, item: fresh })
  } catch (e: any) {
    console.error('[SCRAP_ITEM_PATCH_ERROR]', e)
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}