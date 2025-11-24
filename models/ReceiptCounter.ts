import mongoose, { Document, Schema } from 'mongoose'

export interface IReceiptCounter extends Document {
  financialYear: string
  sequence: number
  prefix: string
  lastUsed: Date
  createdAt: Date
  updatedAt: Date
}

const receiptCounterSchema = new Schema<IReceiptCounter>({
  financialYear: {
    type: String,
    required: true,
    unique: true
    // Note: index: true is redundant with unique: true
  },
  sequence: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  prefix: {
    type: String,
    required: true,
    default: 'KMWF-80G'
  },
  lastUsed: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'receipt_counters'
})

// Create compound index for better performance
receiptCounterSchema.index({ financialYear: 1, prefix: 1 }, { unique: true })

// Pre-save middleware to update lastUsed
receiptCounterSchema.pre('save', function(next) {
  this.lastUsed = new Date()
  next()
})

export default mongoose.models.ReceiptCounter || mongoose.model<IReceiptCounter>('ReceiptCounter', receiptCounterSchema)