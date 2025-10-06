import mongoose, { Schema, Document } from 'mongoose'

export interface INotificationLog extends Document {
  templateId?: mongoose.Types.ObjectId
  title: string
  message: string
  channels: ('web_push' | 'email' | 'whatsapp' | 'sms')[]
  targetRoles: string[]
  sentTo: {
    userId: string
    email?: string
    phone?: string
    channels: {
      channel: 'web_push' | 'email' | 'whatsapp' | 'sms'
      status: 'sent' | 'failed' | 'pending'
      sentAt?: Date
      error?: string
    }[]
  }[]
  totalSent: number
  totalFailed: number
  sentBy: string
  metadata?: any // Additional data like campaign info, etc.
}

const notificationLogSchema = new Schema<INotificationLog>({
  templateId: { type: Schema.Types.ObjectId, ref: 'NotificationTemplate' },
  title: { type: String, required: true },
  message: { type: String, required: true },
  channels: [{
    type: String,
    enum: ['web_push', 'email', 'whatsapp', 'sms'],
    required: true
  }],
  targetRoles: [{ type: String, required: true }],
  sentTo: [{
    userId: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    channels: [{
      channel: {
        type: String,
        enum: ['web_push', 'email', 'whatsapp', 'sms'],
        required: true
      },
      status: {
        type: String,
        enum: ['sent', 'failed', 'pending'],
        default: 'pending'
      },
      sentAt: { type: Date },
      error: { type: String }
    }]
  }],
  totalSent: { type: Number, default: 0 },
  totalFailed: { type: Number, default: 0 },
  sentBy: { type: String, required: true },
  metadata: { type: Schema.Types.Mixed }
}, { timestamps: true })

notificationLogSchema.index({ sentBy: 1, createdAt: -1 })
notificationLogSchema.index({ 'sentTo.userId': 1 })

export default mongoose.models.NotificationLog || mongoose.model<INotificationLog>('NotificationLog', notificationLogSchema, 'notification-logs')