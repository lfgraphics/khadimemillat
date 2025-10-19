import mongoose, { Schema, Document } from "mongoose"

export interface IConversation extends Document {
  scrapItemId: mongoose.Types.ObjectId
  buyerId: string
  participants: string[]
  status: 'active' | 'completed' | 'cancelled'
  lastMessageAt?: Date
  requestedQuantity?: number
  totalAmount?: number
  metadata?: { purchaseIntentPrice?: number; notes?: string }
}

const conversationSchema = new Schema<IConversation>({
  scrapItemId: { type: Schema.Types.ObjectId, ref: 'ScrapItem', required: true },
  buyerId: { type: String, required: true },
  participants: { type: [String], default: [] },
  status: { type: String, enum: ['active', 'completed', 'cancelled'], default: 'active' },
  lastMessageAt: { type: Date },
  requestedQuantity: { type: Number, default: 1, min: 1 },
  totalAmount: { type: Number, default: 0, min: 0 },
  metadata: {
    purchaseIntentPrice: { type: Number },
    notes: { type: String }
  }
}, { timestamps: true })

conversationSchema.index({ scrapItemId: 1 })
conversationSchema.index({ buyerId: 1 })
conversationSchema.index({ participants: 1 })
conversationSchema.index({ lastMessageAt: -1 })
conversationSchema.index({ scrapItemId: 1, buyerId: 1 }, { unique: true })

export default mongoose.models.Conversation || mongoose.model<IConversation>('Conversation', conversationSchema, 'conversations')
