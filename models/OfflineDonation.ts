import mongoose, { Schema, Document, models } from "mongoose";

export interface IOfflineDonation extends Document {
  isPublic: boolean;
  donorName: string;
  donorNumber: string,
  amount: number;
  notes?: string;
  collectedBy: {
    name: string;
    userId: string; // Clerk user ID (consistent with Gullak system)
  };
  type: 'cash' | 'cheque' | 'other';
  receivedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const OfflineDonationSchema = new Schema<IOfflineDonation>(
  {
    isPublic: {
      type: Boolean,
      default: true
    },
    donorName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    donorNumber: {
      type: String
    },
    amount: {
      type: Number,
      required: true,
      min: 1
    },
    notes: {
      type: String,
      default: "",
      maxlength: 500
    },
    collectedBy: {
      name: { type: String, required: true },
      userId: { type: String, required: true } // Clerk user ID
    },
    type: {
      type: String,
      enum: ['cash', 'cheque', 'other'],
      default: "cash"
    },
    receivedAt: {
      type: Date,
      required: true
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Index for efficient queries
OfflineDonationSchema.index({ receivedAt: -1 });
OfflineDonationSchema.index({ 'collectedBy.userId': 1 });
OfflineDonationSchema.index({ amount: -1 });

export default models.OfflineDonation || mongoose.model<IOfflineDonation>("OfflineDonation", OfflineDonationSchema);
