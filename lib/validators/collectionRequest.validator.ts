import { z } from 'zod'

// Donor is now optional; server route will infer donor from session for non-privileged roles
export const createCollectionRequestSchema = z.object({
  donor: z.string().optional(),
  requestedPickupTime: z.string().datetime().optional(),
  address: z.string().min(1),
  phone: z.string().min(1),
  notes: z.string().optional()
})

export const updateCollectionRequestSchema = z.object({
  requestedPickupTime: z.string().datetime().optional(),
  address: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  notes: z.string().optional(),
  status: z.enum(['pending','verified','collected','completed']).optional()
})

export const assignScrappersSchema = z.object({
  scrapperIds: z.array(z.string().min(1)).min(1)
})
