import mongoose, { Schema, Document } from 'mongoose'

export interface IPurchase extends Document {
  scrapItemId: mongoose.Types.ObjectId
  buyerId?: string // Clerk user ID
  buyerName?: string
  buyerEmail?: string
  buyerPhone?: string
  quantity: number
  unitPrice: number
  totalAmount: number
  paymentMethod: 'online' | 'offline' | 'chat'
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded'
  razorpayOrderId?: string
  razorpayPaymentId?: string
  soldBy?: string // Clerk user ID of admin/moderator who processed the sale
  conversationId?: mongoose.Types.ObjectId
  notes?: string
  createdAt: Date
  updatedAt: Date
}

const purchaseSchema = new Schema<IPurchase>({
  scrapItemId: { type: Schema.Types.ObjectId, ref: 'ScrapItem', required: true },
  buyerId: { type: String }, // Clerk user ID
  buyerName: { type: String },
  buyerEmail: { type: String },
  buyerPhone: { type: String },
  quantity: { type: Number, required: true, min: 1, default: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  totalAmount: { type: Number, required: true, min: 0 },
  paymentMethod: { type: String, enum: ['online', 'offline', 'chat'], required: true },
  paymentStatus: { type: String, enum: ['pending', 'completed', 'failed', 'refunded'], default: 'pending' },
  razorpayOrderId: { type: String },
  razorpayPaymentId: { type: String },
  soldBy: { type: String }, // Clerk user ID
  conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation' },
  notes: { type: String }
}, { timestamps: true })

// Index for efficient queries
purchaseSchema.index({ scrapItemId: 1 })
purchaseSchema.index({ buyerId: 1 })
purchaseSchema.index({ paymentStatus: 1 })

export default mongoose.models.Purchase || mongoose.model<IPurchase>('Purchase', purchaseSchema, 'purchases')