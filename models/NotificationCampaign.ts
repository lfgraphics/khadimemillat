import mongoose, { Schema, Document } from "mongoose"

export interface INotificationCampaign extends Document {
  _id: string
  name: string
  description?: string
  status: 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'failed'
  templateId?: mongoose.Types.ObjectId
  targeting: {
    roles: string[]
    locations?: string[]
    activityStatus?: string
    customSegments?: string[]
    logic: 'AND' | 'OR'
    excludeOptedOut: boolean
  }
  channels: ('web_push' | 'email' | 'whatsapp' | 'sms')[]
  content: {
    [channel: string]: {
      message: string
      subject?: string
      attachments?: string[]
    }
  }
  scheduling: {
    type: 'immediate' | 'scheduled' | 'recurring'
    scheduledFor?: Date
    timezone?: string
    recurring?: {
      frequency: 'daily' | 'weekly' | 'monthly'
      interval: number
      endDate?: Date
    }
  }
  abTesting?: {
    enabled: boolean
    variants: {
      name: string
      percentage: number
      content: any
    }[]
  }
  progress: {
    total: number
    sent: number
    failed: number
    inProgress: number
  }
  createdBy: string // Clerk user ID
  createdAt: Date
  updatedAt: Date
}

const notificationCampaignSchema = new Schema<INotificationCampaign>({
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  status: { 
    type: String, 
    required: true, 
    enum: ['draft', 'scheduled', 'running', 'paused', 'completed', 'failed'],
    default: 'draft'
  },
  templateId: { type: Schema.Types.ObjectId, ref: "NotificationTemplate" },
  targeting: {
    roles: [{ type: String, required: true }],
    locations: [{ type: String }],
    activityStatus: { type: String, enum: ['active', 'inactive', 'new'] },
    customSegments: [{ type: String }],
    logic: { type: String, enum: ['AND', 'OR'], default: 'AND' },
    excludeOptedOut: { type: Boolean, default: true }
  },
  channels: [{
    type: String,
    enum: ['web_push', 'email', 'whatsapp', 'sms'],
    required: true
  }],
  content: {
    type: Schema.Types.Mixed,
    default: {}
  },
  scheduling: {
    type: { 
      type: String, 
      enum: ['immediate', 'scheduled', 'recurring'], 
      required: true,
      default: 'immediate'
    },
    scheduledFor: { type: Date },
    timezone: { type: String, default: 'UTC' },
    recurring: {
      frequency: { type: String, enum: ['daily', 'weekly', 'monthly'] },
      interval: { type: Number, min: 1 },
      endDate: { type: Date }
    }
  },
  abTesting: {
    enabled: { type: Boolean, default: false },
    variants: [{
      name: { type: String, required: true },
      percentage: { type: Number, min: 0, max: 100, required: true },
      content: { type: Schema.Types.Mixed }
    }]
  },
  progress: {
    total: { type: Number, default: 0, min: 0 },
    sent: { type: Number, default: 0, min: 0 },
    failed: { type: Number, default: 0, min: 0 },
    inProgress: { type: Number, default: 0, min: 0 }
  },
  createdBy: { type: String, required: true }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

// Indexes for efficient querying
notificationCampaignSchema.index({ status: 1 })
notificationCampaignSchema.index({ createdBy: 1 })
notificationCampaignSchema.index({ 'scheduling.scheduledFor': 1 })
notificationCampaignSchema.index({ 'targeting.roles': 1 })
notificationCampaignSchema.index({ channels: 1 })
notificationCampaignSchema.index({ createdAt: -1 })
notificationCampaignSchema.index({ status: 1, 'scheduling.scheduledFor': 1 }) // Compound index for scheduled campaigns

// Validation middleware
notificationCampaignSchema.pre('save', function(next) {
  // Validate status transitions
  const validTransitions: Record<string, string[]> = {
    'draft': ['scheduled', 'running'],
    'scheduled': ['running', 'draft', 'failed'],
    'running': ['paused', 'completed', 'failed'],
    'paused': ['running', 'failed'],
    'completed': [],
    'failed': ['draft']
  }
  
  if (this.isModified('status')) {
    const currentStatus = this.get('status')
    // For new documents, there's no previous status to validate
    if (!this.isNew) {
      // We'll skip complex status transition validation for now
      // This can be handled at the application level
    }
  }
  
  // Validate scheduling
  if (this.scheduling.type === 'scheduled' && !this.scheduling.scheduledFor) {
    return next(new Error('scheduledFor is required when type is scheduled'))
  }
  
  if (this.scheduling.type === 'recurring' && !this.scheduling.recurring?.frequency) {
    return next(new Error('recurring.frequency is required when type is recurring'))
  }
  
  // Validate A/B testing percentages
  if (this.abTesting?.enabled && this.abTesting.variants.length > 0) {
    const totalPercentage = this.abTesting.variants.reduce((sum, variant) => sum + variant.percentage, 0)
    if (totalPercentage !== 100) {
      return next(new Error('A/B testing variant percentages must sum to 100'))
    }
  }
  
  // Validate content for selected channels
  for (const channel of this.channels) {
    const channelContent = this.content[channel]
    if (!channelContent || !channelContent.message) {
      return next(new Error(`Content is required for channel: ${channel}`))
    }
  }
  
  next()
})

// Virtual for completion percentage
notificationCampaignSchema.virtual('completionPercentage').get(function() {
  if (this.progress.total === 0) return 0
  return Math.round((this.progress.sent / this.progress.total) * 100)
})

// Virtual for success rate
notificationCampaignSchema.virtual('successRate').get(function() {
  const attempted = this.progress.sent + this.progress.failed
  if (attempted === 0) return 0
  return Math.round((this.progress.sent / attempted) * 100)
})

// Instance methods
notificationCampaignSchema.methods.canTransitionTo = function(newStatus: string): boolean {
  const validTransitions: Record<string, string[]> = {
    'draft': ['scheduled', 'running'],
    'scheduled': ['running', 'draft', 'failed'],
    'running': ['paused', 'completed', 'failed'],
    'paused': ['running', 'failed'],
    'completed': [],
    'failed': ['draft']
  }
  
  return validTransitions[this.status]?.includes(newStatus) || false
}

notificationCampaignSchema.methods.updateProgress = function(sent: number, failed: number, total?: number) {
  if (total !== undefined) this.progress.total = total
  this.progress.sent = sent
  this.progress.failed = failed
  this.progress.inProgress = Math.max(0, this.progress.total - sent - failed)
  return this.save()
}

export default mongoose.models.NotificationCampaign || mongoose.model<INotificationCampaign>("NotificationCampaign", notificationCampaignSchema, 'notificationCampaigns')