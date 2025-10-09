import mongoose, { Schema, Document } from "mongoose"

export interface IPurchase extends Document {
  scrapItemId: mongoose.Types.ObjectId
  buyerId: string
  buyerName: string
  buyerEmail?: string
  buyerPhone?: string
  salePrice: number
  conversationId?: mongoose.Types.ObjectId
  // paymentMethod refers to how money was collected; 'offline' covers cash/other
  // Keep this in sync with ScrapItem.marketplaceListing.soldVia where 'online' implies paymentMethod='online'
  paymentMethod: 'online' | 'cash' | 'offline'
  razorpayOrderId?: string
  razorpayPaymentId?: string
  razorpaySignature?: string
  paymentVerified?: boolean
  status: 'pending' | 'completed' | 'cancelled' | 'refunded'
  completedAt?: Date
  completedBy?: string
  notes?: string
  reservedAt?: Date
  lockedAt?: Date
  lockedBy?: string
}

const purchaseSchema = new Schema<IPurchase>({
  scrapItemId: { type: Schema.Types.ObjectId, ref: 'ScrapItem', required: true },
  buyerId: { type: String, required: true },
  buyerName: { type: String, required: true },
  buyerEmail: { type: String },
  buyerPhone: { type: String },
  salePrice: { type: Number, required: true, min: 0 },
  conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation' },
  paymentMethod: { type: String, enum: ['online', 'cash', 'offline'], required: true },
  razorpayOrderId: { type: String },
  razorpayPaymentId: { type: String },
  razorpaySignature: { type: String },
  paymentVerified: { type: Boolean, default: false },
  status: { type: String, enum: ['pending', 'completed', 'cancelled', 'refunded'], default: 'pending' },
  completedAt: { type: Date },
  completedBy: { type: String },
  notes: { type: String },
  reservedAt: { type: Date, default: Date.now }
  ,
  lockedAt: { type: Date },
  lockedBy: { type: String }
}, { timestamps: true })

// Ensure only one PENDING purchase per item at a time (reservation). Allow multiple over time for non-pending statuses.
// Replace previous global unique index with a partial unique index scoped to pending status.
try {
  // Drop legacy unique index if it exists (best-effort)
  // @ts-ignore
  purchaseSchema.pre('init', function () {
    // no-op hook to ensure model compiles before attempting index drop via ensureIndexes at startup
  })
} catch {}
purchaseSchema.index(
  { scrapItemId: 1 },
  { unique: true, partialFilterExpression: { status: 'pending' } as any }
)
// Fast lookup by Razorpay order for verification and reconciliation
purchaseSchema.index({ razorpayOrderId: 1 })
purchaseSchema.index({ buyerId: 1 })
purchaseSchema.index({ status: 1 })
purchaseSchema.index({ createdAt: -1 })

export default mongoose.models.Purchase || mongoose.model<IPurchase>('Purchase', purchaseSchema, 'purchases')
