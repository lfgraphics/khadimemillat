import mongoose, { Document, Schema } from 'mongoose';

export interface ISponsorshipPayment extends Document {
  // Reference Information
  sponsorshipId: mongoose.Types.ObjectId;
  sponsorId: string; // Clerk user ID
  beneficiaryId: mongoose.Types.ObjectId;
  
  // Payment Details
  amount: number;
  currency: string;
  
  // Razorpay Details
  razorpayPaymentId: string;
  razorpayOrderId?: string;
  razorpaySignature?: string;
  razorpaySubscriptionId: string;
  
  // Status and Tracking
  status: 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled';
  paymentMethod?: string;
  
  // Dates
  paymentDate: Date;
  dueDate: Date;
  paidAt?: Date;
  
  // Metadata
  description?: string;
  failureReason?: string;
  refundId?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

const SponsorshipPaymentSchema = new Schema<ISponsorshipPayment>({
  // Reference Information
  sponsorshipId: {
    type: Schema.Types.ObjectId,
    ref: 'Sponsorship',
    required: true,
    index: true
  },
  sponsorId: {
    type: String,
    required: true,
    index: true
  },
  beneficiaryId: {
    type: Schema.Types.ObjectId,
    ref: 'FamilyMember',
    required: true,
    index: true
  },
  
  // Payment Details
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'INR'
  },
  
  // Razorpay Details
  razorpayPaymentId: {
    type: String,
    required: true,
    unique: true
  },
  razorpayOrderId: {
    type: String
  },
  razorpaySignature: {
    type: String
  },
  razorpaySubscriptionId: {
    type: String,
    required: true,
    index: true
  },
  
  // Status and Tracking
  status: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded', 'cancelled'],
    default: 'pending'
  },
  paymentMethod: {
    type: String
  },
  
  // Dates
  paymentDate: {
    type: Date,
    required: true
  },
  dueDate: {
    type: Date,
    required: true
  },
  paidAt: {
    type: Date
  },
  
  // Metadata
  description: {
    type: String
  },
  failureReason: {
    type: String
  },
  refundId: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
SponsorshipPaymentSchema.index({ sponsorshipId: 1, paymentDate: -1 });
SponsorshipPaymentSchema.index({ sponsorId: 1, status: 1 });
SponsorshipPaymentSchema.index({ status: 1, dueDate: 1 });

const SponsorshipPayment = mongoose.models.SponsorshipPayment || mongoose.model<ISponsorshipPayment>('SponsorshipPayment', SponsorshipPaymentSchema);

export default SponsorshipPayment;