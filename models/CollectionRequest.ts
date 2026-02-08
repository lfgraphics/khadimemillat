import mongoose, { Schema, Document } from 'mongoose'

// Clerk-first: store Clerk user ids as strings
export interface ICollectionRequest extends Document {
  donor: string // Clerk user ID or guest identifier
  guestName?: string // Name for guest donors (when donor starts with 'guest_')
  requestedPickupTime: Date
  actualPickupTime?: Date
  address: string
  phone: string
  notes?: string
  assignedFieldExecutives: string[] // Clerk user IDs
  status: 'pending' | 'verified' | 'collected' | 'completed'
  donationEntryId?: mongoose.Types.ObjectId
  location?: {
    type: 'Point'
    coordinates: [number, number]
  }
  createdAt: Date
  updatedAt: Date
}

const collectionRequestSchema = new Schema<ICollectionRequest>({
  donor: { type: String, required: true },
  guestName: { type: String }, // For guest donations
  requestedPickupTime: { type: Date, required: true },
  actualPickupTime: { type: Date },
  address: { type: String, required: true },
  phone: { type: String, required: true },
  notes: { type: String },
  assignedFieldExecutives: [{ type: String }],
  status: { type: String, enum: ['pending', 'verified', 'collected', 'completed'], default: 'pending' },
  donationEntryId: { type: Schema.Types.ObjectId, ref: 'DonationEntry' },
  location: {
    type: {
      type: String,
      enum: ['Point']
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      validate: {
        validator: function (v: number[]) {
          return Array.isArray(v) && v.length === 2 && v.every(n => typeof n === 'number')
        },
        message: 'location.coordinates must be an array of two numbers [lng, lat]'
      }
    }
  }
}, { timestamps: true })

// create 2dsphere index for geo queries (only useful if location is provided)
collectionRequestSchema.index({ location: '2dsphere' })

export default mongoose.models.CollectionRequest || mongoose.model<ICollectionRequest>('CollectionRequest', collectionRequestSchema, 'collection-requests')
