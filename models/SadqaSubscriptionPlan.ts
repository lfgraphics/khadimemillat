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

// Validation to ensure maxAmount >= minAmount
SadqaSubscriptionPlanSchema.pre('save', function(next) {
  if (this.maxAmount < this.minAmount) {
    next(new Error('Maximum amount must be greater than or equal to minimum amount'));
  }
  if (this.suggestedAmount < this.minAmount || this.suggestedAmount > this.maxAmount) {
    next(new Error('Suggested amount must be between minimum and maximum amounts'));
  }
  next();
});

// Index for efficient queries
SadqaSubscriptionPlanSchema.index({ isActive: 1, displayOrder: 1 });

const SadqaSubscriptionPlan = mongoose.models.SadqaSubscriptionPlan || mongoose.model<ISadqaSubscriptionPlan>('SadqaSubscriptionPlan', SadqaSubscriptionPlanSchema);

export default SadqaSubscriptionPlan;