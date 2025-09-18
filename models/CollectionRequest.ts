import mongoose, { Schema, Document } from 'mongoose'

// Clerk-first: store Clerk user ids as strings
export interface ICollectionRequest extends Document {
  donor: string // Clerk user ID
  requestedPickupTime: Date
  actualPickupTime?: Date
  address: string
  phone: string
  notes?: string
  assignedScrappers: string[] // Clerk user IDs
  status: 'pending' | 'verified' | 'collected' | 'completed'
  donationEntryId?: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const collectionRequestSchema = new Schema<ICollectionRequest>({
  donor: { type: String, required: true },
  requestedPickupTime: { type: Date, required: true },
  actualPickupTime: { type: Date },
  address: { type: String, required: true },
  phone: { type: String, required: true },
  notes: { type: String },
  assignedScrappers: [{ type: String }],
  status: { type: String, enum: ['pending', 'verified', 'collected', 'completed'], default: 'pending' },
  donationEntryId: { type: Schema.Types.ObjectId, ref: 'DonationEntry' }
}, { timestamps: true })

export default mongoose.models.CollectionRequest || mongoose.model<ICollectionRequest>('CollectionRequest', collectionRequestSchema, 'collection-requests')
