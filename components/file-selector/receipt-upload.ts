// Receipt-specific upload utilities for the file selector

import { UploadResult, FileUploadError, CloudinaryUploadOptions } from './types'

export interface ReceiptUploadOptions extends CloudinaryUploadOptions {
  expenseId?: string
  onProgress?: (progress: number) => void
}

export interface ReceiptUploadResult extends UploadResult {
  originalFilename?: string
  resourceType: string
  tags: string[]
}

/**
 * Upload receipt file to Cloudinary via the receipt-specific API endpoint
 */
export async function uploadReceiptToCloudinary(
  file: File,
  options: ReceiptUploadOptions = {}
): Promise<ReceiptUploadResult> {
  return new Promise((resolve, reject) => {
    const formData = new FormData()
    formData.append('file', file)
    
    // Add expense ID if provided
    if (options.expenseId) {
      formData.append('expenseId', options.expenseId)
    }

    // Create XMLHttpRequest for progress tracking
    const xhr = new XMLHttpRequest()

    // Track upload progress
    if (options.onProgress) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100)
          options.onProgress!(progress)
        }
      })
    }

    // Handle successful upload
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const result = JSON.parse(xhr.responseText)
          
          // Transform to match ReceiptUploadResult interface
          const receiptResult: ReceiptUploadResult = {
            publicId: result.public_id,
            url: result.url,
            secureUrl: result.secure_url,
            width: result.width || 0,
            height: result.height || 0,
            format: result.format,
            bytes: result.bytes,
            originalFilename: result.original_filename,
            resourceType: result.resource_type,
            tags: result.tags || []
          }
          
          resolve(receiptResult)
        } catch (error) {
          reject({
            type: 'upload',
            message: 'Failed to parse upload response',
            details: { originalError: error }
          } as FileUploadError)
        }
      } else {
        try {
          const errorResponse = JSON.parse(xhr.responseText)
          reject({
            type: 'upload',
            message: errorResponse.error || `Upload failed with status ${xhr.status}`,
            details: { status: xhr.status, response: errorResponse }
          } as FileUploadError)
        } catch {
          reject({
            type: 'upload',
            message: `Upload failed with status ${xhr.status}`,
            details: { status: xhr.status }
          } as FileUploadError)
        }
      }
    })

    // Handle network errors
    xhr.addEventListener('error', () => {
      reject({
        type: 'network',
        message: 'Network error during receipt upload',
        details: { status: xhr.status }
      } as FileUploadError)
    })

    // Handle timeout
    xhr.addEventListener('timeout', () => {
      reject({
        type: 'network',
        message: 'Upload timeout - please try again',
        details: { timeout: true }
      } as FileUploadError)
    })

    // Handle abort
    xhr.addEventListener('abort', () => {
      reject({
        type: 'upload',
        message: 'Upload was cancelled',
        details: { aborted: true }
      } as FileUploadError)
    })

    // Configure and send request
    xhr.timeout = 60000 // 60 second timeout for large files
    xhr.open('POST', '/api/upload/receipt')
    xhr.send(formData)
  })
}

/**
 * Validate receipt file before upload
 */
export function validateReceiptFile(file: File): { isValid: boolean; errors: string[] } {
  // Use the centralized validation from the validator
  const { validateReceiptFileClient } = require('@/lib/validators/receipt.validator')
  return validateReceiptFileClient(file)
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Create receipt-specific validation error
 */
export function createReceiptValidationError(errors: string[]): FileUploadError {
  return {
    type: 'validation',
    message: errors.join('; '),
    details: {
      errors,
      errorCount: errors.length,
      context: 'receipt-upload'
    }
  }
}