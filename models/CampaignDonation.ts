import mongoose, { Schema, Document } from "mongoose"

export interface ICampaignDonation extends Document {
    campaignId?: mongoose.Types.ObjectId
    programId: mongoose.Types.ObjectId
    donorId?: string // Clerk user ID (optional for logged out users)
    donorName: string // Display name for the donation
    donorEmail: string // Required email for all donations
    donorPhone?: string // Phone number for logged out users
    amount: number
    message?: string // Optional message from donor
    paymentMethod: 'online' | 'cash' | 'bank_transfer' | 'other'
    paymentReference?: string // Transaction ID or reference
    status: 'pending' | 'completed' | 'failed' | 'refunded'
    processedBy?: string // Clerk user ID of admin who processed
    processedAt?: Date
    // Razorpay tracking fields
    razorpayOrderId?: string
    razorpayPaymentId?: string
    razorpaySignature?: string
    paymentVerified?: boolean
    paymentVerifiedAt?: Date
}

const campaignDonationSchema = new Schema<ICampaignDonation>({
    campaignId: { type: Schema.Types.ObjectId, ref: "Campaign" },
    programId: { type: Schema.Types.ObjectId, ref: "WelfareProgram", required: true },
    donorId: { type: String }, // Optional for logged out users
    donorName: { type: String, required: true },
    donorEmail: { type: String, required: true }, // Required for all donations
    donorPhone: { type: String }, // For logged out users
    amount: { type: Number, required: true, min: 0 },
    message: { type: String },
    paymentMethod: { 
        type: String, 
        enum: ['online', 'cash', 'bank_transfer', 'other'], 
        required: true 
    },
    paymentReference: { type: String },
    status: { 
        type: String, 
        enum: ['pending', 'completed', 'failed', 'refunded'], 
        default: 'pending' 
    },
    processedBy: { type: String },
    processedAt: { type: Date },
    // Razorpay fields
    razorpayOrderId: { type: String, index: true },
    razorpayPaymentId: { type: String, index: true },
    razorpaySignature: { type: String },
    paymentVerified: { type: Boolean, default: false },
    paymentVerifiedAt: { type: Date }
}, { timestamps: true })

campaignDonationSchema.index({ campaignId: 1 })
campaignDonationSchema.index({ programId: 1 })
campaignDonationSchema.index({ donorId: 1 })
campaignDonationSchema.index({ status: 1 })
campaignDonationSchema.index({ createdAt: -1 })

export default mongoose.models.CampaignDonation || mongoose.model<ICampaignDonation>("CampaignDonation", campaignDonationSchema, 'campaign-donations')