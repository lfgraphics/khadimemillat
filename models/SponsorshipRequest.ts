import mongoose, { Schema, Document } from "mongoose";

export interface ContactInfo {
  phone: string;
  email?: string;
  alternatePhone?: string;
}

export interface FamilyMember {
  name: string;
  age: number;
  relationship: string;
  education?: string;
  occupation?: string;
  monthlyIncome?: number;
  maritalStatus?: string;
  healthStatus?: string;
  isDependent: boolean;
}

export interface BasicRequest {
  reasonForRequest: string;
}

export interface ISponsorshipRequest extends Document {
  requestId: string;
  applicantName: string;
  fatherName: string;
  aadhaar?: string; // Optional Aadhaar number
  contactInfo: ContactInfo;
  fullAddress: string;
  basicRequest: BasicRequest;
  status: 'pending' | 'assigned' | 'surveyed' | 'approved' | 'rejected' | 'cancelled';
  assignedOfficer?: mongoose.Types.ObjectId;
  assignedDate?: Date;
  submittedBy?: mongoose.Types.ObjectId; // User who submitted the request
  notes?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: Date;
  updatedAt: Date;
}

const sponsorshipRequestSchema = new Schema({
  requestId: { 
    type: String, 
    required: true, 
    unique: true,
    default: () => `REQ-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
  },
  applicantName: { type: String, required: true, trim: true },
  fatherName: { type: String, required: true, trim: true },
  aadhaar: { 
    type: String, 
    required: false, // Optional field
    sparse: true, // Allow multiple null values
    validate: {
      validator: function(v: string) {
        if (!v) return true; // Allow empty/null values
        return /^\d{12}$/.test(v); // Only accept 12-digit Aadhaar format
      },
      message: 'Aadhaar must be exactly 12 digits'
    }
  },
  contactInfo: {
    phone: { 
      type: String, 
      required: true,
      validate: {
        validator: function(v: string) {
          // More flexible phone validation - at least 10 digits
          return /^[\+]?[0-9]{10,15}$/.test(v.replace(/[\s\-\(\)]/g, ''));
        },
        message: 'Phone number must be at least 10 digits'
      }
    },
    email: { 
      type: String,
      validate: {
        validator: function(v: string) {
          return !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: 'Email must be valid format'
      }
    },
    alternatePhone: { type: String }
  },
  fullAddress: { type: String, required: true },
  basicRequest: {
    reasonForRequest: { type: String, required: true }
  },
  status: { 
    type: String, 
    enum: ['pending', 'assigned', 'surveyed', 'approved', 'rejected', 'cancelled'],
    default: 'pending'
  },
  assignedOfficer: { type: Schema.Types.ObjectId, ref: 'User' },
  assignedDate: { type: Date },
  submittedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  notes: { type: String },
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance (requestId already indexed via unique: true)
sponsorshipRequestSchema.index({ status: 1 });
sponsorshipRequestSchema.index({ assignedOfficer: 1 });
sponsorshipRequestSchema.index({ createdAt: -1 });
sponsorshipRequestSchema.index({ priority: 1, status: 1 });

// Virtual for basic request info
sponsorshipRequestSchema.virtual('requestSummary').get(function() {
  return {
    name: this.applicantName,
    reason: this.basicRequest?.reasonForRequest || 'No reason provided',
    contact: this.contactInfo?.phone || 'No contact provided'
  };
});

// Pre-save middleware to set default priority
sponsorshipRequestSchema.pre('save', function(next) {
  if (this.isNew) {
    // All new requests start with medium priority
    // Priority will be updated after survey completion
    this.priority = 'medium';
  }
  next();
});

// Clear any existing model to avoid conflicts
if (mongoose.models.SponsorshipRequest) {
  delete mongoose.models.SponsorshipRequest;
}

export default mongoose.model<ISponsorshipRequest>("SponsorshipRequest", sponsorshipRequestSchema);