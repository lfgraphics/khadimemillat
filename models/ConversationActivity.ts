import mongoose, { Schema, Document } from "mongoose"

export interface IConversationActivity extends Document {
  conversationId: string
  userId: string
  isActive: boolean
  lastActiveAt: Date
  expiresAt: Date
}

const conversationActivitySchema = new Schema<IConversationActivity>({
  conversationId: { type: String, required: true },
  userId: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  lastActiveAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 2 * 60 * 1000) } // 2 minutes
}, { timestamps: true })

conversationActivitySchema.index({ conversationId: 1, userId: 1 }, { unique: true })
conversationActivitySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }) // Auto-cleanup

export default mongoose.models.ConversationActivity || mongoose.model<IConversationActivity>('ConversationActivity', conversationActivitySchema, 'conversation_activities')