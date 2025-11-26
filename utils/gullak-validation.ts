import { z } from 'zod'

// Validation schemas for Gullak operations
export const createGullakSchema = z.object({
    address: z.string()
        .min(10, 'Address must be at least 10 characters')
        .max(500, 'Address must not exceed 500 characters')
        .trim(),
    latitude: z.string()
        .refine((val) => {
            const num = parseFloat(val)
            return !isNaN(num) && num >= -90 && num <= 90
        }, 'Invalid latitude. Must be between -90 and 90'),
    longitude: z.string()
        .refine((val) => {
            const num = parseFloat(val)
            return !isNaN(num) && num >= -180 && num <= 180
        }, 'Invalid longitude. Must be between -180 and 180'),
    landmark: z.string()
        .max(200, 'Landmark must not exceed 200 characters')
        .trim()
        .optional(),
    caretakerUserId: z.string()
        .regex(/^[0-9a-fA-F]{24}$/, 'Invalid caretaker ID format'),
    installationDate: z.string()
        .refine((val) => {
            const date = new Date(val)
            return !isNaN(date.getTime()) && date <= new Date()
        }, 'Invalid installation date. Must be a valid date not in the future'),
    description: z.string()
        .max(1000, 'Description must not exceed 1000 characters')
        .trim()
        .optional(),
    notes: z.string()
        .max(1000, 'Notes must not exceed 1000 characters')
        .trim()
        .optional()
})

export const updateGullakSchema = z.object({
    address: z.string()
        .min(10, 'Address must be at least 10 characters')
        .max(500, 'Address must not exceed 500 characters')
        .trim()
        .optional(),
    latitude: z.string()
        .refine((val) => {
            if (!val) return true // Optional for updates
            const num = parseFloat(val)
            return !isNaN(num) && num >= -90 && num <= 90
        }, 'Invalid latitude. Must be between -90 and 90')
        .optional(),
    longitude: z.string()
        .refine((val) => {
            if (!val) return true // Optional for updates
            const num = parseFloat(val)
            return !isNaN(num) && num >= -180 && num <= 180
        }, 'Invalid longitude. Must be between -180 and 180')
        .optional(),
    landmark: z.string()
        .max(200, 'Landmark must not exceed 200 characters')
        .trim()
        .optional(),
    caretakerUserId: z.string()
        .regex(/^[0-9a-fA-F]{24}$/, 'Invalid caretaker ID format')
        .optional(),
    status: z.enum(['active', 'inactive', 'maintenance', 'full'])
        .optional(),
    description: z.string()
        .max(1000, 'Description must not exceed 1000 characters')
        .trim()
        .optional(),
    notes: z.string()
        .max(1000, 'Notes must not exceed 1000 characters')
        .trim()
        .optional()
})

export const gullakIdSchema = z.string()
    .regex(/^GUL-\d{3}$/, 'Invalid Gullak ID format. Must be GUL-XXX')

// Sanitize HTML content to prevent XSS
export function sanitizeString(input: string): string {
    return input
        .replace(/[<>]/g, '') // Remove HTML tags
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+=/gi, '') // Remove event handlers
        .trim()
}

// Validate and sanitize form data
export function validateCreateGullakData(formData: FormData) {
    const rawData = {
        address: formData.get('address') as string,
        latitude: formData.get('latitude') as string,
        longitude: formData.get('longitude') as string,
        landmark: formData.get('landmark') as string,
        caretakerUserId: formData.get('caretakerUserId') as string,
        installationDate: formData.get('installationDate') as string,
        description: formData.get('description') as string,
        notes: formData.get('notes') as string
    }

    // Sanitize string inputs
    const sanitizedData = {
        ...rawData,
        address: sanitizeString(rawData.address || ''),
        landmark: rawData.landmark ? sanitizeString(rawData.landmark) : undefined,
        description: rawData.description ? sanitizeString(rawData.description) : undefined,
        notes: rawData.notes ? sanitizeString(rawData.notes) : undefined
    }

    // Validate with schema
    return createGullakSchema.parse(sanitizedData)
}

export function validateUpdateGullakData(formData: FormData) {
    const rawData = {
        address: formData.get('address') as string,
        latitude: formData.get('latitude') as string,
        longitude: formData.get('longitude') as string,
        landmark: formData.get('landmark') as string,
        caretakerUserId: formData.get('caretakerUserId') as string,
        status: formData.get('status') as string,
        description: formData.get('description') as string,
        notes: formData.get('notes') as string
    }

    // Sanitize string inputs
    const sanitizedData = {
        address: rawData.address ? sanitizeString(rawData.address) : undefined,
        latitude: rawData.latitude || undefined,
        longitude: rawData.longitude || undefined,
        landmark: rawData.landmark ? sanitizeString(rawData.landmark) : undefined,
        caretakerUserId: rawData.caretakerUserId || undefined,
        status: rawData.status || undefined,
        description: rawData.description ? sanitizeString(rawData.description) : undefined,
        notes: rawData.notes ? sanitizeString(rawData.notes) : undefined
    }

    // Remove undefined values
    const cleanData = Object.fromEntries(
        Object.entries(sanitizedData).filter(([_, value]) => value !== undefined)
    )

    // Validate with schema
    return updateGullakSchema.parse(cleanData)
}

// Rate limiting helper (simple in-memory implementation)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(userId: string, maxRequests: number = 10, windowMs: number = 60000): boolean {
    const now = Date.now()
    const userLimit = rateLimitMap.get(userId)

    if (!userLimit || now > userLimit.resetTime) {
        rateLimitMap.set(userId, { count: 1, resetTime: now + windowMs })
        return true
    }

    if (userLimit.count >= maxRequests) {
        return false
    }

    userLimit.count++
    return true
}