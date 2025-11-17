import mongoose, { Document, Schema } from 'mongoose';

export interface ICategory extends Document {
  // Basic Information
  name: string;
  slug: string; // URL-friendly identifier
  type: 'sponsorship' | 'survey' | 'general';
  label: string;
  description: string;
  
  // Visual Properties
  color: string;
  icon?: string;
  
  // Category Specific Properties
  priority?: number; // For survey categories
  defaultMonthlyAmount?: number; // For sponsorship categories
  
  // Eligibility Rules (for sponsorship categories)
  eligibilityRules?: {
    minAge?: number;
    maxAge?: number;
    relationships?: string[];
    healthStatuses?: string[];
    conditions?: string[];
    maritalStatuses?: string[];
  };
  
  // Status and Management
  active: boolean;
  sortOrder: number;
  
  // Metadata
  createdBy: mongoose.Types.ObjectId;
  updatedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  
  // Usage Statistics
  usageCount?: number;
  lastUsed?: Date;
}

const CategorySchema = new Schema<ICategory>({
  name: {
    type: String,
    required: true,
    trim: true
  },
  
  slug: {
    type: String,
    lowercase: true,
    trim: true
  },
  
  type: {
    type: String,
    enum: ['sponsorship', 'survey', 'general'],
    required: true
  },
  
  label: {
    type: String,
    required: true,
    trim: true
  },
  
  description: {
    type: String,
    required: true
  },
  
  color: {
    type: String,
    required: true,
    default: 'gray'
  },
  
  icon: {
    type: String
  },
  
  priority: {
    type: Number,
    min: 1,
    max: 10
  },
  
  defaultMonthlyAmount: {
    type: Number,
    min: 0
  },
  
  eligibilityRules: {
    minAge: {
      type: Number,
      min: 0,
      max: 120
    },
    maxAge: {
      type: Number,
      min: 0,
      max: 120
    },
    relationships: [{
      type: String,
      lowercase: true
    }],
    healthStatuses: [{
      type: String,
      lowercase: true
    }],
    conditions: [{
      type: String,
      lowercase: true
    }],
    maritalStatuses: [{
      type: String,
      lowercase: true
    }]
  },
  
  active: {
    type: Boolean,
    default: true
  },
  
  sortOrder: {
    type: Number,
    default: 0
  },
  
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  usageCount: {
    type: Number,
    default: 0
  },
  
  lastUsed: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes
CategorySchema.index({ type: 1, active: 1 });
CategorySchema.index({ slug: 1 }, { unique: true });
CategorySchema.index({ sortOrder: 1 });
CategorySchema.index({ createdBy: 1 });

// Pre-save middleware to generate slug
CategorySchema.pre('save', function(next) {
  if (this.isModified('name') || this.isNew) {
    if (this.name) {
      this.slug = this.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
    }
  }
  next();
});

// Method to check eligibility
CategorySchema.methods.checkEligibility = function(member: {
  age: number;
  relationship: string;
  healthStatus: string;
  maritalStatus?: string;
  hasDisability?: boolean;
}): boolean {
  if (this.type !== 'sponsorship' || !this.eligibilityRules) {
    return true;
  }

  const rules = this.eligibilityRules;

  // Age checks
  if (rules.minAge && member.age < rules.minAge) return false;
  if (rules.maxAge && member.age > rules.maxAge) return false;

  // Relationship checks
  if (rules.relationships && rules.relationships.length > 0) {
    if (!rules.relationships.includes(member.relationship?.toLowerCase())) return false;
  }

  // Health status checks
  if (rules.healthStatuses && rules.healthStatuses.length > 0) {
    if (!rules.healthStatuses.includes(member.healthStatus?.toLowerCase())) return false;
  }

  // Marital status checks
  if (rules.maritalStatuses && rules.maritalStatuses.length > 0) {
    if (!rules.maritalStatuses.includes(member.maritalStatus?.toLowerCase())) return false;
  }

  // Condition checks
  if (rules.conditions && rules.conditions.length > 0) {
    const memberConditions: string[] = [];
    
    if (member.age < 18) memberConditions.push('student', 'school_age', 'minor');
    if (member.age >= 18 && member.age <= 30) memberConditions.push('student', 'higher_education', 'young_adult');
    if (member.hasDisability) memberConditions.push('has_disability', 'disabled');
    if (member.healthStatus?.includes('chronic') || member.healthStatus?.includes('disabled')) {
      memberConditions.push('medical_needs', 'chronic_illness');
    }
    if (member.maritalStatus === 'widowed') memberConditions.push('widowed');
    if (member.age >= 60) memberConditions.push('elderly', 'senior');
    
    const hasRequiredCondition = rules.conditions.some((condition: string) => 
      memberConditions.includes(condition)
    );
    
    if (!hasRequiredCondition) return false;
  }

  return true;
};

// Static method to get categories by type
CategorySchema.statics.getByType = function(type: string, activeOnly: boolean = true) {
  const query: any = { type };
  if (activeOnly) query.active = true;
  
  return this.find(query).sort({ sortOrder: 1, name: 1 });
};

// Static method to get eligible categories for a member
CategorySchema.statics.getEligibleForMember = function(member: any) {
  return this.find({ 
    type: 'sponsorship', 
    active: true 
  })
  .sort({ sortOrder: 1, name: 1 })
  .then((categories: any[]) => {
    return categories.filter((category: any) => category.checkEligibility(member));
  });
};

export default mongoose.models.Category || mongoose.model<ICategory>('Category', CategorySchema);