// User-friendly validation error messages

import { formatFileSize } from './validation'

export const ValidationMessages = {
  // File size errors
  fileTooLarge: (currentSize: number, maxSize: number) => 
    `File size (${formatFileSize(currentSize)}) exceeds the maximum limit of ${formatFileSize(maxSize)}`,
  
  // File type errors
  invalidFileType: (fileType: string, allowedTypes: string[]) => 
    `File type "${fileType}" is not supported. Allowed types: ${allowedTypes.join(', ')}`,
  
  // Image dimension errors
  imageTooSmall: (width: number, height: number, minWidth?: number, minHeight?: number) => {
    const constraints = []
    if (minWidth) constraints.push(`minimum width: ${minWidth}px`)
    if (minHeight) constraints.push(`minimum height: ${minHeight}px`)
    return `Image dimensions (${width}×${height}px) are below requirements (${constraints.join(', ')})`
  },
  
  imageTooLarge: (width: number, height: number, maxWidth?: number, maxHeight?: number) => {
    const constraints = []
    if (maxWidth) constraints.push(`maximum width: ${maxWidth}px`)
    if (maxHeight) constraints.push(`maximum height: ${maxHeight}px`)
    return `Image dimensions (${width}×${height}px) exceed limits (${constraints.join(', ')})`
  },
  
  // File integrity errors
  corruptedFile: 'File appears to be corrupted or is not a valid image file',
  unreadableFile: 'Unable to read file content. Please try a different file',
  invalidImageHeader: 'File header indicates this is not a valid image file',
  
  // General errors
  validationFailed: 'File validation failed due to an unexpected error',
  customValidationFailed: 'File does not meet custom validation requirements',
  
  // Success messages
  validationPassed: 'File validation completed successfully',
  
  // Helper messages
  supportedFormats: (formats: string[]) => `Supported formats: ${formats.join(', ')}`,
  maxFileSize: (size: number) => `Maximum file size: ${formatFileSize(size)}`,
  
  // Specific validation scenarios
  noFileSelected: 'Please select a file to upload',
  multipleFilesNotSupported: 'Multiple file selection is not supported',
  cameraPermissionDenied: 'Camera access denied. Please enable camera permissions in your browser settings',
  noCameraAvailable: 'No camera found on this device',
  cameraInUse: 'Camera is being used by another application'
} as const

// Error severity levels
export enum ValidationSeverity {
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info'
}

// Enhanced validation error with severity
export interface EnhancedValidationError {
  message: string
  severity: ValidationSeverity
  code: string
  suggestions?: string[]
}

// Create enhanced error messages with suggestions
export const createEnhancedValidationError = (
  code: keyof typeof ValidationMessages,
  severity: ValidationSeverity = ValidationSeverity.ERROR,
  suggestions: string[] = []
): EnhancedValidationError => {
  return {
    message: typeof ValidationMessages[code] === 'function' 
      ? 'Validation error occurred' 
      : ValidationMessages[code] as string,
    severity,
    code,
    suggestions
  }
}

// Common validation suggestions
export const ValidationSuggestions = {
  fileTooLarge: [
    'Try compressing the image using an image editor',
    'Use a different image with smaller file size',
    'Convert to a more efficient format like WebP'
  ],
  
  invalidFileType: [
    'Convert your file to JPEG, PNG, or WebP format',
    'Use an image editor to save in a supported format',
    'Check that the file extension matches the actual file type'
  ],
  
  imageTooSmall: [
    'Use a higher resolution image',
    'Try a different image that meets the minimum size requirements'
  ],
  
  imageTooLarge: [
    'Resize the image to fit within the maximum dimensions',
    'Use image editing software to reduce the image size'
  ],
  
  corruptedFile: [
    'Try uploading a different file',
    'Re-save the image using an image editor',
    'Check if the file was properly downloaded or transferred'
  ]
} as const