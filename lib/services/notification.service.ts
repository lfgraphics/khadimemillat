import connectDB from '../db'
import Notification, { INotification } from '@/models/Notification'
import User from '@/models/User'
import { Types } from 'mongoose'
import { Roles } from '@/types/globals'

// Placeholder for web push integration
async function sendWebPushNotification(_notification: INotification) {
  // TODO: integrate with actual web push (service worker + subscription storage)
  return true
}

export async function createNotification(data: { recipient: string, title: string, body: string, url?: string, type: INotification['type'] }) {
  await connectDB()
  if (!Types.ObjectId.isValid(data.recipient)) throw new Error('Invalid recipient')
  const doc = await Notification.create(data)
  // Fire and forget push
  sendWebPushNotification(doc as any).catch(err => console.error('[WEB_PUSH_ERR]', err))
  return doc.toObject()
}

export async function listNotifications(userId: string, { page = 1, limit = 20, unreadOnly = false, type }: { page?: number, limit?: number, unreadOnly?: boolean, type?: string } = {}) {
  await connectDB()
  const query: any = { recipient: userId }
  if (unreadOnly) query.read = false
  if (type) query.type = type
  const skip = (page - 1) * limit
  const [items, total] = await Promise.all([
    Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Notification.countDocuments(query)
  ])
  return { items, total, page, limit }
}

export async function markAsRead(id: string, userId: string) {
  await connectDB()
  if (!Types.ObjectId.isValid(id)) throw new Error('Invalid notification id')
  const doc = await Notification.findOneAndUpdate({ _id: id, recipient: userId }, { read: true }, { new: true }).lean()
  return doc
}

export async function notifyByRole(roles: Roles[], payload: { title: string, body: string, url?: string, type: INotification['type'] }) {
  await connectDB()
  const users = await User.find({ role: { $in: roles } }).select('_id').lean()
  const notifications = await Notification.insertMany(users.map(u => ({ ...payload, recipient: u._id })))
  // Fire pushes
  notifications.forEach(n => sendWebPushNotification(n as any))
  return notifications.map(n => n.toObject())
}

export async function notifyUsers(userIds: string[], payload: { title: string, body: string, url?: string, type: INotification['type'] }) {
  await connectDB()
  const validIds = userIds.filter(id => Types.ObjectId.isValid(id))
  const notifications = await Notification.insertMany(validIds.map(id => ({ ...payload, recipient: id })))
  notifications.forEach(n => sendWebPushNotification(n as any))
  return notifications.map(n => n.toObject())
}

export const notificationService = {
  createNotification,
  listNotifications,
  markAsRead,
  notifyByRole,
  notifyUsers,
  sendWebPushNotification
}
