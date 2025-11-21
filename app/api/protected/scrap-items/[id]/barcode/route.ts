import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@clerk/nextjs/server'
import connectDB from '@/lib/db'
import ScrapItem from '@/models/ScrapItem'
import DonationEntry from '@/models/DonationEntry'
import User from '@/models/User'
import { Types } from 'mongoose'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { sessionClaims } = getAuth(req) as any
    const role = sessionClaims?.metadata?.role
    if (!sessionClaims?.sub) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!['admin', 'moderator', 'field_executive'].includes(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (!Types.ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

    await connectDB()
    const item = await ScrapItem.findById(id).populate('scrapEntry').lean() as any
    if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 })

  const entry: any = item.scrapEntry ? await DonationEntry.findById(item.scrapEntry).lean() : null
    let donor: any = null
    if (entry?.donor) {
      donor = await User.findOne({ clerkUserId: entry.donor }).lean()
      donor = donor || { clerkUserId: entry.donor }
    }

    // donor's other donations/items
    const donorEntries = entry?.donor ? await DonationEntry.find({ donor: entry.donor }).lean() : []
    const entryIds = donorEntries.map(e => e._id)
    const donorItems = entryIds.length ? await ScrapItem.find({ scrapEntry: { $in: entryIds } }).select('name condition photos createdAt').lean() : []

    const stats = {
      totalDonations: donorEntries.length,
      totalItems: donorItems.length,
      firstDonationDate: donorEntries.length ? donorEntries[0].createdAt : null,
      lastDonationDate: donorEntries.length ? donorEntries[donorEntries.length - 1].createdAt : null
    }

    return NextResponse.json({
      item: {
        _id: item._id,
        name: item.name,
        condition: item.condition,
        photos: item.photos,
        marketplaceListing: item.marketplaceListing,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      },
      donor: donor ? { id: donor.clerkUserId, name: donor.name, email: donor.email, phone: donor.phone, address: donor.address } : null,
      donorStats: stats,
      donorOtherItems: donorItems.map((di: any) => ({ _id: di._id, name: di.name, condition: di.condition, photos: di.photos, donationDate: di.createdAt }))
    })
  } catch (e: any) {
    console.error('[BARCODE_LOOKUP]', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
