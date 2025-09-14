import mongoose, { Schema, Document } from "mongoose"

export interface IScrapEntry extends Document {
    donor: mongoose.Types.ObjectId
    collectedBy?: mongoose.Types.ObjectId
    verifiedBy?: mongoose.Types.ObjectId
    items: mongoose.Types.ObjectId[]
}

const scrapEntrySchema = new Schema<IScrapEntry>({
    donor: { type: Schema.Types.ObjectId, ref: "User", required: true },
    collectedBy: { type: Schema.Types.ObjectId, ref: "User" },
    verifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
    items: [{ type: Schema.Types.ObjectId, ref: "ScrapItem" }],
}, { timestamps: true })

export default mongoose.models.ScrapEntry || mongoose.model<IScrapEntry>("ScrapEntry", scrapEntrySchema, 'scrap-entries')
