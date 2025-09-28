import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import User from '@/models/User'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { Types } from 'mongoose'
import { updateClerkUserMetadata, getClerkUserWithSupplementaryData } from '@/lib/services/user.service'
import { validatePhoneNumber, normalizePhoneNumber } from '@/lib/utils/phone'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId, sessionClaims } = await auth()
    if (!userId) return new NextResponse('Unauthorized', { status: 401 })
    const { id } = await params
    await connectDB()
    const body = await req.json()
    let { phone, address } = body as { phone?: string; address?: string }

    // Resolve target user: supports Mongo _id or Clerk id
    let target = null as any
    let clerkTargetId: string | null = null
    if (Types.ObjectId.isValid(id)) {
      target = await User.findById(id)
      if (!target) return new NextResponse('User not found', { status: 404 })
      clerkTargetId = target.clerkUserId
    } else {
      // Treat id as Clerk user id, upsert Mongo cache if missing
      clerkTargetId = id
      let existing = await User.findOne({ clerkUserId: id })
      if (!existing) {
        const client: any = typeof clerkClient === 'function' ? await (clerkClient as any)() : clerkClient
        const cu = await client.users.getUser(id)
        const name = `${cu.firstName || ''} ${cu.lastName || ''}`.trim() || cu.username || cu.id
        const email = cu.primaryEmailAddress?.emailAddress
        const role = cu.publicMetadata?.role || 'user'
        existing = await User.create({ clerkUserId: id, name, email, role })
      }
      target = existing
    }

    const requesterRole = (sessionClaims as any)?.metadata?.role || 'user'
    // Allow self-updates; also allow admin/moderator to update others
    const isSelf = clerkTargetId === userId
    const isPrivileged = ['admin','moderator'].includes(requesterRole)
    if (!isSelf && !isPrivileged) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    // Validate phone when provided
    if (phone !== undefined && phone !== null) {
      if (!validatePhoneNumber(String(phone))) {
        return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 })
      }
      phone = normalizePhoneNumber(String(phone))
    }

    // Update Clerk privateMetadata (authoritative for PII)
    await updateClerkUserMetadata(clerkTargetId!, { phone, address })

    // Optional: mirror to Mongo as cache (non-authoritative)
    if (phone !== undefined || address !== undefined) {
      const patch: any = {}
      if (phone !== undefined) patch.phone = phone
      if (address !== undefined) patch.address = address
      await User.updateOne({ clerkUserId: clerkTargetId }, { $set: patch })
    }

    // Return up-to-date Clerk-first user object
  const merged = await getClerkUserWithSupplementaryData(clerkTargetId!)
    return NextResponse.json({ success: true, user: merged })
  } catch (e: any) {
    console.error(e)
    return new NextResponse('Server error', { status: 500 })
  }
}
