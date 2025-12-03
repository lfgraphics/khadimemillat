import mongoose, { Document, Schema } from 'mongoose';

export interface ISadqaSubscription extends Document {
  // User Information
  clerkUserId: string;
  userEmail: string;
  userName: string;
  userPhone?: string;
  
  // Subscription Details
  planType: 'daily' | 'weekly' | 'monthly' | 'yearly';
  amount: number;
  currency: string;
  
  // Razorpay Integration
  razorpaySubscriptionId?: string;
  razorpayPlanId?: string;
  razorpayCustomerId?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  tempPlanId?: string;
  
  // Status Management
  status: 'active' | 'paused' | 'cancelled' | 'expired' | 'pending_payment';
  startDate: Date;
  nextPaymentDate?: Date;
  endDate?: Date;
  
  // Payment Tracking
  totalPaid: number;
  paymentCount: number;
  lastPaymentDate?: Date;
  failedPaymentCount: number;
  
  // Metadata
  notes?: string;
  pausedReason?: string;
  cancelledReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SadqaSubscriptionSchema = new Schema<ISadqaSubscription>({
  // User Information
  clerkUserId: {
    type: String,
    required: true,
    index: true
  },
  userEmail: {
    type: String,
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  userPhone: {
    type: String
  },
  
  // Subscription Details
  planType: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: 1
  },
  currency: {
    type: String,
    default: 'INR'
  },
  
  // Razorpay Integration
  razorpaySubscriptionId: {
    type: String,
    index: true,
    sparse: true,
    default: null
  },
  razorpayPlanId: {
    type: String
  },
  razorpayCustomerId: {
    type: String,
    index: true
  },
  razorpayOrderId: {
    type: String,
    index: true
  },
  razorpayPaymentId: {
    type: String,
    index: true
  },
  tempPlanId: {
    type: String
  },
  
  // Status Management
  status: {
    type: String,
    enum: ['active', 'paused', 'cancelled', 'expired', 'pending_payment'],
    default: 'pending_payment',
    index: true
  },
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  nextPaymentDate: {
    type: Date,
    index: true
  },
  endDate: {
    type: Date
  },
  
  // Payment Tracking
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
  failedPaymentCount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Metadata
  notes: {
    type: String
  },
  pausedReason: {
    type: String
  },
  cancelledReason: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
SadqaSubscriptionSchema.index({ clerkUserId: 1, status: 1 });
SadqaSubscriptionSchema.index({ status: 1, nextPaymentDate: 1 });
SadqaSubscriptionSchema.index({ planType: 1, status: 1 });
SadqaSubscriptionSchema.index({ createdAt: -1 });

// Virtual for active subscription check
SadqaSubscriptionSchema.virtual('isActive').get(function() {
  return this.status === 'active';
});

// Virtual for overdue payments
SadqaSubscriptionSchema.virtual('isOverdue').get(function() {
  return this.status === 'active' && this.nextPaymentDate! < new Date();
});

// Ensure virtuals are included in JSON output
SadqaSubscriptionSchema.set('toJSON', { virtuals: true });
SadqaSubscriptionSchema.set('toObject', { virtuals: true });

const SadqaSubscription = mongoose.models.SadqaSubscription || mongoose.model<ISadqaSubscription>('SadqaSubscription', SadqaSubscriptionSchema);

export default SadqaSubscription;