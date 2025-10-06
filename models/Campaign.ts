import mongoose, { Schema, Document } from "mongoose"

export interface ICampaign extends Document {
    _id: string
    programId: mongoose.Types.ObjectId
    title: string
    slug: string // URL-friendly version of title
    description: string // Markdown content
    coverImage: string // Cloudinary URL
    goal: number
    raised: number
    supporters: mongoose.Types.ObjectId[] // References to CampaignDonation
    isActive: boolean
    isFeatured: boolean
    startDate: Date
    endDate?: Date
    createdBy: string // Clerk user ID
    lastUpdatedBy: string // Clerk user ID
}

const campaignSchema = new Schema<ICampaign>({
    // Use the Mongoose model name for ref, not the collection name
    programId: { type: Schema.Types.ObjectId, ref: "WelfareProgram", required: true },
    title: { type: String, required: true },
    slug: { type: String, required: true },
    description: { type: String, required: true }, // Markdown content
    coverImage: { type: String, required: true },
    goal: { type: Number, required: true, min: 0 },
    raised: { type: Number, default: 0, min: 0 },
    supporters: [{ type: Schema.Types.ObjectId, ref: "CampaignDonation" }],
    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    createdBy: { type: String, required: true },
    lastUpdatedBy: { type: String, required: true }
}, { timestamps: true })

campaignSchema.index({ programId: 1 })
campaignSchema.index({ slug: 1 }, { unique: true })
campaignSchema.index({ isActive: 1 })
campaignSchema.index({ isFeatured: 1 })
campaignSchema.index({ startDate: -1 })

export default mongoose.models.Campaign || mongoose.model<ICampaign>("Campaign", campaignSchema, 'campaigns')