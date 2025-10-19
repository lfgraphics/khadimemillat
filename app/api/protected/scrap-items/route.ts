import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import ScrapItem from '@/models/ScrapItem'
import DonationEntry from '@/models/DonationEntry'
import { getAuth } from '@clerk/nextjs/server'

// GET: List scrap items with filtering and pagination
export async function GET(req: NextRequest) {
  try {
    await connectDB()
    const { sessionClaims }: any = getAuth(req)
    const role = sessionClaims?.metadata?.role as string | undefined
    
    if (role !== 'admin' && role !== 'moderator') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const url = new URL(req.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    // Filters
    const condition = url.searchParams.get('condition')
    const listed = url.searchParams.get('listed')
    const sold = url.searchParams.get('sold')
    const donationEntryId = url.searchParams.get('donationEntryId')
    const search = url.searchParams.get('search')

    // Build filter query
    const filter: any = {}
    
    if (condition) filter.condition = condition
    if (listed === 'true') filter['marketplaceListing.listed'] = true
    if (listed === 'false') filter['marketplaceListing.listed'] = false
    if (sold === 'true') filter['marketplaceListing.sold'] = true
    if (sold === 'false') filter['marketplaceListing.sold'] = false
    if (donationEntryId) filter.scrapEntry = donationEntryId

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { _id: { $regex: search, $options: 'i' } }
      ]
    }

    // Get items with donation entry details
    const items = await ScrapItem.find(filter)
      .populate({
        path: 'scrapEntry',
        model: DonationEntry,
        select: 'collectionRequestId donor donorDetails createdAt'
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    const total = await ScrapItem.countDocuments(filter)

    return NextResponse.json({
      success: true,
      items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error: any) {
    console.error('[SCRAP_ITEMS_GET_ERROR]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: Create new scrap item
export async function POST(req: NextRequest) {
  try {
    await connectDB()
    const { sessionClaims }: any = getAuth(req)
    const role = sessionClaims?.metadata?.role as string | undefined
    
    if (role !== 'admin' && role !== 'moderator') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const json = await req.json()
    const { scrapEntry, name, description, condition, quantity = 1, beforePhotos = [], afterPhotos = [] } = json

    if (!scrapEntry || !name || !condition) {
      return NextResponse.json({ 
        error: 'Missing required fields: scrapEntry, name, condition' 
      }, { status: 400 })
    }

    const item = new ScrapItem({
      scrapEntry,
      name: name.trim(),
      description: description?.trim(),
      condition,
      quantity: Math.max(1, quantity),
      availableQuantity: Math.max(1, quantity),
      photos: {
        before: beforePhotos,
        after: afterPhotos
      },
      marketplaceListing: {
        listed: false,
        sold: false
      }
    })

    await item.save()

    // Populate the donation entry details
    await item.populate({
      path: 'scrapEntry',
      model: DonationEntry,
      select: 'collectionRequestId donor donorDetails createdAt'
    })

    return NextResponse.json({
      success: true,
      item
    }, { status: 201 })
  } catch (error: any) {
    console.error('[SCRAP_ITEMS_POST_ERROR]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}