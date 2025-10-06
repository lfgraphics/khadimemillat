import mongoose, { Schema, Document } from "mongoose"

export interface IUserPreferences extends Document {
  _id: string
  userId: string // Clerk user ID
  channels: {
    webPush: boolean
    email: boolean
    whatsapp: boolean
    sms: boolean
  }
  categories: {
    system: boolean
    campaigns: boolean
    emergency: boolean
    updates: boolean
  }
  quietHours: {
    enabled: boolean
    start: string // HH:mm format
    end: string // HH:mm format
    timezone: string
  }
  frequency: {
    maxPerDay: number
    maxPerWeek: number
  }
  createdAt: Date
  updatedAt: Date
}

const userPreferencesSchema = new Schema<IUserPreferences>({
  userId: { 
    type: String, 
    required: true, 
    unique: true,
    index: true
  },
  channels: {
    webPush: { type: Boolean, default: true },
    email: { type: Boolean, default: true },
    whatsapp: { type: Boolean, default: false },
    sms: { type: Boolean, default: false }
  },
  categories: {
    system: { type: Boolean, default: true },
    campaigns: { type: Boolean, default: true },
    emergency: { type: Boolean, default: true }, // Emergency notifications should default to enabled
    updates: { type: Boolean, default: true }
  },
  quietHours: {
    enabled: { type: Boolean, default: false },
    start: { 
      type: String, 
      default: '22:00',
      validate: {
        validator: function(v: string) {
          return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v)
        },
        message: 'Start time must be in HH:mm format'
      }
    },
    end: { 
      type: String, 
      default: '08:00',
      validate: {
        validator: function(v: string) {
          return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v)
        },
        message: 'End time must be in HH:mm format'
      }
    },
    timezone: { type: String, default: 'UTC' }
  },
  frequency: {
    maxPerDay: { 
      type: Number, 
      default: 10, 
      min: 1, 
      max: 50,
      validate: {
        validator: Number.isInteger,
        message: 'maxPerDay must be an integer'
      }
    },
    maxPerWeek: { 
      type: Number, 
      default: 50, 
      min: 1, 
      max: 200,
      validate: {
        validator: Number.isInteger,
        message: 'maxPerWeek must be an integer'
      }
    }
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

// Indexes for efficient querying (userId already has a unique index via field definition)
userPreferencesSchema.index({ 'channels.webPush': 1 })
userPreferencesSchema.index({ 'channels.email': 1 })
userPreferencesSchema.index({ 'channels.whatsapp': 1 })
userPreferencesSchema.index({ 'channels.sms': 1 })

// Validation middleware
userPreferencesSchema.pre('save', function(next) {
  // Validate that maxPerWeek is greater than or equal to maxPerDay
  if (this.frequency.maxPerWeek < this.frequency.maxPerDay) {
    return next(new Error('maxPerWeek must be greater than or equal to maxPerDay'))
  }
  
  // Validate timezone
  try {
    Intl.DateTimeFormat(undefined, { timeZone: this.quietHours.timezone })
  } catch (error) {
    return next(new Error(`Invalid timezone: ${this.quietHours.timezone}`))
  }
  
  next()
})

// Instance methods for checking preferences during notification sending
userPreferencesSchema.methods.canReceiveChannel = function(channel: 'webPush' | 'email' | 'whatsapp' | 'sms'): boolean {
  const channelMap = {
    'webPush': 'webPush',
    'email': 'email', 
    'whatsapp': 'whatsapp',
    'sms': 'sms'
  }
  
  return this.channels[channelMap[channel]] === true
}

userPreferencesSchema.methods.canReceiveCategory = function(category: 'system' | 'campaigns' | 'emergency' | 'updates'): boolean {
  return this.categories[category] === true
}

userPreferencesSchema.methods.isInQuietHours = function(date?: Date): boolean {
  if (!this.quietHours.enabled) return false
  
  const checkDate = date || new Date()
  
  // Convert to user's timezone
  const userTime = new Intl.DateTimeFormat('en-US', {
    timeZone: this.quietHours.timezone,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit'
  }).format(checkDate)
  
  const [currentHour, currentMinute] = userTime.split(':').map(Number)
  const currentTimeMinutes = currentHour * 60 + currentMinute
  
  const [startHour, startMinute] = this.quietHours.start.split(':').map(Number)
  const startTimeMinutes = startHour * 60 + startMinute
  
  const [endHour, endMinute] = this.quietHours.end.split(':').map(Number)
  const endTimeMinutes = endHour * 60 + endMinute
  
  // Handle quiet hours that span midnight
  if (startTimeMinutes > endTimeMinutes) {
    return currentTimeMinutes >= startTimeMinutes || currentTimeMinutes <= endTimeMinutes
  } else {
    return currentTimeMinutes >= startTimeMinutes && currentTimeMinutes <= endTimeMinutes
  }
}

userPreferencesSchema.methods.canReceiveNotification = function(
  channel: 'webPush' | 'email' | 'whatsapp' | 'sms',
  category: 'system' | 'campaigns' | 'emergency' | 'updates',
  isEmergency: boolean = false,
  checkTime?: Date
): boolean {
  // Emergency notifications always go through (override preferences)
  if (isEmergency || category === 'emergency') {
    return true
  }
  
  // Check channel preference
  if (!this.canReceiveChannel(channel)) {
    return false
  }
  
  // Check category preference
  if (!this.canReceiveCategory(category)) {
    return false
  }
  
  // Check quiet hours
  if (this.isInQuietHours(checkTime)) {
    return false
  }
  
  return true
}

// Static methods
userPreferencesSchema.statics.getDefaultPreferences = function(userId: string) {
  return new this({
    userId,
    channels: {
      webPush: true,
      email: true,
      whatsapp: false,
      sms: false
    },
    categories: {
      system: true,
      campaigns: true,
      emergency: true,
      updates: true
    },
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00',
      timezone: 'UTC'
    },
    frequency: {
      maxPerDay: 10,
      maxPerWeek: 50
    }
  })
}

userPreferencesSchema.statics.findOrCreateForUser = async function(userId: string) {
  let preferences = await this.findOne({ userId })
  
  if (!preferences) {
    preferences = (this as any).getDefaultPreferences(userId)
    await preferences.save()
  }
  
  return preferences
}

// Virtual for checking if user has any channels enabled
userPreferencesSchema.virtual('hasAnyChannelEnabled').get(function() {
  return Object.values(this.channels).some(enabled => enabled === true)
})

// Virtual for checking if user has any categories enabled
userPreferencesSchema.virtual('hasAnyCategoryEnabled').get(function() {
  return Object.values(this.categories).some(enabled => enabled === true)
})

export default mongoose.models.UserPreferences || mongoose.model<IUserPreferences>("UserPreferences", userPreferencesSchema, 'userPreferences')