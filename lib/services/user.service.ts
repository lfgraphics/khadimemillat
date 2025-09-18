import connectDB from '@/lib/db'
import User from '@/models/User'
import { clerkClient } from '@clerk/nextjs/server'

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

  await connectDB()
  // Upsert local Mongo user to keep in sync with Clerk authoritative data (name, email, role)
  const baseName = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || clerkUser.username || clerkUser.id
  const role = clerkUser.publicMetadata?.role || 'user'
  const email = clerkUser.primaryEmailAddress?.emailAddress
  const existing = await User.findOne({ clerkUserId })
  if (!existing) {
    try {
      await User.create({ clerkUserId, name: baseName, email, role })
    } catch (e) {
      console.warn('[USER_SERVICE_UPSERT_CREATE_FAILED]', clerkUserId, e)
    }
  } else {
    // Only update if changed to minimize writes
    const needsUpdate = existing.name !== baseName || existing.email !== email || existing.role !== role
    if (needsUpdate) {
      try { await User.updateOne({ _id: existing._id }, { $set: { name: baseName, email, role } }) } catch(e){ console.warn('[USER_SERVICE_UPSERT_UPDATE_FAILED]', clerkUserId, e) }
    }
  }
  const mongoData: any = await User.findOne({ clerkUserId }).select('phone address name email role').lean()

  return {
    id: clerkUser.id,
    name: mongoData?.name || baseName,
    email: mongoData?.email || email,
    role: mongoData?.role || role,
    phone: mongoData?.phone,
    address: mongoData?.address
  }
}

export async function getUsersByRole(role: string) {
  const client: any = await getClerkClient()
  const users = await client.users.getUserList({ limit: 500 })
  return users.data.filter((u: any) => u.publicMetadata?.role === role)
}

export async function enrichClerkUsersWithMongoData(clerkUsers: any[]) {
  await connectDB()
  const clerkUserIds = clerkUsers.map(u => u.id)
  const mongoData = await User.find({ clerkUserId: { $in: clerkUserIds } })
    .select('clerkUserId phone address')
    .lean()
  const mongoMap = new Map(mongoData.map((u: any) => [u.clerkUserId, u]))
  return clerkUsers.map(cu => ({
    id: cu.id,
    name: `${cu.firstName || ''} ${cu.lastName || ''}`.trim() || cu.username || cu.id,
    email: cu.primaryEmailAddress?.emailAddress,
    role: cu.publicMetadata?.role || 'user',
    phone: mongoMap.get(cu.id)?.phone,
    address: mongoMap.get(cu.id)?.address
  }))
}

export const userService = {
  getClerkUserWithSupplementaryData,
  getUsersByRole,
  enrichClerkUsersWithMongoData
}
