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

    // Enrich donor & assigned scrappers with Clerk user data
    const enrichedItems = await Promise.all(data.items.map(async (item: any) => {
      const donorDetails = await getClerkUserWithSupplementaryData(item.donor)
      const assignedDetails = await Promise.all((item.assignedScrappers || []).map((id: string) => getClerkUserWithSupplementaryData(id)))
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
    if (!clerkUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const json = await req.json()
    const parsed = createCollectionRequestSchema.safeParse(json)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const created = await createCollectionRequest({
      donor: clerkUserId,
      requestedPickupTime: parsed.data.requestedPickupTime ? new Date(parsed.data.requestedPickupTime) : undefined,
      address: parsed.data.address,
      phone: parsed.data.phone,
      notes: parsed.data.notes
    } as any)
    return NextResponse.json({ success: true, request: created })
  } catch (e) {
    console.error('[COLLECTION_REQUESTS_POST_ERROR]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
