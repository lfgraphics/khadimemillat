import mongoose, { Document, Schema } from 'mongoose';

export interface ISadqaSubscriptionPlan extends Document {
  planType: 'daily' | 'weekly' | 'monthly' | 'yearly';
  displayName: string;
  description: string;
  minAmount: number;
  maxAmount: number;
  suggestedAmount: number;
  intervalCount: number;
  intervalUnit: 'day' | 'week' | 'month' | 'year';
  isActive: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const SadqaSubscriptionPlanSchema = new Schema<ISadqaSubscriptionPlan>({
  planType: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
    required: true,
    unique: true,
    index: true
  },
  displayName: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  minAmount: {
    type: Number,
    required: true,
    min: 1
  },
  maxAmount: {
    type: Number,
    required: true,
    min: 1
  },
  suggestedAmount: {
    type: Number,
    required: true,
    min: 1
  },
  intervalCount: {
    type: Number,
    required: true,
    min: 1
  },
  intervalUnit: {
    type: String,
    enum: ['day', 'week', 'month', 'year'],
    required: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  displayOrder: {
    type: Number,
    required: true,
    default: 0
  }
}, {
  timestamps: true
});

// Validation to ensure amounts are valid
SadqaSubscriptionPlanSchema.pre('save', function(next) {
  if (this.maxAmount < 1) {
    next(new Error('Maximum amount must be at least ₹1'));
  }
  if (this.suggestedAmount < 1 || this.suggestedAmount > this.maxAmount) {
    next(new Error('Suggested amount must be between ₹1 and maximum amount'));
  }
  // Set minAmount to 1 if not provided or less than 1
  if (!this.minAmount || this.minAmount < 1) {
    this.minAmount = 1;
  }
  next();
});

// Index for efficient queries
SadqaSubscriptionPlanSchema.index({ isActive: 1, displayOrder: 1 });

const SadqaSubscriptionPlan = mongoose.models.SadqaSubscriptionPlan || mongoose.model<ISadqaSubscriptionPlan>('SadqaSubscriptionPlan', SadqaSubscriptionPlanSchema);

export default SadqaSubscriptionPlan;