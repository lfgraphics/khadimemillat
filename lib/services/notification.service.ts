import connectDB from '../db'
import Notification from '@/models/Notification'
import WebPushSubscription from '@/models/WebPushSubscription'
import { clerkClient } from '@clerk/nextjs/server'
// Use relative path because this service resides in lib/services and webPush is at lib/webPush
import { sendWebPushNotification as sendPush, PushPayload } from '../webPush'

interface NotificationData {
  title: string
  body: string
  url?: string
  type: 'collection_request' | 'verification_needed' | 'collection_assigned' | 'review_needed' | 'collection_completed'
}

interface ListOptions {
  page?: number
  limit?: number
  unreadOnly?: boolean
  type?: string
}

// Lightweight client-side helpers (no-ops on server)
const CACHE_TS_KEY = 'kmwf.notifications.cache.ts'
let pendingRequest: Promise<any> | null = null

export function setCacheTimestamp(ts: number = Date.now()) {
  try { sessionStorage.setItem(CACHE_TS_KEY, String(ts)) } catch { /* ignore */ }
}

export function isCacheStale(maxAgeMs = 60_000) {
  try {
    const raw = sessionStorage.getItem(CACHE_TS_KEY)
    if (!raw) return true
    const ts = Number(raw)
    return Number.isFinite(ts) ? (Date.now() - ts) > maxAgeMs : true
  } catch {
    return true
  }
}

export function deduplicateRequest<T>(factory: () => Promise<T>): Promise<T> {
  if (pendingRequest) return pendingRequest as Promise<T>
  const p = factory().finally(() => { pendingRequest = null })
  pendingRequest = p as unknown as Promise<any>
  return p
}

async function createNotification(clerkUserId: string, data: NotificationData) {
  await connectDB()
  const doc = await Notification.create({ recipient: clerkUserId, ...data })
  // Fire and forget web push
  sendWebPushNotification(clerkUserId, { title: data.title, body: data.body, url: data.url }).catch(err => console.error('[WEB_PUSH_ERR]', err))
  return doc.toObject()
}

async function sendWebPushNotification(clerkUserId: string, payload: PushPayload) {
  await connectDB()
  const sub: any = await WebPushSubscription.findOne({ clerkUserId }).lean()
  if (!sub) return { success: false, reason: 'no-subscription' }
  try {
    const result = await sendPush({
      endpoint: sub.endpoint,
      keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth }
    } as any, payload)
    return result
  } catch (e) {
    console.error('[sendWebPushNotification] error', e)
    return { success: false, error: e }
  }
}

async function notifyByRole(roles: string[], data: NotificationData) {
  // Fetch from Clerk and filter by publicMetadata.role
  const client: any = typeof clerkClient === 'function' ? await (clerkClient as any)() : clerkClient
  const users = await client.users.getUserList({ limit: 500 })
  const targets = users.data.filter((u: any) => roles.includes(u.publicMetadata?.role))
  const ids = targets.map((u: any) => u.id)
  return notifyUsers(ids, data)
}

async function notifyUsers(clerkUserIds: string[], data: NotificationData) {
  await connectDB()
  const docs = await Notification.insertMany(clerkUserIds.map(id => ({ recipient: id, ...data })))
  // Fire pushes concurrently but non-blocking
  Promise.allSettled(clerkUserIds.map(id => sendWebPushNotification(id, { title: data.title, body: data.body, url: data.url }))).catch(() => {})
  return docs.map(d => d.toObject())
}

async function listNotifications(clerkUserId: string, opts: ListOptions = {}) {
  const { page = 1, limit = 20, unreadOnly = false, type } = opts
  await connectDB()
  const query: any = { recipient: clerkUserId }
  if (unreadOnly) query.read = false
  if (type) query.type = type
  const skip = (page - 1) * limit
  const [items, total] = await Promise.all([
    Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Notification.countDocuments(query)
  ])
  return { items, total, page, limit }
}

export async function markAsRead(notificationId: string, clerkUserId: string) {
  await connectDB()
  const doc = await Notification.findOneAndUpdate({ _id: notificationId, recipient: clerkUserId }, { read: true }, { new: true }).lean()
  return doc
}

export async function markAllAsRead(clerkUserId: string) {
  await connectDB()
  await Notification.updateMany({ recipient: clerkUserId, read: false }, { $set: { read: true } })
  return { success: true }
}

async function subscribeToWebPush(clerkUserId: string, subscription: any) {
  await connectDB()
  const payload = {
    clerkUserId,
    endpoint: subscription.endpoint,
    keys: subscription.keys,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined
  }
  await WebPushSubscription.findOneAndUpdate({ clerkUserId }, payload, { upsert: true, new: true, setDefaultsOnInsert: true })
  return { success: true }
}

async function unsubscribeFromWebPush(clerkUserId: string) {
  await connectDB()
  await WebPushSubscription.deleteOne({ clerkUserId })
  return { success: true }
}

export const notificationService = {
  createNotification,
  sendWebPushNotification,
  notifyByRole,
  notifyUsers,
  listNotifications,
  markAsRead,
  markAllAsRead,
  subscribeToWebPush,
  unsubscribeFromWebPush
}
