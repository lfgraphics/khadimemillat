import { z } from 'zod';

// Address schema
const addressSchema = z.object({
  street: z.string().min(1, 'Street address is required').max(200, 'Street address too long'),
  city: z.string().min(1, 'City is required').max(50, 'City name too long'),
  state: z.string().min(1, 'State is required').max(50, 'State name too long'),
  pincode: z.string().regex(/^\d{6}$/, 'Pincode must be 6 digits'),
  country: z.string().default('India')
});

// Identity proof schema
const identityProofSchema = z.object({
  documentType: z.enum(['aadhaar', 'pan', 'voter_id', 'passport', 'driving_license']),
  documentNumber: z.string().min(1, 'Document number is required').max(50, 'Document number too long'),
  images: z.array(z.string().url('Invalid image URL')).min(1, 'At least one image is required').max(3, 'Maximum 3 images allowed')
});

// Main membership request schema
export const membershipRequestSchema = z.object({
  // Legal Details
  fullName: z.string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name too long')
    .regex(/^[a-zA-Z\s.]+$/, 'Full name can only contain letters, spaces, and dots'),
  
  dateOfBirth: z.string()
    .min(1, 'Date of birth is required')
    .refine((dateStr) => {
      const date = new Date(dateStr);
      return !isNaN(date.getTime());
    }, 'Invalid date format')
    .refine((dateStr) => {
      const date = new Date(dateStr);
      const age = new Date().getFullYear() - date.getFullYear();
      return age >= 18 && age <= 100;
    }, 'Age must be between 18 and 100 years')
    .transform((dateStr) => new Date(dateStr)),
  
  primaryContactNumber: z.string()
    .regex(/^[6-9]\d{9}$/, 'Invalid Indian mobile number'),
  
  alternateContactNumber: z.string()
    .regex(/^[6-9]\d{9}$/, 'Invalid Indian mobile number')
    .optional()
    .or(z.literal('')),
  
  // Address Information
  currentAddress: addressSchema,
  permanentAddress: addressSchema,
  isSameAddress: z.boolean().default(false),
  
  // Identity Documents
  identityProofs: z.array(identityProofSchema)
    .min(1, 'At least one identity proof is required')
    .max(3, 'Maximum 3 identity proofs allowed')
    .refine((proofs) => {
      const types = proofs.map(p => p.documentType);
      return new Set(types).size === types.length;
    }, 'Each document type can only be uploaded once')
});

// Type inference
export type MembershipRequestFormData = z.infer<typeof membershipRequestSchema>;

// Document type options for form
export const documentTypeOptions = [
  { value: 'aadhaar', label: 'Aadhaar Card' },
  { value: 'pan', label: 'PAN Card' },
  { value: 'voter_id', label: 'Voter ID Card' },
  { value: 'passport', label: 'Passport' },
  { value: 'driving_license', label: 'Driving License' }
] as const;