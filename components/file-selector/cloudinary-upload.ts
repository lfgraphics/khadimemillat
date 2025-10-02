import { UploadResult, FileUploadError } from './types'

export interface CloudinaryUploadOptions {
  folder?: string
  tags?: string[]
  transformation?: any
  onProgress?: (progress: number) => void
  maxRetries?: number
}

export interface CloudinaryUploadResponse {
  public_id: string
  secure_url: string
  url: string
  width: number
  height: number
  format: string
  bytes: number
  [key: string]: any
}

const DEFAULT_UPLOAD_OPTIONS: CloudinaryUploadOptions = {
  folder: 'kmwf/file-selector',
  tags: ['file-selector', 'user-upload'],
  maxRetries: 3
}

/**
 * Upload file to Cloudinary with progress tracking and retry logic
 */
export async function uploadToCloudinary(
  file: File,
  options: CloudinaryUploadOptions = {}
): Promise<UploadResult> {
  const config = { ...DEFAULT_UPLOAD_OPTIONS, ...options }
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= (config.maxRetries || 3); attempt++) {
    try {
      return await attemptUpload(file, config, attempt)
    } catch (error) {
      lastError = error as Error
      
      // Don't retry on validation errors or client errors
      if (error instanceof Error && (
        error.message.includes('validation') ||
        error.message.includes('400') ||
        error.message.includes('401') ||
        error.message.includes('403')
      )) {
        break
      }

      // Wait before retry (exponential backoff)
      if (attempt < (config.maxRetries || 3)) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
      }
    }
  }

  // All retries failed
  throw createUploadError(lastError || new Error('Upload failed after all retries'))
}

/**
 * Single upload attempt with progress tracking
 */
async function attemptUpload(
  file: File,
  options: CloudinaryUploadOptions,
  attempt: number
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const formData = new FormData()
    formData.append('file', file)
    
    // Add upload options
    if (options.folder) {
      formData.append('folder', options.folder)
    }
    if (options.tags && options.tags.length > 0) {
      formData.append('tags', options.tags.join(','))
    }
    if (options.transformation) {
      formData.append('transformation', JSON.stringify(options.transformation))
    }

    const xhr = new XMLHttpRequest()

    // Track upload progress
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && options.onProgress) {
        const progress = Math.round((event.loaded / event.total) * 100)
        options.onProgress(progress)
      }
    })

    // Handle successful upload
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response: CloudinaryUploadResponse = JSON.parse(xhr.responseText)
          const result: UploadResult = {
            publicId: response.public_id,
            url: response.url,
            secureUrl: response.secure_url,
            width: response.width,
            height: response.height,
            format: response.format,
            bytes: response.bytes
          }
          resolve(result)
        } catch (error) {
          reject(new Error(`Failed to parse upload response: ${error}`))
        }
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.statusText}`))
      }
    })

    // Handle network errors
    xhr.addEventListener('error', () => {
      reject(new Error(`Network error during upload (attempt ${attempt})`))
    })

    // Handle timeout
    xhr.addEventListener('timeout', () => {
      reject(new Error(`Upload timeout (attempt ${attempt})`))
    })

    // Configure request
    xhr.timeout = 60000 // 60 second timeout
    xhr.open('POST', '/api/upload/cloudinary')
    
    // Send the request
    xhr.send(formData)
  })
}

/**
 * Create standardized upload error
 */
function createUploadError(error: Error): FileUploadError {
  let type: FileUploadError['type'] = 'upload'
  let message = error.message

  if (message.includes('network') || message.includes('timeout')) {
    type = 'network'
    message = 'Network error occurred during upload. Please check your connection and try again.'
  } else if (message.includes('validation') || message.includes('400')) {
    type = 'validation'
    message = 'File validation failed. Please check file format and size requirements.'
  } else if (message.includes('401') || message.includes('403')) {
    type = 'upload'
    message = 'Upload authorization failed. Please try again.'
  } else if (message.includes('413')) {
    type = 'validation'
    message = 'File is too large for upload. Please choose a smaller file.'
  } else if (message.includes('429')) {
    type = 'network'
    message = 'Too many upload requests. Please wait a moment and try again.'
  } else {
    message = 'Upload failed. Please try again.'
  }

  return {
    type,
    message,
    details: { originalError: error }
  }
}

/**
 * Cancel ongoing upload (if supported by the implementation)
 */
export function cancelUpload(uploadId?: string): void {
  // This would be implemented if we need to track and cancel specific uploads
  // For now, cancellation is handled at the component level
  console.log('Upload cancellation requested', uploadId)
}