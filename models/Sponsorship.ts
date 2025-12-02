import mongoose, { Document, Schema } from 'mongoose';

export interface ISponsorship extends Document {
  // Sponsor Information
  sponsorId: string; // Clerk user ID
  sponsorName: string;
  sponsorEmail: string;
  sponsorPhone?: string;
  
  // Beneficiary Information
  beneficiaryId: mongoose.Types.ObjectId; // Reference to FamilyMember
  beneficiaryName: string; // Anonymized or partial name
  categoryId: mongoose.Types.ObjectId; // Reference to Category
  categoryName: string;
  
  // Sponsorship Details
  monthlyAmount: number;
  requiredAmount: number; // Original requirement
  description: string;
  
  // Razorpay Subscription Details
  razorpayPlanId: string;
  razorpaySubscriptionId: string;
  razorpayCustomerId?: string;
  
  // Status and Tracking
  status: 'active' | 'paused' | 'cancelled' | 'completed' | 'pending';
  startDate: Date;
  endDate?: Date;
  nextPaymentDate?: Date;
  
  // Payment History
  totalPaid: number;
  paymentCount: number;
  lastPaymentDate?: Date;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  notes?: string;
}

const SponsorshipSchema = new Schema<ISponsorship>({
  // Sponsor Information
  sponsorId: {
    type: String,
    required: true,
    index: true
  },
  sponsorName: {
    type: String,
    required: true
  },
  sponsorEmail: {
    type: String,
    required: true
  },
  sponsorPhone: {
    type: String
  },
  
  // Beneficiary Information
  beneficiaryId: {
    type: Schema.Types.ObjectId,
    ref: 'FamilyMember',
    required: true,
    index: true
  },
  beneficiaryName: {
    type: String,
    required: true
  },
  categoryId: {
    type: Schema.Types.ObjectId,
    ref: 'Category',
    required: true,
    index: true
  },
  categoryName: {
    type: String,
    required: true
  },
  
  // Sponsorship Details
  monthlyAmount: {
    type: Number,
    required: true,
    min: 0
  },
  requiredAmount: {
    type: Number,
    required: true,
    min: 0
  },
  description: {
    type: String,
    required: true
  },
  
  // Razorpay Subscription Details
  razorpayPlanId: {
    type: String,
    required: true
  },
  razorpaySubscriptionId: {
    type: String,
    required: true
  },
  razorpayCustomerId: {
    type: String
  },
  
  // Status and Tracking
  status: {
    type: String,
    enum: ['active', 'paused', 'cancelled', 'completed', 'pending'],
    default: 'pending'
  },
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  endDate: {
    type: Date
  },
  nextPaymentDate: {
    type: Date
  },
  
  // Payment History
  totalPaid: {
    type: Number,
    default: 0,
    min: 0
  },
  paymentCount: {
    type: Number,
    default: 0,
    min: 0
  },
  lastPaymentDate: {
    type: Date
  },
  
  // Metadata
  notes: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
SponsorshipSchema.index({ sponsorId: 1, status: 1 });
SponsorshipSchema.index({ beneficiaryId: 1, status: 1 });
SponsorshipSchema.index({ categoryId: 1, status: 1 });
SponsorshipSchema.index({ nextPaymentDate: 1 });

// Virtual for beneficiary details
SponsorshipSchema.virtual('beneficiary', {
  ref: 'FamilyMember',
  localField: 'beneficiaryId',
  foreignField: '_id',
  justOne: true
});

// Virtual for category details
SponsorshipSchema.virtual('category', {
  ref: 'Category',
  localField: 'categoryId',
  foreignField: '_id',
  justOne: true
});

// Ensure virtuals are included in JSON output
SponsorshipSchema.set('toJSON', { virtuals: true });
SponsorshipSchema.set('toObject', { virtuals: true });

const Sponsorship = mongoose.models.Sponsorship || mongoose.model<ISponsorship>('Sponsorship', SponsorshipSchema);

export default Sponsorship;