import mongoose, { Schema, models } from "mongoose";

const OfflineDonationSchema = new Schema(
  {
    donorName: { type: String, required: true },
    amount: { type: Number, required: true },
    notes: { type: String, default: "" },
    collectedBy: {
      type: {
        _id: false,
        name: String,
        user_id: String,
      }, required: true
    },
    type: { type: String, default: "cash" },
    receivedAt: { type: Date, required: true },
  },
  { timestamps: true }
);

export default models.OfflineDonation || mongoose.model("OfflineDonation", OfflineDonationSchema)
