import mongoose, { Schema, Document } from "mongoose"

export interface ISDonationEntry extends Document {
    donor: mongoose.Types.ObjectId
    collectedBy?: mongoose.Types.ObjectId
    verifiedBy?: mongoose.Types.ObjectId
    finalizedBy?: mongoose.Types.ObjectId
    collectionRequest?: mongoose.Types.ObjectId
    items: mongoose.Types.ObjectId[]
    status: 'pending' | 'verified' | 'collected' | 'done' | 'completed'
    requestedPickupTime?: Date
    actualPickupTime?: Date
    moderatorNotes?: string
}

const donationEntrySchema = new Schema<ISDonationEntry>({
    donor: { type: Schema.Types.ObjectId, ref: "User", required: true },
    collectedBy: { type: Schema.Types.ObjectId, ref: "User" },
    verifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
    finalizedBy: { type: Schema.Types.ObjectId, ref: "User" },
    collectionRequest: { type: Schema.Types.ObjectId, ref: "CollectionRequest" },
    items: [{ type: Schema.Types.ObjectId, ref: "ScrapItem" }],
    status: { type: String, enum: ['pending', 'verified', 'collected', 'done', 'completed'], default: 'pending' },
    requestedPickupTime: { type: Date },
    actualPickupTime: { type: Date },
    moderatorNotes: { type: String }
}, { timestamps: true })

export default mongoose.models.DonationEntry || mongoose.model<ISDonationEntry>("DonationEntry", donationEntrySchema, 'donation-entries')
