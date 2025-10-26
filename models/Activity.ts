import mongoose, { Document, Schema } from 'mongoose';

export interface IActivity extends Document {
  title?: string;
  description?: string;
  images: string[]; // Array of image URLs/paths
  date: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string; // Clerk user ID
  updatedBy?: string; // Clerk user ID
}

const ActivitySchema = new Schema<IActivity>({
  title: { 
    type: String, 
    trim: true,
    maxlength: 200
  },
  description: { 
    type: String, 
    trim: true,
    maxlength: 2000
  },
  images: [{ 
    type: String, 
    required: true 
  }],
  date: { 
    type: Date, 
    default: Date.now 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  createdBy: { 
    type: String 
  },
  updatedBy: { 
    type: String 
  }
}, {
  timestamps: true
});

// Index for better query performance
ActivitySchema.index({ date: -1, isActive: 1 });
ActivitySchema.index({ createdAt: -1 });

export default mongoose.models.Activity || mongoose.model<IActivity>('Activity', ActivitySchema);