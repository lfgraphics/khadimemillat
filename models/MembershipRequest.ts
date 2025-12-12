import mongoose, { Document, Schema } from 'mongoose';

export interface IMembershipRequest extends Document {
  // User Information
  userId: string; // Clerk user ID
  userEmail?: string;
  
  // Legal Details
  fullName: string; // Name as per identity documents
  dateOfBirth: Date;
  primaryContactNumber: string;
  alternateContactNumber?: string;
  
  // Address Information
  currentAddress: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  permanentAddress: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  isSameAddress: boolean; // If current and permanent address are same
  
  // Identity Documents
  identityProofs: {
    documentType: 'aadhaar' | 'pan' | 'voter_id' | 'passport' | 'driving_license';
    documentNumber: string;
    images: string[]; // Cloudinary URLs (2-3 images)
  }[];
  
  // Request Status
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string; // Admin/Moderator user ID
  reviewComments?: string;
  
  // Membership Details (set after approval)
  membershipId?: string; // Generated membership ID
  membershipStartDate?: Date;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

const MembershipRequestSchema = new Schema<IMembershipRequest>({
  // User Information
  userId: { type: String, required: true, unique: true },
  userEmail: { type: String, required: false },
  
  // Legal Details
  fullName: { type: String, required: true, trim: true },
  dateOfBirth: { type: Date, required: true },
  primaryContactNumber: { type: String, required: true, trim: true },
  alternateContactNumber: { type: String, trim: true },
  
  // Address Information
  currentAddress: {
    street: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true },
    country: { type: String, required: true, default: 'India', trim: true }
  },
  permanentAddress: {
    street: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true },
    country: { type: String, required: true, default: 'India', trim: true }
  },
  isSameAddress: { type: Boolean, default: false },
  
  // Identity Documents
  identityProofs: [{
    documentType: {
      type: String,
      required: true,
      enum: ['aadhaar', 'pan', 'voter_id', 'passport', 'driving_license']
    },
    documentNumber: { type: String, required: true, trim: true },
    images: [{ type: String, required: true }] // Cloudinary URLs
  }],
  
  // Request Status
  status: {
    type: String,
    required: true,
    enum: ['pending', 'under_review', 'approved', 'rejected'],
    default: 'pending'
  },
  submittedAt: { type: Date, default: Date.now },
  reviewedAt: { type: Date },
  reviewedBy: { type: String },
  reviewComments: { type: String, trim: true },
  
  // Membership Details
  membershipId: { type: String, unique: true, sparse: true },
  membershipStartDate: { type: Date },
  
  // Metadata
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Indexes for better performance
MembershipRequestSchema.index({ status: 1 });
MembershipRequestSchema.index({ submittedAt: -1 });

// Generate membership ID after approval
MembershipRequestSchema.pre('save', async function(next) {
  if (this.isModified('status') && this.status === 'approved' && !this.membershipId) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('MembershipRequest').countDocuments({
      status: 'approved',
      membershipStartDate: {
        $gte: new Date(year, 0, 1),
        $lt: new Date(year + 1, 0, 1)
      }
    });
    
    this.membershipId = `KMWF-M-${year}-${String(count + 1).padStart(4, '0')}`;
    this.membershipStartDate = new Date();
  }
  next();
});

export default mongoose.models.MembershipRequest || mongoose.model<IMembershipRequest>('MembershipRequest', MembershipRequestSchema);