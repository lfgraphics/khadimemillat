import connectDB from '@/lib/db'
import NotificationTemplate, { INotificationTemplate } from '@/models/NotificationTemplate'
import { NotificationOptions } from './notification.service'

export interface TemplateCreateData {
  name: string
  title: string
  message: string
  channels: ('web_push' | 'email' | 'whatsapp' | 'sms')[]
  targetRoles: ('admin' | 'moderator' | 'field_executive' | 'user' | 'everyone')[]
  category?: 'campaign' | 'system' | 'custom'
  createdBy: string
}

export interface TemplateUpdateData extends Partial<TemplateCreateData> {
  isActive?: boolean
}

export class TemplateService {
  /**
   * Validate template data
   */
  private static validateTemplateData(data: Partial<TemplateCreateData>): void {
    if (!data.name || !data.name.trim()) {
      throw new Error('Template name is required')
    }
    
    if (data.name.trim().length > 100) {
      throw new Error('Template name cannot exceed 100 characters')
    }
    
    if (!data.title || !data.title.trim()) {
      throw new Error('Template title is required')
    }
    
    if (data.title.trim().length > 200) {
      throw new Error('Template title cannot exceed 200 characters')
    }
    
    if (!data.message || !data.message.trim()) {
      throw new Error('Template message is required')
    }
    
    if (data.message.trim().length > 1000) {
      throw new Error('Template message cannot exceed 1000 characters')
    }
    
    if (!data.channels || !Array.isArray(data.channels) || data.channels.length === 0) {
      throw new Error('At least one channel must be selected')
    }
    
    const validChannels = ['web_push', 'email', 'whatsapp', 'sms']
    const invalidChannels = data.channels.filter(c => !validChannels.includes(c))
    if (invalidChannels.length > 0) {
      throw new Error(`Invalid channels: ${invalidChannels.join(', ')}`)
    }
    
    if (!data.targetRoles || !Array.isArray(data.targetRoles) || data.targetRoles.length === 0) {
      throw new Error('At least one target role must be selected')
    }
    
    const validRoles = ['admin', 'moderator', 'field_executive', 'user', 'everyone']
    const invalidRoles = data.targetRoles.filter(r => !validRoles.includes(r))
    if (invalidRoles.length > 0) {
      throw new Error(`Invalid roles: ${invalidRoles.join(', ')}`)
    }
    
    if (data.category) {
      const validCategories = ['campaign', 'system', 'custom']
      if (!validCategories.includes(data.category)) {
        throw new Error(`Invalid category. Must be one of: ${validCategories.join(', ')}`)
      }
    }
  }
  /**
   * Create a new notification template
   */
  static async createTemplate(data: TemplateCreateData): Promise<INotificationTemplate> {
    await connectDB()
    
    // Validate input data
    this.validateTemplateData(data)
    
    // Check for duplicate name by same user
    const existingTemplate = await NotificationTemplate.findOne({
      name: data.name.trim(),
      createdBy: data.createdBy
    })
    
    if (existingTemplate) {
      throw new Error('Template with this name already exists')
    }
    
    const template = new NotificationTemplate({
      ...data,
      name: data.name.trim(),
      title: data.title.trim(),
      message: data.message.trim(),
      category: data.category || 'custom'
    })
    
    return await template.save()
  }

  /**
   * Get template by ID
   */
  static async getTemplateById(id: string): Promise<INotificationTemplate | null> {
    await connectDB()
    return await NotificationTemplate.findById(id)
  }

  /**
   * Get templates by user
   */
  static async getTemplatesByUser(
    userId: string, 
    options: {
      category?: string
      isActive?: boolean
      page?: number
      limit?: number
    } = {}
  ): Promise<{
    templates: INotificationTemplate[]
    total: number
    page: number
    pages: number
  }> {
    await connectDB()
    
    const { category, isActive, page = 1, limit = 10 } = options
    const skip = (page - 1) * limit
    
    const query: any = { createdBy: userId }
    if (category && category !== 'all') {
      query.category = category
    }
    if (isActive !== undefined) {
      query.isActive = isActive
    }
    
    const templates = await NotificationTemplate.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
    
    const total = await NotificationTemplate.countDocuments(query)
    
    return {
      templates,
      total,
      page,
      pages: Math.ceil(total / limit)
    }
  }

