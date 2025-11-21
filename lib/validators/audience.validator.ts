import { z } from 'zod'

// Audience criteria schema
const audienceCriteriaSchema = z.object({
  roles: z.array(z.enum(['admin', 'moderator', 'field_executive', 'user', 'everyone'])).min(1, "At least one role is required"),
  locations: z.array(z.string().min(1, "Location cannot be empty")).optional(),
  activityStatus: z.enum(['active', 'inactive', 'new']).optional(),
  customFilters: z.record(z.string(), z.any()).optional(),
  logic: z.enum(['AND', 'OR']).default('AND')
})

// Audience preview schema
export const audiencePreviewSchema = z.object({
  criteria: audienceCriteriaSchema,
  channels: z.array(z.enum(['web_push', 'email', 'whatsapp', 'sms'])).optional(),
  excludeOptedOut: z.boolean().default(true)
})

// Audience segment schemas
export const createSegmentSchema = z.object({
  name: z.string().min(1, "Segment name is required").max(100, "Segment name too long"),
  description: z.string().max(500, "Description too long").optional(),
  criteria: audienceCriteriaSchema,
  isShared: z.boolean().default(false)
})

export const updateSegmentSchema = createSegmentSchema.partial()

export const segmentFiltersSchema = z.object({
  createdBy: z.string().optional(),
  isShared: z.boolean().optional(),
  roles: z.array(z.enum(['admin', 'moderator', 'field_executive', 'user', 'everyone'])).optional(),
  locations: z.array(z.string()).optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'updatedAt', 'name', 'userCount']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

// User filtering schema for advanced targeting
export const userFilterSchema = z.object({
  roles: z.array(z.enum(['admin', 'moderator', 'field_executive', 'user', 'everyone'])).optional(),
  locations: z.array(z.string()).optional(),
  activityStatus: z.enum(['active', 'inactive', 'new']).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  hasEmail: z.boolean().optional(),
  hasPhone: z.boolean().optional(),
  channels: z.array(z.enum(['web_push', 'email', 'whatsapp', 'sms'])).optional(),
  excludeOptedOut: z.boolean().default(true),
  logic: z.enum(['AND', 'OR']).default('AND'),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(1000).default(100)
})

export type AudiencePreviewInput = z.infer<typeof audiencePreviewSchema>
export type CreateSegmentInput = z.infer<typeof createSegmentSchema>
export type UpdateSegmentInput = z.infer<typeof updateSegmentSchema>
export type SegmentFilters = z.infer<typeof segmentFiltersSchema>
export type UserFilterInput = z.infer<typeof userFilterSchema>