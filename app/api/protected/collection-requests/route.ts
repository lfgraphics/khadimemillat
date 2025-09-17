import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createCollectionRequest, listCollectionRequests } from '@/lib/services/collectionRequest.service'
import { createCollectionRequestSchema } from '@/lib/validators/collectionRequest.validator'
import User from '@/models/User'
import connectDB from '@/lib/db'
import { Types } from 'mongoose'

export async function GET(req: Request) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) return new NextResponse('Unauthorized', { status: 401 })
    const url = new URL(req.url)
    const status = url.searchParams.get('status') || undefined
    let assignedTo = url.searchParams.get('assignedTo') || undefined
    const page = parseInt(url.searchParams.get('page') || '1', 10)

    // Interpret assignedTo=self -> resolve mongo user id
    if (assignedTo === 'self') {
      await connectDB()
      const mongoUser = await User.findOne({ clerkUserId }).select('_id').lean() as { _id: any } | null
      if (!mongoUser?._id) return new NextResponse('User not provisioned', { status: 404 })
      assignedTo = String(mongoUser._id)
    }

    const data = await listCollectionRequests({ status, assignedTo, page })
    return NextResponse.json(data)
  } catch (e) {
    console.error('[COLLECTION_REQUESTS_GET_ERROR]', e)
    return new NextResponse('Server error', { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { userId: clerkUserId, sessionClaims } = await auth()
    if (!clerkUserId) return new NextResponse('Unauthorized', { status: 401 })
    const role = (sessionClaims as any)?.metadata?.role || 'user'
    const json = await req.json()
    const parsed = createCollectionRequestSchema.safeParse(json)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    await connectDB()
    const mongoUser = await User.findOne({ clerkUserId }).select('_id role phone address').lean() as { _id: any, role: string } | null
    if (!mongoUser?._id) return new NextResponse('User not provisioned', { status: 404 })

    let donorId = parsed.data.donor as unknown as string | undefined
    const isPrivileged = ['admin', 'moderator'].includes(role)
    if (!isPrivileged) {
      // Override with self for regular user/scrapper
      donorId = String(mongoUser._id)
    } else {
      if (!donorId || !Types.ObjectId.isValid(donorId)) {
        return new NextResponse('Invalid donor id', { status: 400 })
      }
    }

    const created = await createCollectionRequest({
      donor: donorId as any,
      requestedPickupTime: parsed.data.requestedPickupTime ? new Date(parsed.data.requestedPickupTime) : undefined,
      address: parsed.data.address,
      phone: parsed.data.phone,
      notes: parsed.data.notes
    } as any)
    return NextResponse.json({ success: true, request: created })
  } catch (e) {
    console.error('[COLLECTION_REQUESTS_POST_ERROR]', e)
    return new NextResponse('Server error', { status: 500 })
  }
}
