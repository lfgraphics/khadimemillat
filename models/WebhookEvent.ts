import mongoose, { Schema, Document } from 'mongoose'

export interface IWebhookEvent extends Document {
  id: string
  receivedAt: Date
}

const schema = new Schema<IWebhookEvent>({
  id: { type: String, required: true, unique: true },
  receivedAt: { type: Date, default: Date.now }
}, { timestamps: true })

export default mongoose.models.WebhookEvent || mongoose.model<IWebhookEvent>('WebhookEvent', schema, 'razorpay-webhook-events')
