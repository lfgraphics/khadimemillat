import mongoose, { Document, Schema } from 'mongoose';

export interface IFamilyMember extends Document {
  // Basic Information
  name: string;
  age: number;
  religion: string;
  relationship: string;
  educationLevel: string;
  occupation?: string;
  monthlyIncome: number;
  maritalStatus: string;
  healthStatus: string;
  employmentStatus: string;
  isDependent: boolean;
  hasDisability: boolean;
  disabilityType?: string;
  
  // Extended Information
  socialStatus: string[];
  certificates: boolean;
  incomeFromOtherSources: number;
  identityDocuments?: {
    aadhaar?: {
      number?: string;
      needsCorrection: boolean;
      correctionType?: string;
      needsNew: boolean;
    };
    voterId?: {
      number?: string;
      needsCorrection: boolean;
      correctionType?: string;
      needsNew: boolean;
    };
  };
  
  // Survey Relationship
  surveyId: mongoose.Types.ObjectId;
  surveyHumanId: string; // Human readable survey ID
  memberIndex: number; // Position in family
  
  // Sponsorship Properties (Moderator Managed)
  sponsorship: {
    availableForSponsorship: boolean;
    category?: string; // Use centralized categories from lib/categories.ts
    description?: string;
    memberHumanId?: string; // Human readable member ID (e.g., KMWF-2024-001-M01)
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    monthlyRequirement?: number;
    notes?: string;
    assignedSponsor?: mongoose.Types.ObjectId;
    sponsorshipStartDate?: Date;
    sponsorshipEndDate?: Date;
    sponsorshipStatus?: 'available' | 'sponsored' | 'completed' | 'suspended';
  };
  
  // Photos and Documents
  photos: {
    category: string;
    url: string;
    publicId: string;
    documentType?: string;
    description?: string;
    uploadedAt: Date;
  }[];
  
  // Audit Fields
  createdAt: Date;
  updatedAt: Date;
  createdBy: mongoose.Types.ObjectId;
  lastModifiedBy: mongoose.Types.ObjectId;
}

const FamilyMemberSchema = new Schema<IFamilyMember>({
  // Basic Information
  name: { type: String, required: true },
  age: { type: Number, required: true },
  religion: { type: String, required: true },
  relationship: { type: String, required: true },
  educationLevel: { 
    type: String, 
    enum: ['illiterate', 'primary', 'middle', 'matric', 'intermediate', 'graduate', 'postgraduate', 'other'],
    required: true 
  },
  occupation: { type: String },
  monthlyIncome: { type: Number, default: 0 },
  maritalStatus: { 
    type: String, 
    enum: ['single', 'married', 'divorced', 'widowed'],
    required: true 
  },
  healthStatus: { 
    type: String, 
    enum: ['healthy', 'chronically_ill', 'disabled', 'elderly'],
    required: true 
  },
  employmentStatus: { 
    type: String, 
    enum: ['employed', 'unemployed', 'student', 'retired', 'disabled', 'homemaker'],
    required: true 
  },
  isDependent: { type: Boolean, default: false },
  hasDisability: { type: Boolean, default: false },
  disabilityType: { type: String },
  
  // Extended Information
  socialStatus: [{ type: String }],
  certificates: { type: Boolean, default: false },
  incomeFromOtherSources: { type: Number, default: 0 },
  identityDocuments: {
    aadhaar: {
      number: { type: String },
      needsCorrection: { type: Boolean, default: false },
      correctionType: { type: String },
      needsNew: { type: Boolean, default: false }
    },
    voterId: {
      number: { type: String },
      needsCorrection: { type: Boolean, default: false },
      correctionType: { type: String },
      needsNew: { type: Boolean, default: false }
    }
  },
  
  // Survey Relationship
  surveyId: { type: Schema.Types.ObjectId, ref: 'SurveyResponse', required: true },
  surveyHumanId: { type: String, required: true },
  memberIndex: { type: Number, required: true },
  
  // Sponsorship Properties
  sponsorship: {
    availableForSponsorship: { type: Boolean, default: false },
    category: { 
      type: String // Use centralized categories from lib/categories.ts
    },
    description: { type: String },
    memberHumanId: { type: String }, // Will be generated: KMWF-YYYY-XXX-M##
    priority: { 
      type: String, 
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    monthlyRequirement: { type: Number },
    notes: { type: String },
    assignedSponsor: { type: Schema.Types.ObjectId, ref: 'User' },
    sponsorshipStartDate: { type: Date },
    sponsorshipEndDate: { type: Date },
    sponsorshipStatus: { 
      type: String, 
      enum: ['available', 'sponsored', 'completed', 'suspended'],
      default: 'available'
    }
  },
  
  // Photos and Documents
  photos: [{
    category: { type: String, required: true },
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    documentType: { type: String },
    description: { type: String },
    uploadedAt: { type: Date, default: Date.now }
  }],
  
  // Audit Fields
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  lastModifiedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, {
  timestamps: true
});

// Indexes for better performance
FamilyMemberSchema.index({ surveyId: 1, memberIndex: 1 });
FamilyMemberSchema.index({ 'sponsorship.availableForSponsorship': 1 });
FamilyMemberSchema.index({ 'sponsorship.memberHumanId': 1 }, { sparse: true, unique: true });
FamilyMemberSchema.index({ 'sponsorship.category': 1 });
FamilyMemberSchema.index({ 'sponsorship.sponsorshipStatus': 1 });

// Generate human readable member ID
FamilyMemberSchema.pre('save', async function(next) {
  if (this.isNew && this.sponsorship.availableForSponsorship && !this.sponsorship.memberHumanId) {
    const year = new Date().getFullYear();
    const surveyNumber = this.surveyHumanId.split('-').pop() || '001';
    const memberNumber = String(this.memberIndex + 1).padStart(2, '0');
    this.sponsorship.memberHumanId = `KMWF-${year}-${surveyNumber}-M${memberNumber}`;
  }
  next();
});

// Post-save hook to update survey response
FamilyMemberSchema.post('save', async function(doc) {
  try {
    const SurveyResponse = mongoose.model('SurveyResponse');
    await SurveyResponse.findByIdAndUpdate(doc.surveyId, {
      lastModifiedAt: new Date(),
      lastModifiedBy: doc.lastModifiedBy
    });
  } catch (error) {
    console.error('Error updating survey after member save:', error);
  }
});

// Pre-remove hook to clean up photos
FamilyMemberSchema.pre('deleteOne', { document: true, query: false }, async function(next) {
  try {
    // Clean up Cloudinary photos
    const cloudinary = require('cloudinary').v2;
    for (const photo of this.photos) {
      if (photo.publicId) {
        await cloudinary.uploader.destroy(photo.publicId);
      }
    }
  } catch (error) {
    console.error('Error cleaning up photos:', error);
  }
  next();
});

export default mongoose.models.FamilyMember || mongoose.model<IFamilyMember>('FamilyMember', FamilyMemberSchema);