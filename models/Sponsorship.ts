import mongoose, { Schema, Document } from "mongoose";

export interface PaymentRecord {
  amount: number;
  paymentDate: Date;
  paymentMethod: 'bank_transfer' | 'cash' | 'cheque' | 'online' | 'other';
  transactionId?: string;
  notes?: string;
  verifiedBy?: mongoose.Types.ObjectId;
  verifiedAt?: Date;
}

export interface SponsorshipTerms {
  monthlyAmount: number;
  frequency: 'monthly' | 'quarterly' | 'half_yearly' | 'yearly';
  duration: number; // in months
  autoRenewal: boolean;
  specialConditions?: string;
}

export interface ISponsorship extends Document {
  sponsorshipId: string;
  sponsorId: mongoose.Types.ObjectId;
  beneficiaryId: mongoose.Types.ObjectId;
  beneficiaryCardId: mongoose.Types.ObjectId;
  
  // Sponsorship Terms
  terms: SponsorshipTerms;
  
  // Status and Dates
  status: 'pending' | 'active' | 'paused' | 'completed' | 'cancelled' | 'expired';
  startDate: Date;
  endDate?: Date;
  pausedDate?: Date;
  resumedDate?: Date;
  
  // Payment Tracking
  totalCommittedAmount: number;
  totalPaidAmount: number;
  totalPendingAmount: number;
  lastPaymentDate?: Date;
  nextPaymentDue?: Date;
  paymentRecords: PaymentRecord[];
  
  // Communication and Updates
  allowDirectContact: boolean;
  communicationPreference: 'email' | 'sms' | 'both' | 'none';
  lastUpdateSent?: Date;
  updateFrequency: 'monthly' | 'quarterly' | 'half_yearly' | 'yearly';
  
  // Relationship Management
  relationshipNotes?: string;
  sponsorFeedback?: string;
  beneficiaryFeedback?: string;
  meetingRequests: {
    requestedBy: 'sponsor' | 'beneficiary';
    requestDate: Date;
    status: 'pending' | 'approved' | 'completed' | 'declined';
    scheduledDate?: Date;
    notes?: string;
  }[];
  
