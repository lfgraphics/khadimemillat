import mongoose, { Schema, Document } from 'mongoose'

export interface IWebPushSubscription extends Document {
  clerkUserId?: string
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
  userAgent?: string
  userRole: string
  userEmail?: string
  userName?: string
  createdAt: Date
  updatedAt: Date
}

const webPushSubscriptionSchema = new Schema<IWebPushSubscription>({
  clerkUserId: { type: String, required: false },
  endpoint: { type: String, required: true },
  keys: {
    p256dh: { type: String, required: true },
    auth: { type: String, required: true }
  },
  userAgent: { type: String },
  userRole: { type: String, required: true, default: 'user' },
  userEmail: { type: String },
  userName: { type: String }
}, { timestamps: true })

webPushSubscriptionSchema.index({ endpoint: 1 }, { unique: true })

export default mongoose.models.WebPushSubscription || mongoose.model<IWebPushSubscription>('WebPushSubscription', webPushSubscriptionSchema, 'web-push-subscriptions')
