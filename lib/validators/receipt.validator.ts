import { z } from "zod"

// Receipt file validation schema
export const receiptFileSchema = z.object({
  url: z.string().url("Invalid receipt URL"),
  publicId: z.string().min(1, "Public ID is required"),
  fileName: z.string().min(1, "File name is required").max(255, "File name too long"),
  fileSize: z.number().positive("File size must be positive").max(10 * 1024 * 1024, "File size cannot exceed 10MB"),
  fileType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  uploadedAt: z.date()
})

// Receipt upload request validation
export const receiptUploadRequestSchema = z.object({
  expenseId: z.string().length(24, "Invalid expense ID").optional(),
  files: z.array(receiptFileSchema).min(1, "At least one receipt file is required").max(5, "Maximum 5 receipts allowed")
})

// Receipt file metadata validation for API responses
export const receiptMetadataSchema = z.object({
  public_id: z.string(),
  url: z.string().url(),
  secure_url: z.string().url(),
  width: z.number().optional(),
  height: z.number().optional(),
  format: z.string(),
  bytes: z.number().positive(),
  created_at: z.string(),
  resource_type: z.string(),
  original_filename: z.string().optional(),
  tags: z.array(z.string()).optional()
})

// Client-side file validation before upload
export const validateReceiptFileClient = (file: File): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []

  // Check file size (10MB limit)
  const maxSize = 10 * 1024 * 1024
  if (file.size > maxSize) {
    errors.push(`File size (${formatFileSize(file.size)}) exceeds the 10MB limit`)
  }

  if (file.size === 0) {
    errors.push('File is empty')
  }

  // Check file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  if (!allowedTypes.includes(file.type)) {
    errors.push(`File type "${file.type}" is not supported. Please use JPEG, PNG, WebP, or PDF files.`)
  }

  // Check file name
  if (!file.name || file.name.trim().length === 0) {
    errors.push('File name is required')
  }

  if (file.name.length > 255) {
    errors.push('File name is too long (maximum 255 characters)')
  }

  // Check for potentially dangerous file extensions
  const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com', '.js', '.vbs']
  const fileName = file.name.toLowerCase()
  if (dangerousExtensions.some(ext => fileName.endsWith(ext))) {
    errors.push('File type is not allowed for security reasons')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

// Server-side receipt validation
export const validateReceiptFileServer = (fileData: any): { isValid: boolean; errors: string[] } => {
  try {
    receiptMetadataSchema.parse(fileData)
    return { isValid: true, errors: [] }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        isValid: false,
        errors: error.issues.map((err: any) => `${err.path.join('.')}: ${err.message}`)
      }
    }
    return {
      isValid: false,
      errors: ['Invalid receipt file data']
    }
  }
}

// Utility function to format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Type exports
export type ReceiptFile = z.infer<typeof receiptFileSchema>
export type ReceiptUploadRequest = z.infer<typeof receiptUploadRequestSchema>
export type ReceiptMetadata = z.infer<typeof receiptMetadataSchema>