// TypeScript interfaces and types for Enhanced File Selector

export interface CloudinaryUploadOptions {
  folder?: string
  tags?: string[]
  transformation?: any
  maxRetries?: number
}

export interface EnhancedFileSelectorProps {
  onFileSelect: (file: File, previewUrl: string) => void
  onUploadComplete: (uploadResult: UploadResult) => void
  onError: (error: FileUploadError) => void
  maxFileSize?: number // in bytes, default 10MB
  acceptedTypes?: string[] // default: ['image/jpeg', 'image/png', 'image/webp']
  placeholder?: string
  disabled?: boolean
  className?: string
  showPreview?: boolean
  uploadToCloudinary?: boolean
  customValidators?: CustomValidator[] // Custom validation functions
  validationRules?: Partial<FileValidationRules> // Override default validation rules
  cloudinaryOptions?: CloudinaryUploadOptions // Cloudinary upload configuration
}

export interface UploadResult {
  publicId: string
  url: string
  secureUrl: string
  width: number
  height: number
  format: string
  bytes: number
}

export interface FileUploadError {
  type: 'validation' | 'upload' | 'camera' | 'network'
  message: string
  details?: any
}

export interface FileValidationRules {
  maxSize: number
  allowedTypes: string[]
  minWidth?: number
  minHeight?: number
  maxWidth?: number
  maxHeight?: number
}

export interface ValidationResult {
  isValid: boolean
  errors: string[]
}

export interface UploadConfig {
  cloudinary: {
    folder: string
    transformation?: any
    tags?: string[]
  }
  validation: FileValidationRules
  ui: {
    showProgress: boolean
    showPreview: boolean
    allowMultiple: boolean
  }
}

export type UploadState = 'idle' | 'selecting' | 'uploading' | 'success' | 'error'

export interface FileState {
  uploadState: UploadState
  selectedFile: File | null
  uploadProgress: number
  previewUrl: string | null
  error: string | null
  uploadInterval?: NodeJS.Timeout
}

// Custom validation function type
export type CustomValidator = (file: File) => Promise<ValidationResult> | ValidationResult

// FilePreview component props
export interface FilePreviewProps {
  file: File
  previewUrl: string
  onRemove?: () => void
  onReplace?: () => void
  className?: string
  showFullPreview?: boolean
  compact?: boolean
}