import mongoose, { Schema, Document } from "mongoose"

export interface IScrapItem extends Document {
    scrapEntry: mongoose.Types.ObjectId
    name: string
    description?: string
    condition: "new" | "good" | "repairable" | "scrap" | 'not applicable'
    quantity: number
    availableQuantity: number
    photos: { before: string[]; after: string[] }
    marketplaceListing: {
        listed: boolean
        demandedPrice?: number
        salePrice?: number
        sold: boolean
        soldToUserId?: string
        soldToName?: string
        // soldVia indicates the channel by which the sale was finalized; when 'online', expect paymentMethod='online' in Purchase
        soldVia?: 'online' | 'chat' | 'offline'
        soldAt?: Date
        soldBy?: string
        conversationId?: mongoose.Types.ObjectId
    }
    repairingCost?: number
    profit?: number
}

const scrapItemSchema = new Schema<IScrapItem>({
    scrapEntry: { type: Schema.Types.ObjectId, ref: "DonationEntry", required: true },
    name: { type: String, required: true },
    description: { type: String },
    condition: { type: String, enum: ["new", "good", "repairable", "scrap", 'not applicable'], required: true },
    quantity: { type: Number, required: true, default: 1, min: 1 },
    availableQuantity: { type: Number, required: true, default: 1, min: 0 },
    photos: {
        before: [String],
        after: [String],
    },
    marketplaceListing: {
        listed: { type: Boolean, default: false },
        demandedPrice: Number,
        salePrice: Number,
        sold: { type: Boolean, default: false },
        soldToUserId: { type: String },
        soldToName: { type: String },
        soldVia: { type: String, enum: ['online', 'chat', 'offline'] },
        soldAt: { type: Date },
        soldBy: { type: String },
        conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation' },
    },
    repairingCost: Number,
}, { timestamps: true })

scrapItemSchema.virtual("profit").get(function () {
    if (this.marketplaceListing.sold && this.marketplaceListing.salePrice) {
        return this.marketplaceListing.salePrice - (this.repairingCost || 0)
    }
    return null
})

export default mongoose.models.ScrapItem || mongoose.model<IScrapItem>("ScrapItem", scrapItemSchema, 'scrap-items')
