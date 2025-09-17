import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { assignScrappers, getCollectionRequestById, markAsCollected, updateCollectionRequest } from '@/lib/services/collectionRequest.service'
import User from '@/models/User'
import connectDB from '@/lib/db'
import { assignScrappersSchema, updateCollectionRequestSchema } from '@/lib/validators/collectionRequest.validator'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await auth()
    if (!userId) return new NextResponse('Unauthorized', { status: 401 })
    const doc = await getCollectionRequestById(params.id)
    if (!doc) return new NextResponse('Not found', { status: 404 })
    return NextResponse.json({ request: doc })
  } catch (e) {
    console.error(e)
    return new NextResponse('Server error', { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId, sessionClaims } = await auth()
    if (!userId) return new NextResponse('Unauthorized', { status: 401 })
    const role = (sessionClaims as any)?.metadata?.role || 'user'
    const body = await req.json()

    // Scrapper marking collected
    if (body.action === 'collect') {
      await connectDB()
      const mongoUser = await User.findOne({ clerkUserId: userId }).select('_id role').lean() as { _id: any, role: string } | null
      if (!mongoUser?._id) return new NextResponse('User not provisioned', { status: 404 })
  const reqDoc = await getCollectionRequestById(params.id) as any
      if (!reqDoc) return new NextResponse('Not found', { status: 404 })
      const isAdmin = ['admin'].includes(role)
  const assigned = (reqDoc?.assignedScrappers || []).map((s: any) => String(s?._id || s))
      if (!isAdmin && !assigned.includes(String(mongoUser._id))) {
        return new NextResponse('Forbidden', { status: 403 })
      }
      const updated = await markAsCollected(params.id, { collectedBy: String(mongoUser._id) })
      return NextResponse.json({ success: true, request: updated })
    }

    // Assign scrappers (admin/moderator)
    if (body.action === 'assign') {
      if (!['admin','moderator'].includes(role)) return new NextResponse('Forbidden', { status: 403 })
      const parsed = assignScrappersSchema.safeParse({ scrapperIds: body.scrapperIds })
      if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
      const updated = await assignScrappers(params.id, parsed.data.scrapperIds)
      return NextResponse.json({ success: true, request: updated })
    }

    // General update (admin/moderator)
    if (!['admin','moderator'].includes(role)) return new NextResponse('Forbidden', { status: 403 })
    const parsed = updateCollectionRequestSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    const updated = await updateCollectionRequest(params.id, {
      ...parsed.data,
      requestedPickupTime: parsed.data.requestedPickupTime ? new Date(parsed.data.requestedPickupTime) : undefined
    } as any)
    return NextResponse.json({ success: true, request: updated })
  } catch (e) {
    console.error(e)
    return new NextResponse('Server error', { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  return new NextResponse('Not implemented', { status: 405 })
}
