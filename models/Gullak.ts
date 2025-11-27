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
        userId: string // Clerk user ID (not ObjectId since we use Clerk as source of truth)
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
    image?: string // Cloudinary URL for Gullak photo
    createdBy: string // Clerk user ID of admin/neki_bank_manager
    updatedBy?: string // Clerk user ID
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
        userId: { type: String, required: true }, // Clerk user ID
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
    image: { type: String }, // Cloudinary URL
    createdBy: { type: String, required: true }, // Clerk user ID
    updatedBy: { type: String } // Clerk user ID
}, { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
})

// Index for geospatial queries - GeoJSON format
gullakSchema.index({ "location.coordinates": "2dsphere" })

// Note: No virtual for caretaker details since we use Clerk as source of truth
// Caretaker details are fetched from Clerk API when needed

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

// Force model refresh to ensure schema changes are applied
if (mongoose.models.Gullak) {
    delete mongoose.models.Gullak
}

export default mongoose.model<IGullak>("Gullak", gullakSchema, 'gullaks')