import mongoose, { Schema, Document } from 'mongoose'

export interface INotification extends Document {
  recipient: mongoose.Types.ObjectId
  title: string
  body: string
  url?: string
  read: boolean
  type: 'collection_request' | 'verification_needed' | 'collection_assigned' | 'review_needed'
  createdAt: Date
  updatedAt: Date
}

const notificationSchema = new Schema<INotification>({
  recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  body: { type: String, required: true },
  url: { type: String },
  read: { type: Boolean, default: false },
  type: { type: String, enum: ['collection_request', 'verification_needed', 'collection_assigned', 'review_needed'], required: true }
}, { timestamps: true })

export default mongoose.models.Notification || mongoose.model<INotification>('Notification', notificationSchema, 'notifications')
