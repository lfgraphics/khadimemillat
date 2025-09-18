import mongoose, { Schema, Document } from "mongoose"

// Clerk-first: use Clerk user IDs (strings) instead of Mongo ObjectIds for user references
export interface ISDonationEntry extends Document {
    donor: string // Clerk user ID
    collectedBy?: string // Clerk user ID
    verifiedBy?: string // Clerk user ID
    finalizedBy?: string // Clerk user ID
    collectionRequest?: mongoose.Types.ObjectId
    items: mongoose.Types.ObjectId[]
    status: 'pending' | 'verified' | 'collected' | 'done' | 'completed'
    requestedPickupTime?: Date
    actualPickupTime?: Date
    moderatorNotes?: string
    itemsListedNotifiedAt?: Date
}

const donationEntrySchema = new Schema<ISDonationEntry>({
    donor: { type: String, required: true },
    collectedBy: { type: String },
    verifiedBy: { type: String },
    finalizedBy: { type: String },
    collectionRequest: { type: Schema.Types.ObjectId, ref: "CollectionRequest" },
    items: [{ type: Schema.Types.ObjectId, ref: "ScrapItem" }],
    status: { type: String, enum: ['pending', 'verified', 'collected', 'done', 'completed'], default: 'pending' },
    requestedPickupTime: { type: Date },
    actualPickupTime: { type: Date },
    moderatorNotes: { type: String },
    itemsListedNotifiedAt: { type: Date }
}, { timestamps: true })

// Ensure one donation entry per collection request (when set)
donationEntrySchema.index({ collectionRequest: 1 }, { unique: true, sparse: true })

export default mongoose.models.DonationEntry || mongoose.model<ISDonationEntry>("DonationEntry", donationEntrySchema, 'donation-entries')
