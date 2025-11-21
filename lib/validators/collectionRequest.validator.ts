import { z } from 'zod'

// Donor is now optional; server route will infer donor from session for non-privileged roles
export const createCollectionRequestSchema = z.object({
  donor: z.string().optional(),
  // Accept both full ISO strings and the "YYYY-MM-DDTHH:MM" value produced by an <input type="datetime-local">.
  // We keep it required at runtime (frontend enforces it) even though the model requires it; making it
  // optional here could defer the error to Mongoose. If you truly want it optional, add .optional().
  requestedPickupTime: z.string().refine(val => {
    // Plain local without seconds/timezone
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(val)) return true
    // Any other string parseable by Date (covers full ISO 8601 / RFC 3339)
    return !isNaN(Date.parse(val))
  }, { message: 'Invalid datetime format' }),
  address: z.string().min(1),
  phone: z.string().min(1),
  notes: z.string().optional(),
  currentLocation: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    accuracy: z.number().optional()
  }).optional()
})

export const updateCollectionRequestSchema = z.object({
  requestedPickupTime: z.string().refine(val => {
    if (val === undefined) return true
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(val)) return true
    return !isNaN(Date.parse(val))
  }, { message: 'Invalid datetime format' }).optional(),
  address: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  notes: z.string().optional(),
  status: z.enum(['pending','verified','collected','completed']).optional()
})

export const assignFieldExecutivesSchema = z.object({
  fieldExecutiveIds: z.array(z.string().min(1)).min(1)
})
