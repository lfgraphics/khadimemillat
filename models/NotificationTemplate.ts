import mongoose, { Schema, Document } from 'mongoose'
import { Roles, RolesEnum } from '@/types/globals'

export interface INotificationTemplate extends Document {
  name: string
  title: string
  message: string
  channels: ('web_push' | 'email' | 'whatsapp' | 'sms')[]
  targetRoles: Roles[]
  category: 'campaign' | 'system' | 'custom'
  createdBy: string // Clerk user ID
  isActive: boolean
  usageCount: number
  createdAt: Date
  updatedAt: Date
  _id:string
}

const notificationTemplateSchema = new Schema<INotificationTemplate>({
  name: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 100
  },
  title: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 200
  },
  message: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 1000
  },
  channels: [{
    type: String,
    enum: ['web_push', 'email', 'whatsapp', 'sms'],
    required: true
  }],
  targetRoles: [{
    type: String,
    enum: [...RolesEnum, 'everyone'],
    required: true
  }],
  category: {
    type: String,
    enum: ['campaign', 'system', 'custom'],
    required: true,
    default: 'custom'
  },
  createdBy: { 
    type: String, 
    required: true 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  usageCount: { 
    type: Number, 
    default: 0,
    min: 0
  }
}, { 
  timestamps: true,
  collection: 'notification_templates'
})

// Indexes for efficient querying
notificationTemplateSchema.index({ createdBy: 1 })
notificationTemplateSchema.index({ category: 1 })
notificationTemplateSchema.index({ isActive: 1 })
notificationTemplateSchema.index({ name: 1, createdBy: 1 }, { unique: true })
notificationTemplateSchema.index({ createdAt: -1 })

export default mongoose.models.NotificationTemplate || 
  mongoose.model<INotificationTemplate>('NotificationTemplate', notificationTemplateSchema)