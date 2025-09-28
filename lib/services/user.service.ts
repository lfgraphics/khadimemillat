import connectDB from '@/lib/db'
import User from '@/models/User'
import { clerkClient } from '@clerk/nextjs/server'
import { normalizePhoneNumber, getDefaultCountryCode } from '@/lib/utils/phone'

async function getClerkClient() {
  return typeof clerkClient === 'function' ? await (clerkClient as any)() : clerkClient
}

export async function getClerkUserWithSupplementaryData(clerkUserId: string) {
  const client: any = await getClerkClient()
  let clerkUser: any
  try {
    clerkUser = await client.users.getUser(clerkUserId)
  } catch (e: any) {
    // If the user no longer exists in Clerk (deleted) we shouldn't fail the whole API response.
    if (e?.status === 404 || (Array.isArray(e?.errors) && e.errors.some((er: any) => er.code === 'resource_not_found'))) {
      console.debug('[USER_SERVICE] Clerk user not found, returning fallback', clerkUserId)
      return {
        id: clerkUserId,
        name: 'Deleted User',
        email: undefined,
        role: 'user',
        phone: undefined,
        address: undefined,
        missing: true
      }
    }
    // Re-throw other errors (auth/network) so they are visible upstream.
    throw e
  }

  // Authoritative user properties
  const baseName = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || clerkUser.username || clerkUser.id
  const role = clerkUser.publicMetadata?.role || 'user'
  const email = clerkUser.primaryEmailAddress?.emailAddress
  // Move PII to privateMetadata (server-side only)
  const phone = (clerkUser.privateMetadata as any)?.phone as string | undefined
  const address = (clerkUser.privateMetadata as any)?.address as string | undefined

  // Opportunistic cache/upsert of basic fields in Mongo (do not rely on it for phone/address)
  try {
    await connectDB()
    const existing: any = await User.findOne({ clerkUserId }).select('_id name email role').lean()
    if (!existing) {
      await User.create({ clerkUserId, name: baseName, email, role, /* phone/address intentionally omitted as Clerk-first */ })
    } else {
      const needsUpdate = existing.name !== baseName || existing.email !== email || existing.role !== role
      if (needsUpdate) {
        await User.updateOne({ _id: existing._id }, { $set: { name: baseName, email, role } })
      }
    }
  } catch (e) {
    console.warn('[USER_SERVICE_CACHE_UPSERT_FAILED]', clerkUserId, e)
  }

  return { id: clerkUser.id, name: baseName, email, role, phone, address }
}

export async function getUsersByRole(role: string) {
  const client: any = await getClerkClient()
  const users = await client.users.getUserList({ limit: 500 })
  return users.data.filter((u: any) => u.publicMetadata?.role === role)
}

export async function enrichClerkUsersWithMongoData(clerkUsers: any[], options?: { includePII?: boolean }) {
  const includePII = options?.includePII === true
  // Clerk-first: read phone/address from privateMetadata; Mongo used only to lookup _id mapping elsewhere
  return clerkUsers.map((cu: any) => {
    const name = `${cu.firstName || ''} ${cu.lastName || ''}`.trim() || cu.username || cu.id
    const email = cu.primaryEmailAddress?.emailAddress
    const role = cu.publicMetadata?.role || 'user'
    const phone = includePII ? (cu.privateMetadata as any)?.phone as string | undefined : undefined
    const address = includePII ? (cu.privateMetadata as any)?.address as string | undefined : undefined
    return { id: cu.id, name, email, role, phone, address }
  })
}

export async function updateClerkUserMetadata(clerkUserId: string, data: { phone?: string; address?: string }) {
  const client: any = await getClerkClient()
  const user = await client.users.getUser(clerkUserId)
  const currentPrivate = (user.privateMetadata || {}) as Record<string, any>
  const patch: Record<string, any> = { ...currentPrivate }
  if (data.phone !== undefined) patch.phone = data.phone ? normalizePhoneNumber(String(data.phone), getDefaultCountryCode()) : undefined
  if (data.address !== undefined) patch.address = data.address
  const updated = await client.users.updateUser(clerkUserId, { privateMetadata: patch })
  return updated
}

export const userService = {
  getClerkUserWithSupplementaryData,
  getUsersByRole,
  enrichClerkUsersWithMongoData,
  updateClerkUserMetadata
}
