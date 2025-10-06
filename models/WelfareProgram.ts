import mongoose, { Schema, Document } from "mongoose"

export interface IWelfareProgram extends Document {
    title: string
    slug: string // URL-friendly version of title
    description: string
    coverImage: string // Cloudinary URL
    icon: string // Icon name from Lucide React
    iconColor: string // Hex color for the icon background
    donationLink: string // Link to the program's donation page
    isActive: boolean
    totalRaised: number
    totalCampaigns: number
    totalSupporters: number
    displayOrder: number
}

const welfareProgramSchema = new Schema<IWelfareProgram>({
    title: { type: String, required: true },
    slug: { type: String, required: true },
    description: { type: String, required: true },
    coverImage: { type: String, required: true },
    icon: { type: String, required: true }, // e.g., "Users", "Heart", "Truck"
    iconColor: { type: String, required: true }, // e.g., "#3B82F6"
    donationLink: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    totalRaised: { type: Number, default: 0 },
    totalCampaigns: { type: Number, default: 0 },
    totalSupporters: { type: Number, default: 0 },
    displayOrder: { type: Number, default: 0 }
}, { timestamps: true })

welfareProgramSchema.index({ displayOrder: 1 })
welfareProgramSchema.index({ isActive: 1 })
welfareProgramSchema.index({ slug: 1 }, { unique: true })

export default mongoose.models.WelfareProgram || mongoose.model<IWelfareProgram>("WelfareProgram", welfareProgramSchema, 'welfare-programs')