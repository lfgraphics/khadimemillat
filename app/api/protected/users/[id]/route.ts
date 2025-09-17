import { NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import User from '@/models/User'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { Types } from 'mongoose'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId, sessionClaims } = await auth()
    if (!userId) return new NextResponse('Unauthorized', { status: 401 })
    const mongoId = params.id
    if (!Types.ObjectId.isValid(mongoId)) return new NextResponse('Invalid user id', { status: 400 })

    await connectDB()
    const body = await req.json()
    const { phone, address } = body

    const target = await User.findById(mongoId)
    if (!target) return new NextResponse('User not found', { status: 404 })

    const requesterRole = (sessionClaims as any)?.metadata?.role || 'user'
    // Only self, admin, moderator can update
    if (target.clerkUserId !== userId && !['admin','moderator'].includes(requesterRole)) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    if (phone !== undefined) target.phone = phone
    if (address !== undefined) target.address = address
    await target.save()

    // Sync Clerk metadata (publicMetadata) if updating own profile; non-fatal on failure
    if (target.clerkUserId === userId) {
      try {
        const client: any = typeof clerkClient === 'function' ? await (clerkClient as any)() : clerkClient;
        const clerkUser = await client.users.getUser(userId);
        const newPublic = { ...(clerkUser.publicMetadata || {}), phone: target.phone, address: target.address };
        await client.users.updateUser(userId, { publicMetadata: newPublic });
      } catch (err) {
        console.warn('[CLERK_METADATA_SYNC_FAILED]', err);
      }
    }

    return NextResponse.json({ success: true, user: { id: target._id.toString(), phone: target.phone, address: target.address } })
  } catch (e: any) {
    console.error(e)
    return new NextResponse('Server error', { status: 500 })
  }
}
