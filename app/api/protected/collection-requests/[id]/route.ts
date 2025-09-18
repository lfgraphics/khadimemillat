import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { assignScrappers, getCollectionRequestById, markAsCollected, updateCollectionRequest } from '../../../../../lib/services/collectionRequest.service'
import { notificationService } from '../../../../../lib/services/notification.service'
import { getClerkUserWithSupplementaryData } from '../../../../../lib/services/user.service'
import { assignScrappersSchema, updateCollectionRequestSchema } from '../../../../../lib/validators/collectionRequest.validator'

// Next.js 15 route handlers now provide context.params as a Promise in some edge/runtime configurations.
// Adjust signature to accept promised params for type compatibility, then await it internally.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth()
    const { id } = await params
    if (!userId) return new NextResponse('Unauthorized', { status: 401 })
    const doc: any = await getCollectionRequestById(id)
    if (!doc) return new NextResponse('Not found', { status: 404 })

    // Enrichment (mirror list endpoint behavior + donationEntryId extraction)
    let donorDetails = null
    let assignedDetails: any[] = []
    let collectedByDetails = null
    let donationEntryId: string | undefined
    try {
      donorDetails = await getClerkUserWithSupplementaryData(doc.donor)
    } catch (e) {
      console.warn('[ENRICH_SINGLE_DONOR_FAIL]', e)
    }
    if (Array.isArray(doc.assignedScrappers) && doc.assignedScrappers.length > 0) {
      assignedDetails = await Promise.all(doc.assignedScrappers.map((sid: string) => getClerkUserWithSupplementaryData(sid).catch(()=>null)))
    }
    if (doc.status === 'collected' || doc.status === 'completed') {
      try {
        const DonationEntryMod = (await import('@/models/DonationEntry')).default as any
        let donationEntry = null
        if (doc.donationEntryId) {
          donationEntry = await DonationEntryMod.findById(doc.donationEntryId).lean()
        }
        if (!donationEntry) {
          donationEntry = await DonationEntryMod.findOne({ collectionRequest: doc._id }).lean()
        }
        if (donationEntry) {
          donationEntryId = donationEntry._id.toString()
          if (donationEntry.collectedBy) {
            try { collectedByDetails = await getClerkUserWithSupplementaryData(donationEntry.collectedBy) } catch {}
          }
        }
      } catch (e) {
        console.warn('[ENRICH_SINGLE_DONATION_LOOKUP_FAIL]', e)
      }
    }
    return NextResponse.json({ request: { ...doc, donorDetails, assignedDetails, collectedByDetails, donationEntryId } })
  } catch (e) {
    console.error(e)
    return new NextResponse('Server error', { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId, sessionClaims } = await auth()
    const { id } = await params
    if (!userId) return new NextResponse('Unauthorized', { status: 401 })
    const role = (sessionClaims as any)?.metadata?.role || 'user'
    const body = await req.json()

    // VERIFY (auto-assign all scrappers)
    if (body.action === 'verify') {
      if (!['admin','moderator'].includes(role)) return new NextResponse('Forbidden', { status: 403 })
      const updated = await assignScrappers(id) // no list => auto assign
      return NextResponse.json({ success: true, request: updated })
    }

    // Scrapper marking collected (Clerk user ID)
    if (body.action === 'collect') {
      const reqDoc: any = await getCollectionRequestById(id)
      if (!reqDoc) return new NextResponse('Not found', { status: 404 })
      const isAdmin = ['admin'].includes(role)
      const assigned: string[] = (reqDoc.assignedScrappers || [])
      if (!isAdmin && !assigned.includes(userId)) {
        return new NextResponse('Forbidden', { status: 403 })
      }
      const updated = await markAsCollected(id, { collectedBy: userId })
      return NextResponse.json({ success: true, request: updated })
    }

    // Assign scrappers (admin/moderator)
    if (body.action === 'assign') {
      if (!['admin','moderator'].includes(role)) return new NextResponse('Forbidden', { status: 403 })
      const parsed = assignScrappersSchema.safeParse({ scrapperIds: body.scrapperIds })
      if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
      const updated = await assignScrappers(id, parsed.data.scrapperIds)
      return NextResponse.json({ success: true, request: updated })
    }

    // General update (admin/moderator)
    if (!['admin','moderator'].includes(role)) return new NextResponse('Forbidden', { status: 403 })
    const currentRequest = await getCollectionRequestById(id)
    if (!currentRequest) return new NextResponse('Not found', { status: 404 })
    const parsed = updateCollectionRequestSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    const updated = await updateCollectionRequest(id, {
      ...parsed.data,
      requestedPickupTime: parsed.data.requestedPickupTime ? new Date(parsed.data.requestedPickupTime) : undefined
    } as any)

    // Notify donor when completed
    if (parsed.data.status === 'completed' && (currentRequest as any).status !== 'completed') {
      try {
        await notificationService.notifyUsers([(currentRequest as any).donor], {
          title: 'Collection Completed',
            body: 'Your donation has been processed and completed. Thank you for your contribution!',
            url: '/notifications',
            type: 'collection_completed'
        })
      } catch (e) {
        console.warn('[NOTIFY_COMPLETED_FAIL]', e)
      }
    }
    return NextResponse.json({ success: true, request: updated })
  } catch (e) {
    console.error(e)
    return new NextResponse('Server error', { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await params // ensure awaited to avoid unhandled promise (even if unused)
  return new NextResponse('Not implemented', { status: 405 })
}
