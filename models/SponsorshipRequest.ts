import mongoose, { Document, Schema } from 'mongoose';

export interface ISponsorshipRequest extends Document {
  // Request Information
  requestId: string;
  applicantName: string;
  fatherName: string;
  
  // Contact Information
  contactInfo: {
    phone: string;
    alternatePhone?: string;
  };
  
  // Address
  fullAddress: string;
  
  // Request Details
  basicRequest: {
    reasonForRequest: string;
  };
  
  // Status and Assignment
  status: 'pending' | 'assigned' | 'surveyed' | 'approved' | 'rejected' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  
  // Assignment (Clerk user IDs as strings)
  assignedOfficer?: string; // Clerk user ID
  assignedDate?: Date;
  
  // Survey Connection
  surveyId?: mongoose.Types.ObjectId;
  
  // Submission Details (Clerk user ID as string)
  submittedBy?: string; // Clerk user ID
  
  // Management
  createdAt: Date;
  updatedAt: Date;
  
  // Status History
  statusHistory?: Array<{
    status: string;
    changedAt: Date;
    changedBy: string; // Clerk user ID
    reason?: string;
  }>;
  
  // Notes
  adminNotes?: string;
}

const SponsorshipRequestSchema = new Schema<ISponsorshipRequest>({
  requestId: {
    type: String,
    required: true,
    default: () => `REQ-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
  },
  
  applicantName: {
    type: String,
    required: true,
    trim: true
  },
  
  fatherName: {
    type: String,
    required: true,
    trim: true
  },
  
  contactInfo: {
    phone: {
      type: String,
      required: true
    },
    alternatePhone: {
      type: String
    }
  },
  
  fullAddress: {
    type: String,
    required: true
  },
  
  basicRequest: {
    reasonForRequest: {
      type: String,
      required: true
    }
  },
  
  status: {
    type: String,
    enum: ['pending', 'assigned', 'surveyed', 'approved', 'rejected', 'cancelled'],
    default: 'pending'
  },
  
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  // Clerk user IDs stored as strings
  assignedOfficer: {
    type: String // Clerk user ID
  },
  
  assignedDate: {
    type: Date
  },
  
  surveyId: {
    type: Schema.Types.ObjectId,
    ref: 'SurveyResponse'
  },
  
  submittedBy: {
    type: String // Clerk user ID
  },
  
  statusHistory: [{
    status: {
      type: String,
      required: true
    },
    changedAt: {
      type: Date,
      default: Date.now
    },
    changedBy: {
      type: String, // Clerk user ID
      required: true
    },
    reason: String
  }],
  
  adminNotes: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes
SponsorshipRequestSchema.index({ requestId: 1 }, { unique: true });
SponsorshipRequestSchema.index({ status: 1 });
SponsorshipRequestSchema.index({ priority: 1 });
SponsorshipRequestSchema.index({ assignedOfficer: 1 });
SponsorshipRequestSchema.index({ submittedBy: 1 });
SponsorshipRequestSchema.index({ createdAt: -1 });

// Pre-save middleware to add status history
SponsorshipRequestSchema.pre('save', function(next) {
  if (this.isModified('status') && !this.isNew && this.submittedBy) {
    this.statusHistory = this.statusHistory || [];
    this.statusHistory.push({
      status: this.status,
      changedAt: new Date(),
      changedBy: this.submittedBy,
      reason: 'Status updated'
    });
  }
  next();
});

// Virtual for survey details
SponsorshipRequestSchema.virtual('surveyDetails', {
  ref: 'SurveyResponse',
  localField: 'surveyId',
  foreignField: '_id',
  justOne: true
});

// Ensure virtuals are included in JSON output
SponsorshipRequestSchema.set('toJSON', { virtuals: true });
SponsorshipRequestSchema.set('toObject', { virtuals: true });

const SponsorshipRequest = mongoose.models.SponsorshipRequest || mongoose.model<ISponsorshipRequest>('SponsorshipRequest', SponsorshipRequestSchema);

export default SponsorshipRequest;