  /**
   * Update template
   */
  static async updateTemplate(
    id: string, 
    data: TemplateUpdateData,
    userId: string,
    isAdmin: boolean = false
  ): Promise<INotificationTemplate | null> {
    await connectDB()
    
    const template = await NotificationTemplate.findById(id)
    if (!template) {
      throw new Error('Template not found')
    }
    
    // Check permissions
    if (template.createdBy !== userId && !isAdmin) {
      throw new Error('Insufficient permissions to update this template')
    }
    
    // Validate update data if provided
    if (data.name || data.title || data.message || data.channels || data.targetRoles || data.category) {
      const validationData = {
        name: data.name || template.name,
        title: data.title || template.title,
        message: data.message || template.message,
        channels: data.channels || template.channels,
        targetRoles: data.targetRoles || template.targetRoles,
        category: data.category || template.category,
        createdBy: template.createdBy
      }
      this.validateTemplateData(validationData)
    }
    
    // Check for duplicate name if name is being changed
    if (data.name && data.name.trim() !== template.name) {
      const existingTemplate = await NotificationTemplate.findOne({
        name: data.name.trim(),
        createdBy: template.createdBy,
        _id: { $ne: id }
      })
      
      if (existingTemplate) {
        throw new Error('Template with this name already exists')
      }
    }
    
    // Prepare update data with trimmed strings
    const updateData = { ...data }
    if (updateData.name) updateData.name = updateData.name.trim()
    if (updateData.title) updateData.title = updateData.title.trim()
    if (updateData.message) updateData.message = updateData.message.trim()
    
    return await NotificationTemplate.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
  }

  /**
   * Delete template
   */
  static async deleteTemplate(
    id: string,
    userId: string,
    isAdmin: boolean = false
  ): Promise<boolean> {
    await connectDB()
    
    const template = await NotificationTemplate.findById(id)
    if (!template) {
      throw new Error('Template not found')
    }
    
    // Check permissions
    if (template.createdBy !== userId && !isAdmin) {
      throw new Error('Insufficient permissions to delete this template')
    }
    
    await NotificationTemplate.findByIdAndDelete(id)
    return true
  }

  /**
   * Convert template to notification options
   */
  static templateToNotificationOptions(
    template: INotificationTemplate,
    sentBy: string,
    metadata?: any
  ): NotificationOptions {
    return {
      title: template.title,
      message: template.message,
      channels: template.channels,
      targetRoles: template.targetRoles.filter(role => 
        ['admin', 'moderator', 'field_executive', 'user', 'everyone'].includes(role)
      ) as ('admin' | 'moderator' | 'field_executive' | 'user' | 'everyone')[],
      sentBy,
      templateId: template._id?.toString(),
      metadata
    }
  }

  /**
   * Get popular templates (by usage count)
   */
  static async getPopularTemplates(limit: number = 10): Promise<INotificationTemplate[]> {
    await connectDB()
    
    return await NotificationTemplate.find({ isActive: true })
      .sort({ usageCount: -1 })
      .limit(limit)
  }

  /**
   * Search templates by name or content
   */
  static async searchTemplates(
    query: string,
    userId?: string,
    options: {
      category?: string
      isActive?: boolean
      page?: number
      limit?: number
    } = {}
  ): Promise<{
    templates: INotificationTemplate[]
    total: number
    page: number
    pages: number
  }> {
    await connectDB()
    
    if (!query || query.trim().length < 2) {
      throw new Error('Search query must be at least 2 characters long')
    }
    
    const { category, isActive, page = 1, limit = 10 } = options
    const skip = (page - 1) * limit
    
    const searchQuery: any = {
      $or: [
        { name: { $regex: query.trim(), $options: 'i' } },
        { title: { $regex: query.trim(), $options: 'i' } },
        { message: { $regex: query.trim(), $options: 'i' } }
      ]
    }
    
    if (userId) {
      searchQuery.createdBy = userId
    }
    if (category && category !== 'all') {
      searchQuery.category = category
    }
    if (isActive !== undefined) {
      searchQuery.isActive = isActive
    }
    
    const templates = await NotificationTemplate.find(searchQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
    
    const total = await NotificationTemplate.countDocuments(searchQuery)
    
    return {
      templates,
      total,
      page,
      pages: Math.ceil(total / limit)
    }
  }

  /**
   * Increment template usage count
   */
  static async incrementUsageCount(id: string): Promise<INotificationTemplate> {
    await connectDB()
    
    const template = await NotificationTemplate.findByIdAndUpdate(
      id,
      { $inc: { usageCount: 1 } },
      { new: true }
    )
    
    if (!template) {
      throw new Error('Template not found')
    }
    
    return template
  }

  /**
   * Get template usage statistics
   */
  static async getUsageStatistics(): Promise<{
    totalUsage: number
    averageUsage: number
    mostUsedTemplate: INotificationTemplate | null
    leastUsedTemplate: INotificationTemplate | null
  }> {
    await connectDB()
    
    const [stats, mostUsed, leastUsed] = await Promise.all([
      NotificationTemplate.aggregate([
        {
          $group: {
            _id: null,
            totalUsage: { $sum: '$usageCount' },
            averageUsage: { $avg: '$usageCount' }
          }
        }
      ]),
      NotificationTemplate.findOne({ usageCount: { $gt: 0 } })
        .sort({ usageCount: -1 })
        .limit(1),
      NotificationTemplate.findOne({ isActive: true })
        .sort({ usageCount: 1 })
        .limit(1)
    ])
    
    return {
      totalUsage: stats[0]?.totalUsage || 0,
      averageUsage: stats[0]?.averageUsage || 0,
      mostUsedTemplate: mostUsed,
      leastUsedTemplate: leastUsed
    }
  }
}