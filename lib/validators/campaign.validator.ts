import { z } from 'zod'

// Base campaign content schema for each channel
const channelContentSchema = z.object({
  message: z.string().min(1, "Message is required"),
  subject: z.string().optional(),
  attachments: z.array(z.string()).optional()
})

// Targeting criteria schema
const targetingSchema = z.object({
  roles: z.array(z.enum(['admin', 'moderator', 'field_executive', 'user', 'everyone'])).min(1, "At least one role is required"),
  locations: z.array(z.string()).optional(),
  activityStatus: z.enum(['active', 'inactive', 'new']).optional(),
  customSegments: z.array(z.string()).optional(),
  logic: z.enum(['AND', 'OR']).default('AND'),
  excludeOptedOut: z.boolean().default(true)
})

// Scheduling schema
const schedulingSchema = z.object({
  type: z.enum(['immediate', 'scheduled', 'recurring']).default('immediate'),
  scheduledFor: z.string().datetime().optional(),
  timezone: z.string().default('UTC'),
  recurring: z.object({
    frequency: z.enum(['daily', 'weekly', 'monthly']),
    interval: z.number().min(1),
    endDate: z.string().datetime().optional()
  }).optional()
}).refine((data) => {
  if (data.type === 'scheduled' && !data.scheduledFor) {
    return false
  }
  if (data.type === 'recurring' && !data.recurring?.frequency) {
    return false
  }
  return true
}, {
  message: "scheduledFor is required for scheduled campaigns, recurring config is required for recurring campaigns"
})

// A/B testing schema
const abTestingSchema = z.object({
  enabled: z.boolean().default(false),
  variants: z.array(z.object({
    name: z.string().min(1),
    percentage: z.number().min(0).max(100),
    content: z.record(z.string(), channelContentSchema)
  })).optional()
}).refine((data) => {
  if (data.enabled && data.variants) {
    const totalPercentage = data.variants.reduce((sum, variant) => sum + variant.percentage, 0)
    return totalPercentage === 100
  }
  return true
}, {
  message: "A/B testing variant percentages must sum to 100"
})

// Create campaign schema
export const createCampaignSchema = z.object({
  name: z.string().min(1, "Campaign name is required").max(100, "Campaign name too long"),
  description: z.string().max(500, "Description too long").optional(),
  templateId: z.string().optional(),
  targeting: targetingSchema,
  channels: z.array(z.enum(['web_push', 'email', 'whatsapp', 'sms'])).min(1, "At least one channel is required"),
  content: z.record(z.string(), channelContentSchema),
  scheduling: schedulingSchema,
  abTesting: abTestingSchema.optional()
}).refine((data) => {
  // Validate that content exists for all selected channels
  for (const channel of data.channels) {
    if (!data.content[channel] || !data.content[channel].message) {
      return false
    }
  }
  return true
}, {
  message: "Content is required for all selected channels"
})

// Update campaign schema (allows partial updates)
export const updateCampaignSchema = createCampaignSchema.partial().extend({
  status: z.enum(['draft', 'scheduled', 'running', 'paused', 'completed', 'failed']).optional()
})

// Campaign query filters schema
export const campaignFiltersSchema = z.object({
  status: z.enum(['draft', 'scheduled', 'running', 'paused', 'completed', 'failed']).optional(),
  createdBy: z.string().optional(),
  channels: z.array(z.enum(['web_push', 'email', 'whatsapp', 'sms'])).optional(),
  roles: z.array(z.enum(['admin', 'moderator', 'field_executive', 'user', 'everyone'])).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'updatedAt', 'name', 'status']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

// Campaign execution schemas
export const startCampaignSchema = z.object({
  force: z.boolean().default(false) // Force start even if validation warnings exist
})

export const pauseCampaignSchema = z.object({
  reason: z.string().max(200).optional()
})

export const resumeCampaignSchema = z.object({
  reason: z.string().max(200).optional()
})

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>
export type CampaignFilters = z.infer<typeof campaignFiltersSchema>
export type StartCampaignInput = z.infer<typeof startCampaignSchema>
export type PauseCampaignInput = z.infer<typeof pauseCampaignSchema>
export type ResumeCampaignInput = z.infer<typeof resumeCampaignSchema>