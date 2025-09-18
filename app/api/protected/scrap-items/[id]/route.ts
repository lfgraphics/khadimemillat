import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import ScrapItem from '@/models/ScrapItem'
import { uploadImage } from '@/lib/cloudinary-server'

// PATCH: update scrap item (after photos, condition, marketplaceListing, repairingCost, sold state)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB()
    const { id } = await params
    const json = await req.json()
    const update: any = {}

    if (json.condition) update.condition = json.condition
    if (typeof json.repairingCost === 'number') update.repairingCost = json.repairingCost
    if (json.marketplaceListing) {
      update['marketplaceListing.listed'] = !!json.marketplaceListing.listed
      if (typeof json.marketplaceListing.demandedPrice === 'number') update['marketplaceListing.demandedPrice'] = json.marketplaceListing.demandedPrice
      if (typeof json.marketplaceListing.salePrice === 'number') update['marketplaceListing.salePrice'] = json.marketplaceListing.salePrice
      if (typeof json.marketplaceListing.sold === 'boolean') update['marketplaceListing.sold'] = json.marketplaceListing.sold
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

    const updated = await ScrapItem.findByIdAndUpdate(id, { $set: update }, { new: true }).lean()
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ success: true, item: updated })
  } catch (e: any) {
    console.error('[SCRAP_ITEM_PATCH_ERROR]', e)
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}