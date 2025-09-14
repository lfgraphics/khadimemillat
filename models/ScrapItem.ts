import mongoose, { Schema, Document } from "mongoose"

export interface IScrapItem extends Document {
    scrapEntry: mongoose.Types.ObjectId
    name: string
    condition: "new" | "good" | "repairable" | "scrap" | 'not applicable'
    photos: { before: string[]; after: string[] }
    marketplaceListing: {
        listed: boolean
        demandedPrice?: number
        salePrice?: number
        sold: boolean
    }
    repairingCost?: number
    profit?: number
}

const scrapItemSchema = new Schema<IScrapItem>({
    scrapEntry: { type: Schema.Types.ObjectId, ref: "DonationEntry", required: true },
    name: { type: String, required: true },
    condition: { type: String, enum: ["new", "good", "repairable", "scrap", 'not applicable'], required: true },
    photos: {
        before: [String],
        after: [String],
    },
    marketplaceListing: {
        listed: { type: Boolean, default: false },
        demandedPrice: Number,
        salePrice: Number,
        sold: { type: Boolean, default: false },
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
