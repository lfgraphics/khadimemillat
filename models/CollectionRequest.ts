import mongoose, { Schema, Document } from 'mongoose'

export interface ICollectionRequest extends Document {
  donor: mongoose.Types.ObjectId
  requestedPickupTime: Date
  actualPickupTime?: Date
  address: string
  phone: string
  notes?: string
  assignedScrappers: mongoose.Types.ObjectId[]
  status: 'pending' | 'verified' | 'collected' | 'completed'
  createdAt: Date
  updatedAt: Date
}

const collectionRequestSchema = new Schema<ICollectionRequest>({
  donor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  requestedPickupTime: { type: Date, required: true },
  actualPickupTime: { type: Date },
  address: { type: String, required: true },
  phone: { type: String, required: true },
  notes: { type: String },
  assignedScrappers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  status: { type: String, enum: ['pending', 'verified', 'collected', 'completed'], default: 'pending' }
}, { timestamps: true })

export default mongoose.models.CollectionRequest || mongoose.model<ICollectionRequest>('CollectionRequest', collectionRequestSchema, 'collection-requests')
