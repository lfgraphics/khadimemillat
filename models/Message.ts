import mongoose, { Schema, Document } from "mongoose"

export interface IMessage extends Document {
  conversationId: mongoose.Types.ObjectId
  senderId: string
  senderName: string
  senderRole?: 'user' | 'moderator' | 'admin' | 'system' | 'scrapper'
  content: string
  type: 'text' | 'system' | 'payment_request' | 'payment_completed'
  metadata?: { amount?: number; razorpayOrderId?: string; razorpayPaymentId?: string; note?: string }
  readBy: string[]
  seenBy: { userId: string; seenAt: Date }[]
}

const messageSchema = new Schema<IMessage>({
  conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
  senderId: { type: String, required: true },
  senderName: { type: String, required: true },
  senderRole: { type: String, enum: ['user', 'moderator', 'admin', 'system', 'scrapper'] },
  content: { type: String, required: true },
  type: { type: String, enum: ['text', 'system', 'payment_request', 'payment_completed'], default: 'text' },
  metadata: {
    amount: { type: Number },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    note: { type: String }
  },
  readBy: { type: [String], default: [] },
  seenBy: [{
    userId: { type: String, required: true },
    seenAt: { type: Date, required: true }
  }]
}, { timestamps: true })

messageSchema.index({ conversationId: 1 })
messageSchema.index({ createdAt: 1 })
messageSchema.index({ conversationId: 1, createdAt: 1 })

export default mongoose.models.Message || mongoose.model<IMessage>('Message', messageSchema, 'messages')
