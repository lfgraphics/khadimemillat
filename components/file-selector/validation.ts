// File validation utilities for Enhanced File Selector

import { FileValidationRules, ValidationResult, FileUploadError } from './types'

// Default validation rules
export const DEFAULT_VALIDATION_RULES: FileValidationRules = {
  maxSize: 10 * 1024 * 1024, // 10MB in bytes
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
  minWidth: 100,
  minHeight: 100,
  maxWidth: 4000,
  maxHeight: 4000
}

// File size formatting utility
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Get file type from MIME type
export const getFileTypeFromMime = (mimeType: string): string => {
  const typeMap: Record<string, string> = {
    'image/jpeg': 'JPEG',
    'image/jpg': 'JPEG',
    'image/png': 'PNG',
    'image/webp': 'WebP',
    'image/gif': 'GIF',
    'image/bmp': 'BMP',
    'image/tiff': 'TIFF'
  }
  
  return typeMap[mimeType.toLowerCase()] || mimeType.split('/')[1]?.toUpperCase() || 'Unknown'
}

// Validate file size
export const validateFileSize = (file: File, maxSize: number): ValidationResult => {
  const isValid = file.size <= maxSize
  const errors = isValid ? [] : [
    `File size (${formatFileSize(file.size)}) exceeds the maximum limit of ${formatFileSize(maxSize)}`
  ]
  
  return { isValid, errors }
}

// Validate file type
export const validateFileType = (file: File, allowedTypes: string[]): ValidationResult => {
  const isValid = allowedTypes.includes(file.type)
  const errors = isValid ? [] : [
    `File type "${getFileTypeFromMime(file.type)}" is not supported. Allowed types: ${allowedTypes.map(type => getFileTypeFromMime(type)).join(', ')}`
  ]
  
  return { isValid, errors }
}

// Validate image dimensions (requires loading the image)
export const validateImageDimensions = (
  file: File, 
  rules: Pick<FileValidationRules, 'minWidth' | 'minHeight' | 'maxWidth' | 'maxHeight'>
): Promise<ValidationResult> => {
  return new Promise((resolve) => {
    // Skip validation if no dimension rules are provided
    if (!rules.minWidth && !rules.minHeight && !rules.maxWidth && !rules.maxHeight) {
      resolve({ isValid: true, errors: [] })
      return
    }

    const img = new Image()
    const url = URL.createObjectURL(file)
    
    img.onload = () => {
      URL.revokeObjectURL(url)
      
      const errors: string[] = []
      const { width, height } = img
      
      if (rules.minWidth && width < rules.minWidth) {
        errors.push(`Image width (${width}px) is below minimum requirement of ${rules.minWidth}px`)
      }
      
      if (rules.minHeight && height < rules.minHeight) {
        errors.push(`Image height (${height}px) is below minimum requirement of ${rules.minHeight}px`)
      }
      
      if (rules.maxWidth && width > rules.maxWidth) {
        errors.push(`Image width (${width}px) exceeds maximum limit of ${rules.maxWidth}px`)
      }
      
      if (rules.maxHeight && height > rules.maxHeight) {
        errors.push(`Image height (${height}px) exceeds maximum limit of ${rules.maxHeight}px`)
      }
      
      resolve({ isValid: errors.length === 0, errors })
    }
    
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve({ 
        isValid: false, 
        errors: ['Unable to read image dimensions. File may be corrupted.'] 
      })
    }
    
    img.src = url
  })
}

// Check if file appears to be corrupted by validating file header
export const validateFileIntegrity = (file: File): Promise<ValidationResult> => {
  return new Promise((resolve) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer
      if (!arrayBuffer) {
        resolve({ isValid: false, errors: ['Unable to read file content'] })
        return
      }
      
      const bytes = new Uint8Array(arrayBuffer.slice(0, 4))
      const header = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
      
      // Check for common image file signatures
      const validHeaders = {
        'ffd8ff': 'JPEG',
        '89504e47': 'PNG',
        '52494646': 'WebP', // RIFF header (WebP uses RIFF container)
        '47494638': 'GIF'
      }
      
      const isValidHeader = Object.keys(validHeaders).some(sig => header.startsWith(sig))
      
      if (!isValidHeader && file.type.startsWith('image/')) {
        resolve({ 
          isValid: false, 
          errors: ['File appears to be corrupted or is not a valid image file'] 
        })
      } else {
        resolve({ isValid: true, errors: [] })
      }
    }
    
    reader.onerror = () => {
      resolve({ 
        isValid: false, 
        errors: ['Unable to read file for validation'] 
      })
    }
    
    // Read first 4 bytes for header validation
    reader.readAsArrayBuffer(file.slice(0, 4))
  })
}

// Main validation function that combines all validation checks
export const validateFile = async (
  file: File, 
  rules: FileValidationRules = DEFAULT_VALIDATION_RULES
): Promise<ValidationResult> => {
  const validationResults: ValidationResult[] = []
  
  // Basic validations (synchronous)
  validationResults.push(validateFileSize(file, rules.maxSize))
  validationResults.push(validateFileType(file, rules.allowedTypes))
  
  // Advanced validations (asynchronous)
  try {
    const integrityResult = await validateFileIntegrity(file)
    validationResults.push(integrityResult)
    
    // Only check dimensions if file is valid so far and is an image
    if (integrityResult.isValid && file.type.startsWith('image/')) {
      const dimensionsResult = await validateImageDimensions(file, rules)
      validationResults.push(dimensionsResult)
    }
  } catch (error) {
    validationResults.push({
      isValid: false,
      errors: ['Validation failed due to an unexpected error']
    })
  }
  
  // Combine all validation results
  const allErrors = validationResults.flatMap(result => result.errors)
  const isValid = validationResults.every(result => result.isValid)
  
  return { isValid, errors: allErrors }
}

// Create FileUploadError from validation result
export const createValidationError = (validationResult: ValidationResult): FileUploadError => {
  return {
    type: 'validation',
    message: validationResult.errors.join('; '),
    details: {
      errors: validationResult.errors,
      errorCount: validationResult.errors.length
    }
  }
}

// Custom validation function type for extensibility
export type CustomValidator = (file: File) => Promise<ValidationResult> | ValidationResult

// Apply custom validation rules
export const applyCustomValidation = async (
  file: File,
  customValidators: CustomValidator[] = []
): Promise<ValidationResult> => {
  if (customValidators.length === 0) {
    return { isValid: true, errors: [] }
  }
  
  const results: ValidationResult[] = []
  
  for (const validator of customValidators) {
    try {
      const result = await validator(file)
      results.push(result)
    } catch (error) {
      results.push({
        isValid: false,
        errors: ['Custom validation failed']
      })
    }
  }
  
  const allErrors = results.flatMap(result => result.errors)
  const isValid = results.every(result => result.isValid)
  
  return { isValid, errors: allErrors }
}

// Complete validation with custom rules support
export const validateFileWithCustomRules = async (
  file: File,
  rules: FileValidationRules = DEFAULT_VALIDATION_RULES,
  customValidators: CustomValidator[] = []
): Promise<ValidationResult> => {
  // Run standard validation
  const standardValidation = await validateFile(file, rules)
  
  // Run custom validation
  const customValidation = await applyCustomValidation(file, customValidators)
  
  // Combine results
  const allErrors = [...standardValidation.errors, ...customValidation.errors]
  const isValid = standardValidation.isValid && customValidation.isValid
  
  return { isValid, errors: allErrors }
}