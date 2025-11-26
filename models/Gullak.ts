import mongoose, { Schema, Document, Model } from "mongoose"

export interface IGullak extends Document {
    gullakId: string // Human readable numeric ID (e.g., "GUL-001", "GUL-002")
    location: {
        address: string
        coordinates: {
            type: 'Point'
            coordinates: [number, number] // [longitude, latitude] - GeoJSON format
        }
        landmark?: string
    }
    caretaker: {
        userId: mongoose.Types.ObjectId // Reference to User with gullak_caretaker role
        name: string
        phone: string
        assignedAt: Date
    }
    status: 'active' | 'inactive' | 'maintenance' | 'full'
    installationDate: Date
    lastCollectionDate?: Date
    totalCollections: number
    totalAmountCollected: number
    description?: string
    notes?: string
    createdBy: mongoose.Types.ObjectId // Reference to User (admin/neki_bank_manager)
    updatedBy?: mongoose.Types.ObjectId
}

const gullakSchema = new Schema<IGullak>({
    gullakId: { 
        type: String, 
        required: true, 
        unique: true,
        index: true
    },
    location: {
        address: { type: String, required: true },
        coordinates: {
            type: { type: String, enum: ['Point'], required: true },
            coordinates: { type: [Number], required: true } // [longitude, latitude]
        },
        landmark: { type: String }
    },
    caretaker: {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        name: { type: String, required: true },
        phone: { type: String, required: true },
        assignedAt: { type: Date, default: Date.now }
    },
    status: { 
        type: String, 
        enum: ['active', 'inactive', 'maintenance', 'full'], 
        default: 'active' 
    },
    installationDate: { type: Date, required: true },
    lastCollectionDate: { type: Date },
    totalCollections: { type: Number, default: 0 },
    totalAmountCollected: { type: Number, default: 0 },
    description: { type: String },
    notes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
})

// Index for geospatial queries - GeoJSON format
gullakSchema.index({ "location.coordinates": "2dsphere" })

// Virtual for caretaker details
gullakSchema.virtual('caretakerDetails', {
    ref: 'User',
    localField: 'caretaker.userId',
    foreignField: '_id',
    justOne: true
})

// Static method to generate next Gullak ID
gullakSchema.statics.generateGullakId = async function(): Promise<string> {
    const lastGullak = await this.findOne({}, {}, { sort: { 'createdAt': -1 } })
    
    if (!lastGullak) {
        return 'GUL-001'
    }
    
    const lastIdNumber = parseInt(lastGullak.gullakId.split('-')[1])
    const nextNumber = lastIdNumber + 1
    return `GUL-${nextNumber.toString().padStart(3, '0')}`
}

// Interface for static methods
interface IGullakModel extends Model<IGullak> {
    generateGullakId(): Promise<string>
}

export default mongoose.models.Gullak || mongoose.model<IGullak>("Gullak", gullakSchema, 'gullaks')