import mongoose, { Schema, Document, ObjectId } from 'mongoose'

// Clerk-first: store Clerk user id (string) as recipient instead of Mongo ObjectId
export interface INotification extends Document {
  recipient: string // Clerk user ID
  title: string
  body: string
  url?: string
  read: boolean
  type: 'collection_request' | 'verification_needed' | 'collection_assigned' | 'review_needed' | 'collection_completed' | 'purchase_inquiry' | 'payment_request' | 'payment_completed' | 'item_sold'
  webPushSubscription?: string // optional serialized subscription identifier
  metadata?: { conversationId?: string; scrapItemId?: string; purchaseId?: string; amount?: number }
  createdAt: Date
  updatedAt: Date
  _id: ObjectId | string
}

const notificationSchema = new Schema<INotification>({
  recipient: { type: String, required: true },
  title: { type: String, required: true },
  body: { type: String, required: true },
  url: { type: String },
  read: { type: Boolean, default: false },
  type: { type: String, enum: ['collection_request', 'verification_needed', 'collection_assigned', 'review_needed', 'collection_completed', 'purchase_inquiry', 'payment_request', 'payment_completed', 'item_sold'], required: true },
  webPushSubscription: { type: String },
  metadata: {
    conversationId: { type: String },
    scrapItemId: { type: String },
    purchaseId: { type: String },
    amount: { type: Number }
  }
}, { timestamps: true })

export default mongoose.models.Notification || mongoose.model<INotification>('Notification', notificationSchema, 'notifications')
