import { z } from 'zod'

export const createNotificationSchema = z.object({
  recipient: z.string(),
  title: z.string().min(1),
  body: z.string().min(1),
  url: z.string().optional(),
  type: z.enum(['collection_request','verification_needed','collection_assigned','review_needed'])
})

export const markAsReadSchema = z.object({
  id: z.string()
})
