import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createCollectionRequest, listCollectionRequests } from '../../../../lib/services/collectionRequest.service'
import { createCollectionRequestSchema } from '../../../../lib/validators/collectionRequest.validator'
import { getClerkUserWithSupplementaryData } from '../../../../lib/services/user.service'

export async function GET(req: Request) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const url = new URL(req.url)
    const status = url.searchParams.get('status') || undefined
    let assignedTo = url.searchParams.get('assignedTo') || undefined // Clerk user ID
    const page = parseInt(url.searchParams.get('page') || '1', 10)

    if (assignedTo === 'self') assignedTo = clerkUserId

    const data = await listCollectionRequests({ status, assignedTo, page })

    // Enrich donor & assigned field executives with Clerk user data
    const enrichedItems = await Promise.all(data.items.map(async (item: any) => {
      const donorDetails = await getClerkUserWithSupplementaryData(item.donor)
      const assignedDetails = await Promise.all((item.assignedFieldExecutives || []).map((id: string) => getClerkUserWithSupplementaryData(id)))
      let collectedByDetails = null
      if (item.status === 'collected' || item.status === 'completed') {
        // Need to look into DonationEntry to see who collected (collectedBy) if exists
        try {
          const DonationEntryMod = (await import('@/models/DonationEntry')).default as any
          const donationEntry = await DonationEntryMod.findOne({ collectionRequest: item._id }).lean()
          if (donationEntry?.collectedBy) {
            try { collectedByDetails = await getClerkUserWithSupplementaryData(donationEntry.collectedBy) } catch {}
          }
        } catch (e) {
          console.warn('[ENRICH_COLLECTED_BY_FAIL]', e)
        }
      }
      return { ...item, donorDetails, assignedDetails, collectedByDetails }
    }))

    return NextResponse.json({ ...data, items: enrichedItems })
  } catch (e) {
    console.error('[COLLECTION_REQUESTS_GET_ERROR]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { userId: clerkUserId } = await auth()
    const json = await req.json()
    const parsed = createCollectionRequestSchema.safeParse(json)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    let donorClerkId = clerkUserId

    // Handle guest users (not authenticated)
    if (!clerkUserId) {
      // For guest users, just use name - no account creation needed
      if (!json.name) {
        return NextResponse.json({
          error: 'Name is required for guest users'
        }, { status: 400 })
      }

      // Generate a simple guest identifier without creating a user record
      donorClerkId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    } else {
      // For authenticated users, allow admins/moderators to create on behalf of a donor
      donorClerkId = parsed.data.donor || clerkUserId
      // If donor looks like a Mongo ObjectId, resolve it to Clerk ID
      if (/^[a-fA-F0-9]{24}$/.test(donorClerkId)) {
        try {
          const UserModel = (await import('@/models/User')).default as any
          const m = await UserModel.findById(donorClerkId).lean()
          if (m?.clerkUserId) donorClerkId = m.clerkUserId
        } catch (e) { /* ignore and keep original */ }
      }
    }

    const created = await createCollectionRequest({
      donor: donorClerkId,
      requestedPickupTime: parsed.data.requestedPickupTime ? new Date(parsed.data.requestedPickupTime) : undefined,
      address: parsed.data.address,
      phone: parsed.data.phone,
      notes: parsed.data.notes,
      currentLocation: parsed.data.currentLocation,
      images: json.images || [],
      // Include guest name if provided
      guestName: json.name || undefined
    } as any)

    // Enrich with donorDetails in response for convenience
    try {
      if (donorClerkId && !donorClerkId.startsWith('guest_')) {
        const { getClerkUserWithSupplementaryData } = await import('@/lib/services/user.service')
        const donorDetails = await getClerkUserWithSupplementaryData(donorClerkId)
        return NextResponse.json({ success: true, request: { ...created, donorDetails } })
      }
      return NextResponse.json({ success: true, request: created })
    } catch {
      return NextResponse.json({ success: true, request: created })
    }
  } catch (e) {
    console.error('[COLLECTION_REQUESTS_POST_ERROR]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
