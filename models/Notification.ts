import mongoose, { Schema, Document } from 'mongoose'

// Clerk-first: store Clerk user id (string) as recipient instead of Mongo ObjectId
export interface INotification extends Document {
  recipient: string // Clerk user ID
  title: string
  body: string
  url?: string
  read: boolean
  type: 'collection_request' | 'verification_needed' | 'collection_assigned' | 'review_needed'
  webPushSubscription?: string // optional serialized subscription identifier
  createdAt: Date
  updatedAt: Date
}

const notificationSchema = new Schema<INotification>({
  recipient: { type: String, required: true },
  title: { type: String, required: true },
  body: { type: String, required: true },
  url: { type: String },
  read: { type: Boolean, default: false },
  type: { type: String, enum: ['collection_request', 'verification_needed', 'collection_assigned', 'review_needed'], required: true },
  webPushSubscription: { type: String }
}, { timestamps: true })

export default mongoose.models.Notification || mongoose.model<INotification>('Notification', notificationSchema, 'notifications')
