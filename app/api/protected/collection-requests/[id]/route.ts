import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { assignFieldExecutives, getCollectionRequestById, markAsCollected, updateCollectionRequest } from '@/lib/services/collectionRequest.service'
import { notificationService } from '@/lib/services/notification.service'
import { getClerkUserWithSupplementaryData } from '@/lib/services/user.service'
import { assignFieldExecutivesSchema, updateCollectionRequestSchema } from '@/lib/validators/collectionRequest.validator'
import connectDB from '@/lib/db'
import User from '@/models/User'

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
    let donorMongoId: string | undefined
    try {
      donorDetails = await getClerkUserWithSupplementaryData(doc.donor)
    } catch (e) {
      // Failed to enrich donor details, continue without
    }
    // Resolve donor's Mongo _id mapping if available (help client-side auto-fill)
    try {
      await connectDB()
      const donorDoc: any = await User.findOne({ clerkUserId: doc.donor }).select('_id').lean()
      if (donorDoc?._id) donorMongoId = donorDoc._id.toString()
    } catch (e) {
      // Failed to lookup donor in MongoDB, continue without
    }
    if (Array.isArray(doc.assignedFieldExecutives) && doc.assignedFieldExecutives.length > 0) {
      assignedDetails = await Promise.all(doc.assignedFieldExecutives.map((sid: string) => getClerkUserWithSupplementaryData(sid).catch(() => null)))
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
            try { collectedByDetails = await getClerkUserWithSupplementaryData(donationEntry.collectedBy) } catch { }
          }
        }
      } catch (e) {
        // Failed to lookup donation entry, continue without
      }
    }
    return NextResponse.json({ request: { ...doc, donorDetails, donorMongoId, assignedDetails, collectedByDetails, donationEntryId } })
  } catch (e) {
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

    // VERIFY (auto-assign all field executives)
    if (body.action === 'verify') {
      if (!['admin', 'moderator'].includes(role)) return new NextResponse('Forbidden', { status: 403 })
      const updated = await assignFieldExecutives(id) // no list => auto assign
      return NextResponse.json({ success: true, request: updated })
    }

    // Field executive marking collected (Clerk user ID)
    if (body.action === 'collect') {
      const reqDoc: any = await getCollectionRequestById(id)
      if (!reqDoc) return new NextResponse('Not found', { status: 404 })
      const isAdmin = ['admin'].includes(role)
      const assigned: string[] = (reqDoc.assignedFieldExecutives || [])
      if (!isAdmin && !assigned.includes(userId)) {
        return new NextResponse('Forbidden', { status: 403 })
      }
      const updated = await markAsCollected(id, { collectedBy: userId })
      return NextResponse.json({ success: true, request: updated })
    }

    // Assign field executives (admin/moderator)
    if (body.action === 'assign') {
      if (!['admin', 'moderator'].includes(role)) return new NextResponse('Forbidden', { status: 403 })
      const parsed = assignFieldExecutivesSchema.safeParse({ fieldExecutiveIds: body.fieldExecutiveIds })
      if (!parsed.success) return NextResponse.json({ error: parsed.error.format() }, { status: 400 })
      const updated = await assignFieldExecutives(id, parsed.data.fieldExecutiveIds)
      return NextResponse.json({ success: true, request: updated })
    }

    // General update (admin/moderator)
    if (!['admin', 'moderator'].includes(role)) return new NextResponse('Forbidden', { status: 403 })
    const currentRequest = await getCollectionRequestById(id)
    if (!currentRequest) return new NextResponse('Not found', { status: 404 })
    const parsed = updateCollectionRequestSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.format() }, { status: 400 })
    const updated = await updateCollectionRequest(id, {
      ...parsed.data,
      requestedPickupTime: parsed.data.requestedPickupTime ? new Date(parsed.data.requestedPickupTime) : undefined
    } as any)

    // Notify donor when completed
    if (parsed.data.status === 'completed' && (currentRequest as any).status !== 'completed') {
      try {
        // Get donor user details to determine their role
        await connectDB()
        const donorUser = await User.findOne({ clerkUserId: (currentRequest as any).donor }).lean() as any
        const donorRole = donorUser?.role || 'user'

        await notificationService.sendNotification({
          title: 'Collection Completed',
          message: 'Your donation has been processed and completed. Thank you for your contribution!',
          channels: ['web_push', 'email'],
          targetRoles: [donorRole],
          sentBy: userId,
          metadata: {
            type: 'collection_completed',
            url: '/notifications',
            collectionRequestId: id
          }
        })
      } catch (e) {
        // Failed to send completion notification, continue
      }
    }
    return NextResponse.json({ success: true, request: updated })
  } catch (e) {
    return new NextResponse('Server error', { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await params // ensure awaited to avoid unhandled promise (even if unused)
  return new NextResponse('Not implemented', { status: 405 })
}