  // Administrative
  createdBy: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  cancelledBy?: mongoose.Types.ObjectId;
  cancelledAt?: Date;
  cancellationReason?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

const sponsorshipSchema = new Schema<ISponsorship>({
  sponsorshipId: { 
    type: String, 
    required: true, 
    unique: true,
    default: () => `SPO-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
  },
  sponsorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  beneficiaryId: { type: Schema.Types.ObjectId, ref: 'BeneficiaryCard', required: true },
  beneficiaryCardId: { type: Schema.Types.ObjectId, ref: 'BeneficiaryCard', required: true },
  
  // Sponsorship Terms
  terms: {
    monthlyAmount: { type: Number, required: true, min: 0 },
    frequency: { 
      type: String, 
      enum: ['monthly', 'quarterly', 'half_yearly', 'yearly'],
      required: true,
      default: 'monthly'
    },
    duration: { type: Number, required: true, min: 1 }, // in months
    autoRenewal: { type: Boolean, default: false },
    specialConditions: { type: String }
  },
  
  // Status and Dates
  status: { 
    type: String, 
    enum: ['pending', 'active', 'paused', 'completed', 'cancelled', 'expired'],
    default: 'pending'
  },
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  pausedDate: { type: Date },
  resumedDate: { type: Date },
  
  // Payment Tracking
  totalCommittedAmount: { type: Number, required: true, min: 0 },
  totalPaidAmount: { type: Number, default: 0, min: 0 },
  totalPendingAmount: { type: Number, default: 0, min: 0 },
  lastPaymentDate: { type: Date },
  nextPaymentDue: { type: Date },
  paymentRecords: [{
    amount: { type: Number, required: true, min: 0 },
    paymentDate: { type: Date, required: true },
    paymentMethod: { 
      type: String, 
      enum: ['bank_transfer', 'cash', 'cheque', 'online', 'other'],
      required: true 
    },
    transactionId: { type: String },
    notes: { type: String },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: { type: Date }
  }],
  
  // Communication and Updates
  allowDirectContact: { type: Boolean, default: false },
  communicationPreference: { 
    type: String, 
    enum: ['email', 'sms', 'both', 'none'],
    default: 'email'
  },
  lastUpdateSent: { type: Date },
  updateFrequency: { 
    type: String, 
    enum: ['monthly', 'quarterly', 'half_yearly', 'yearly'],
    default: 'quarterly'
  },
  
  // Relationship Management
  relationshipNotes: { type: String },
  sponsorFeedback: { type: String },
  beneficiaryFeedback: { type: String },
  meetingRequests: [{
    requestedBy: { 
      type: String, 
      enum: ['sponsor', 'beneficiary'],
      required: true 
    },
    requestDate: { type: Date, required: true },
    status: { 
      type: String, 
      enum: ['pending', 'approved', 'completed', 'declined'],
      default: 'pending'
    },
    scheduledDate: { type: Date },
    notes: { type: String }
  }],
  
  // Administrative
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date },
  cancelledBy: { type: Schema.Types.ObjectId, ref: 'User' },
  cancelledAt: { type: Date },
  cancellationReason: { type: String }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance (sponsorshipId already indexed via unique: true)
sponsorshipSchema.index({ sponsorId: 1 });
sponsorshipSchema.index({ beneficiaryId: 1 });
sponsorshipSchema.index({ status: 1 });
sponsorshipSchema.index({ startDate: 1 });
sponsorshipSchema.index({ nextPaymentDue: 1 });
sponsorshipSchema.index({ 'terms.frequency': 1 });

// Virtual for payment status
sponsorshipSchema.virtual('paymentStatus').get(function() {
  if (!this.nextPaymentDue) return 'no_due';
  
  const now = new Date();
  const dueDate = new Date(this.nextPaymentDue);
  const daysDiff = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysDiff < 0) return 'overdue';
  if (daysDiff <= 7) return 'due_soon';
  return 'current';
});

// Virtual for sponsorship progress
sponsorshipSchema.virtual('progressPercentage').get(function() {
  if (this.totalCommittedAmount === 0) return 0;
  return Math.round((this.totalPaidAmount / this.totalCommittedAmount) * 100);
});

// Pre-save middleware to calculate amounts and dates
sponsorshipSchema.pre('save', function(next) {
  // Calculate total committed amount based on terms
  if (this.isNew || this.isModified('terms')) {
    const { monthlyAmount, frequency, duration } = this.terms;
    let multiplier = 1;
    
    switch (frequency) {
      case 'monthly':
        multiplier = duration;
        break;
      case 'quarterly':
        multiplier = Math.ceil(duration / 3);
        break;
      case 'half_yearly':
        multiplier = Math.ceil(duration / 6);
        break;
      case 'yearly':
        multiplier = Math.ceil(duration / 12);
        break;
    }
    
    this.totalCommittedAmount = monthlyAmount * multiplier;
    
    // Set end date based on duration
    if (this.startDate) {
      this.endDate = new Date(this.startDate.getTime() + (duration * 30 * 24 * 60 * 60 * 1000));
    }
  }

  // Calculate total paid amount from payment records
  if (this.isModified('paymentRecords')) {
    this.totalPaidAmount = this.paymentRecords.reduce((total, payment) => total + payment.amount, 0);
    this.totalPendingAmount = this.totalCommittedAmount - this.totalPaidAmount;
    
    // Update last payment date
    if (this.paymentRecords.length > 0) {
      const sortedPayments = this.paymentRecords.sort((a, b) => 
        new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
      );
      this.lastPaymentDate = sortedPayments[0].paymentDate;
    }
  }

  // Calculate next payment due date
  if (this.status === 'active' && this.lastPaymentDate) {
    const lastPayment = new Date(this.lastPaymentDate);
    const { frequency } = this.terms;
    
    switch (frequency) {
      case 'monthly':
        this.nextPaymentDue = new Date(lastPayment.setMonth(lastPayment.getMonth() + 1));
        break;
      case 'quarterly':
        this.nextPaymentDue = new Date(lastPayment.setMonth(lastPayment.getMonth() + 3));
        break;
      case 'half_yearly':
        this.nextPaymentDue = new Date(lastPayment.setMonth(lastPayment.getMonth() + 6));
        break;
      case 'yearly':
        this.nextPaymentDue = new Date(lastPayment.setFullYear(lastPayment.getFullYear() + 1));
        break;
    }
  } else if (this.status === 'active' && !this.lastPaymentDate) {
    // First payment due based on start date
    this.nextPaymentDue = this.startDate;
  }

  next();
});

export default mongoose.models.Sponsorship || mongoose.model<ISponsorship>("Sponsorship", sponsorshipSchema);