import mongoose, { Schema, Document } from "mongoose"

export interface IGullakCollection extends Document {
    collectionId: string // Human readable ID (e.g., "COL-001", "COL-002")
    gullakId: mongoose.Types.ObjectId // Reference to Gullak
    gullakReadableId: string // Store the human readable gullak ID for easy reference
    amount: number
    collectionDate: Date
    collectedBy: {
        userId: string // Clerk user ID
        name: string
    }
    caretakerPresent: {
        userId: string // Clerk user ID
        name: string
        signature?: string // Base64 encoded signature if captured
    }
    witnesses?: Array<{
        name: string
        phone?: string
        signature?: string
    }>
    notes?: string
    photos?: string[] // Cloudinary URLs of collection photos
    verificationStatus: 'pending' | 'verified' | 'disputed'
    verifiedBy?: {
        userId: string // Clerk user ID
        name: string
        verifiedAt: Date
        notes?: string
    }
    depositDetails?: {
        bankAccount: string
        transactionId: string
        depositDate: Date
        depositedBy: string // Clerk user ID
    }
    createdBy: string // Clerk user ID
}

const gullakCollectionSchema = new Schema<IGullakCollection>({
    collectionId: { 
        type: String, 
        required: true, 
        unique: true,
        index: true
    },
    gullakId: { type: Schema.Types.ObjectId, ref: 'Gullak', required: true },
    gullakReadableId: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    collectionDate: { type: Date, required: true },
    collectedBy: {
        userId: { type: String, required: true }, // Clerk user ID
        name: { type: String, required: true }
    },
    caretakerPresent: {
        userId: { type: String, required: true }, // Clerk user ID
        name: { type: String, required: true },
        signature: { type: String }
    },
    witnesses: [{
        name: { type: String, required: true },
        phone: { type: String },
        signature: { type: String }
    }],
    notes: { type: String },
    photos: [{ type: String }],
    verificationStatus: { 
        type: String, 
        enum: ['pending', 'verified', 'disputed'], 
        default: 'pending' 
    },
    verifiedBy: {
        userId: { type: String }, // Clerk user ID
        name: { type: String },
        verifiedAt: { type: Date },
        notes: { type: String }
    },
    depositDetails: {
        bankAccount: { type: String },
        transactionId: { type: String },
        depositDate: { type: Date },
        depositedBy: { type: String } // Clerk user ID
    },
    createdBy: { type: String, required: true } // Clerk user ID
}, { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
})

// Indexes for efficient queries
gullakCollectionSchema.index({ gullakId: 1, collectionDate: -1 })
gullakCollectionSchema.index({ verificationStatus: 1 })
gullakCollectionSchema.index({ collectionDate: -1 })

// Virtual for gullak details
gullakCollectionSchema.virtual('gullakDetails', {
    ref: 'Gullak',
    localField: 'gullakId',
    foreignField: '_id',
    justOne: true
})

// Static method to generate next Collection ID
gullakCollectionSchema.statics.generateCollectionId = async function(): Promise<string> {
    const lastCollection = await this.findOne({}, {}, { sort: { 'createdAt': -1 } })
    
    if (!lastCollection) {
        return 'COL-001'
    }
    
    const lastIdNumber = parseInt(lastCollection.collectionId.split('-')[1])
    const nextNumber = lastIdNumber + 1
    return `COL-${nextNumber.toString().padStart(3, '0')}`
}

export default mongoose.models.GullakCollection || mongoose.model<IGullakCollection>("GullakCollection", gullakCollectionSchema, 'gullak_collections')