import mongoose, { Schema, Document } from "mongoose"

export interface IAudienceSegment extends Document {
  _id: string
  name: string
  description?: string
  criteria: {
    roles: string[]
    locations?: string[]
    activityStatus?: string
    customFilters?: any
    logic: 'AND' | 'OR'
  }
  userCount: number
  lastUpdated: Date
  createdBy: string // Clerk user ID
  isShared: boolean
  createdAt: Date
  updatedAt: Date
}

const audienceSegmentSchema = new Schema<IAudienceSegment>({
  name: { 
    type: String, 
    required: true, 
    trim: true,
    maxlength: 100
  },
  description: { 
    type: String, 
    trim: true,
    maxlength: 500
  },
  criteria: {
    roles: [{ 
      type: String, 
      required: true,
      enum: ['admin', 'moderator', 'scrapper', 'user', 'everyone']
    }],
    locations: [{ type: String, trim: true }],
    activityStatus: { 
      type: String, 
      enum: ['active', 'inactive', 'new'],
      default: undefined
    },
    customFilters: { type: Schema.Types.Mixed },
    logic: { 
      type: String, 
      enum: ['AND', 'OR'], 
      default: 'AND' 
    }
  },
  userCount: { 
    type: Number, 
    default: 0, 
    min: 0 
  },
  lastUpdated: { 
    type: Date, 
    default: Date.now 
  },
  createdBy: { 
    type: String, 
    required: true 
  },
  isShared: { 
    type: Boolean, 
    default: false 
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

// Indexes for efficient querying
audienceSegmentSchema.index({ createdBy: 1 })
audienceSegmentSchema.index({ isShared: 1 })
audienceSegmentSchema.index({ name: 1, createdBy: 1 })
audienceSegmentSchema.index({ 'criteria.roles': 1 })
audienceSegmentSchema.index({ 'criteria.locations': 1 })
audienceSegmentSchema.index({ lastUpdated: -1 })
audienceSegmentSchema.index({ createdAt: -1 })

// Validation middleware
audienceSegmentSchema.pre('save', function(next) {
  // Validate that at least one role is specified
  if (!this.criteria.roles || this.criteria.roles.length === 0) {
    return next(new Error('At least one role must be specified in criteria'))
  }
  
  // Validate role values
  const validRoles = ['admin', 'moderator', 'scrapper', 'user', 'everyone']
  const invalidRoles = this.criteria.roles.filter(role => !validRoles.includes(role))
  if (invalidRoles.length > 0) {
    return next(new Error(`Invalid roles: ${invalidRoles.join(', ')}`))
  }
  
  // Update lastUpdated when criteria changes
  if (this.isModified('criteria')) {
    this.lastUpdated = new Date()
    // Reset user count when criteria changes - it will need to be recalculated
    this.userCount = 0
  }
  
  next()
})

// Instance methods for segment validation and user count calculation
audienceSegmentSchema.methods.validateCriteria = function(): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  // Check if roles are valid
  const validRoles = ['admin', 'moderator', 'scrapper', 'user', 'everyone']
  const invalidRoles = this.criteria.roles.filter((role: string) => !validRoles.includes(role))
  if (invalidRoles.length > 0) {
    errors.push(`Invalid roles: ${invalidRoles.join(', ')}`)
  }
  
  // Check if activity status is valid
  if (this.criteria.activityStatus && !['active', 'inactive', 'new'].includes(this.criteria.activityStatus)) {
    errors.push(`Invalid activity status: ${this.criteria.activityStatus}`)
  }
  
  // Check if locations are provided as strings
  if (this.criteria.locations) {
    const invalidLocations = this.criteria.locations.filter((loc: any) => typeof loc !== 'string' || loc.trim() === '')
    if (invalidLocations.length > 0) {
      errors.push('All locations must be non-empty strings')
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

audienceSegmentSchema.methods.calculateUserCount = async function(): Promise<number> {
  try {
    // Import User model dynamically to avoid circular dependencies
    const User = mongoose.model('User')
    
    // Build query based on criteria
    const query: any = {}
    
    // Handle roles
    if (this.criteria.roles.includes('everyone')) {
      // No role filter needed for 'everyone'
    } else {
      query.role = { $in: this.criteria.roles }
    }
    
    // Handle locations
    if (this.criteria.locations && this.criteria.locations.length > 0) {
      if (this.criteria.logic === 'OR') {
        // For OR logic with locations, we need to combine with roles using $or
        if (query.role) {
          query.$or = [
            { role: query.role.$in },
            { location: { $in: this.criteria.locations } }
          ]
          delete query.role
        } else {
          query.location = { $in: this.criteria.locations }
        }
      } else {
        // For AND logic, add location filter
        query.location = { $in: this.criteria.locations }
      }
    }
    
    // Handle activity status
    if (this.criteria.activityStatus) {
      const now = new Date()
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      
      switch (this.criteria.activityStatus) {
        case 'active':
          query.lastLoginAt = { $gte: thirtyDaysAgo }
          break
        case 'inactive':
          query.$or = [
            { lastLoginAt: { $lt: thirtyDaysAgo } },
            { lastLoginAt: { $exists: false } }
          ]
          break
        case 'new':
          query.createdAt = { $gte: sevenDaysAgo }
          break
      }
    }
    
    // Handle custom filters
    if (this.criteria.customFilters) {
      Object.assign(query, this.criteria.customFilters)
    }
    
    const count = await User.countDocuments(query)
    
    // Update the stored count
    this.userCount = count
    this.lastUpdated = new Date()
    await this.save()
    
    return count
  } catch (error) {
    console.error('Error calculating user count for segment:', error)
    return 0
  }
}

audienceSegmentSchema.methods.getMatchingUsers = async function(limit?: number, skip?: number) {
  try {
    // Import User model dynamically to avoid circular dependencies
    const User = mongoose.model('User')
    
    // Build query based on criteria (same logic as calculateUserCount)
    const query: any = {}
    
    // Handle roles
    if (this.criteria.roles.includes('everyone')) {
      // No role filter needed for 'everyone'
    } else {
      query.role = { $in: this.criteria.roles }
    }
    
    // Handle locations
    if (this.criteria.locations && this.criteria.locations.length > 0) {
      if (this.criteria.logic === 'OR') {
        if (query.role) {
          query.$or = [
            { role: query.role.$in },
            { location: { $in: this.criteria.locations } }
          ]
          delete query.role
        } else {
          query.location = { $in: this.criteria.locations }
        }
      } else {
        query.location = { $in: this.criteria.locations }
      }
    }
    
    // Handle activity status
    if (this.criteria.activityStatus) {
      const now = new Date()
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      
      switch (this.criteria.activityStatus) {
        case 'active':
          query.lastLoginAt = { $gte: thirtyDaysAgo }
          break
        case 'inactive':
          query.$or = [
            { lastLoginAt: { $lt: thirtyDaysAgo } },
            { lastLoginAt: { $exists: false } }
          ]
          break
        case 'new':
          query.createdAt = { $gte: sevenDaysAgo }
          break
      }
    }
    
    // Handle custom filters
    if (this.criteria.customFilters) {
      Object.assign(query, this.criteria.customFilters)
    }
    
    let queryBuilder = User.find(query).select('clerkId email role location createdAt lastLoginAt')
    
    if (skip) queryBuilder = queryBuilder.skip(skip)
    if (limit) queryBuilder = queryBuilder.limit(limit)
    
    return await queryBuilder.exec()
  } catch (error) {
    console.error('Error getting matching users for segment:', error)
    return []
  }
}

// Static methods
audienceSegmentSchema.statics.findByUser = function(userId: string, includeShared: boolean = true) {
  const query: any = {
    $or: [
      { createdBy: userId }
    ]
  }
  
  if (includeShared) {
    query.$or.push({ isShared: true })
  }
  
  return this.find(query).sort({ createdAt: -1 })
}

audienceSegmentSchema.statics.findShared = function() {
  return this.find({ isShared: true }).sort({ createdAt: -1 })
}

// Virtual for checking if segment needs user count update
audienceSegmentSchema.virtual('needsCountUpdate').get(function() {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
  return this.lastUpdated < oneHourAgo
})

// Virtual for criteria summary
audienceSegmentSchema.virtual('criteriaSummary').get(function() {
  const parts: string[] = []
  
  if (this.criteria.roles.includes('everyone')) {
    parts.push('All users')
  } else {
    parts.push(`Roles: ${this.criteria.roles.join(', ')}`)
  }
  
  if (this.criteria.locations && this.criteria.locations.length > 0) {
    parts.push(`Locations: ${this.criteria.locations.join(', ')}`)
  }
  
  if (this.criteria.activityStatus) {
    parts.push(`Activity: ${this.criteria.activityStatus}`)
  }
  
  return parts.join(` ${this.criteria.logic} `)
})

export default mongoose.models.AudienceSegment || mongoose.model<IAudienceSegment>("AudienceSegment", audienceSegmentSchema, 'audienceSegments')