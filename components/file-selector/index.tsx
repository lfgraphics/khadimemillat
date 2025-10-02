'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
  EnhancedFileSelectorProps,
  FileState,
  FileUploadError,
  ValidationResult,
  FileValidationRules
} from './types'
import {
  validateFileWithCustomRules,
  createValidationError,
  DEFAULT_VALIDATION_RULES
} from './validation'
import { FileDropZone } from './FileDropZone'
import { CameraCapture } from './CameraCapture'
import { UploadProgress } from './UploadProgress'
import { FilePreview } from './FilePreview'
import { ErrorDisplay } from './ErrorDisplay'
import { uploadToCloudinary as uploadFileToCloudinary, type CloudinaryUploadOptions } from './cloudinary-upload'
import { 
  showErrorToast, 
  showSuccessToast, 
  showProgressToast, 
  updateProgressToast,
  dismissProgressToast,
  showValidationErrorToast,
  showNetworkErrorToast
} from './toast-notifications'
import { 
  ErrorRecoveryManager, 
  createErrorRecovery,
  shouldAutoRetry
} from './error-recovery'

const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const DEFAULT_ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export function EnhancedFileSelector({
  onFileSelect,
  onUploadComplete,
  onError,
  maxFileSize = DEFAULT_MAX_FILE_SIZE,
  acceptedTypes = DEFAULT_ACCEPTED_TYPES,
  placeholder = "Drag and drop files here or click to select",
  disabled = false,
  className,
  showPreview = true,
  uploadToCloudinary = true,
  customValidators = [],
  validationRules,
  cloudinaryOptions = {}
}: EnhancedFileSelectorProps) {
  // Core state management
  const [fileState, setFileState] = useState<FileState>({
    uploadState: 'idle',
    selectedFile: null,
    uploadProgress: 0,
    previewUrl: null,
    error: null
  })

  // Camera state management
  const [showCamera, setShowCamera] = useState(false)

  // Error handling and recovery state
  const [showErrorDetails, setShowErrorDetails] = useState(false)
  const [currentError, setCurrentError] = useState<FileUploadError | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  
  // Error recovery manager
  const errorRecoveryRef = useRef<ErrorRecoveryManager>(createErrorRecovery({
    maxRetries: 3,
    baseDelay: 1000,
    backoffMultiplier: 2
  }))
  
  // Toast notification tracking
  const progressToastRef = useRef<string | number | null>(null)

  // Create validation rules from props
  const validationRulesConfig: FileValidationRules = {
    ...DEFAULT_VALIDATION_RULES,
    maxSize: maxFileSize,
    allowedTypes: acceptedTypes,
    ...validationRules
  }

  // File validation utility using comprehensive validation system
  const validateFile = useCallback(async (file: File): Promise<ValidationResult> => {
    try {
      return await validateFileWithCustomRules(file, validationRulesConfig, customValidators)
    } catch (error) {
      return {
        isValid: false,
        errors: ['Validation failed due to an unexpected error']
      }
    }
  }, [validationRulesConfig, customValidators])

  // Update upload state
  const updateUploadState = useCallback((newState: Partial<FileState>) => {
    setFileState(prev => ({ ...prev, ...newState }))
  }, [])

  // Enhanced error handling with recovery and notifications
  const handleUploadError = useCallback((error: FileUploadError, showToast: boolean = true) => {
    console.error('File selector error:', error)
    
    // Update component state
    setCurrentError(error)
    updateUploadState({
      uploadState: 'error',
      error: error.message
    })

    // Dismiss progress toast if active
    if (progressToastRef.current) {
      dismissProgressToast(progressToastRef.current, false, fileState.selectedFile?.name || 'file', undefined, error)
      progressToastRef.current = null
    }

    // Show toast notification based on error type
    if (showToast) {
      const errorRecovery = errorRecoveryRef.current
      
      if (shouldAutoRetry(error) && errorRecovery.canRetry(error)) {
        // Show network error toast with retry option
        showNetworkErrorToast(error, () => handleRetryUpload(), retryCount)
      } else {
        // Show general error toast with fallback options
        showErrorToast(error, {
          onRetry: errorRecovery.canRetry(error) ? () => handleRetryUpload() : undefined,
          onFallback: () => handleFallbackAction(),
          showDetails: true,
          currentRetries: retryCount
        })
      }
    }

    // Notify parent component
    onError(error)
  }, [updateUploadState, onError, fileState.selectedFile?.name, retryCount])

  // Reset component state
  const resetState = useCallback(() => {
    if (fileState.previewUrl) {
      URL.revokeObjectURL(fileState.previewUrl)
    }
    if (fileState.uploadInterval) {
      clearInterval(fileState.uploadInterval)
    }
    
    // Dismiss any active progress toast
    if (progressToastRef.current) {
      dismissProgressToast(progressToastRef.current, false, fileState.selectedFile?.name || 'file')
      progressToastRef.current = null
    }
    
    // Reset error recovery state
    errorRecoveryRef.current.reset()
    setCurrentError(null)
    setRetryCount(0)
    setShowErrorDetails(false)
    
    updateUploadState({
      uploadState: 'idle',
      selectedFile: null,
      uploadProgress: 0,
      previewUrl: null,
      error: null,
      uploadInterval: undefined
    })
  }, [fileState.previewUrl, fileState.uploadInterval, fileState.selectedFile?.name, updateUploadState])

  // Handle error dismissal
  const handleErrorDismiss = useCallback(() => {
    setCurrentError(null)
    setShowErrorDetails(false)
    updateUploadState({ error: null })
  }, [updateUploadState])

  // Handle actual Cloudinary upload with progress tracking and notifications
  const startUpload = useCallback(async (file: File) => {
    updateUploadState({ uploadState: 'uploading', uploadProgress: 0 })

    // Show progress toast
    progressToastRef.current = showProgressToast(file.name, 0)

    try {
      // Configure upload options with progress tracking
      const uploadOptions: CloudinaryUploadOptions = {
        folder: 'kmwf/file-selector',
        tags: ['file-selector', 'user-upload'],
        maxRetries: 1, // We handle retries at component level
        onProgress: (progress) => {
          updateUploadState({ uploadProgress: progress })
          
          // Update progress toast
          if (progressToastRef.current) {
            updateProgressToast(progressToastRef.current, progress, file.name)
          }
        },
        ...cloudinaryOptions
      }

      // Upload to Cloudinary
      const uploadResult = await uploadFileToCloudinary(file, uploadOptions)

      // Update state to success
      updateUploadState({
        uploadState: 'success',
        uploadProgress: 100
      })

      // Show success notification and dismiss progress toast
      if (progressToastRef.current) {
        dismissProgressToast(progressToastRef.current, true, file.name, uploadResult)
        progressToastRef.current = null
      } else {
        showSuccessToast(uploadResult, file.name)
      }

      // Reset error state on success
      setCurrentError(null)
      setRetryCount(0)
      errorRecoveryRef.current.reset()

      // Notify parent component
      onUploadComplete(uploadResult)

    } catch (error) {
      console.error('Upload failed:', error)

      // Handle upload error
      const uploadError = error as FileUploadError
      handleUploadError(uploadError, true)
    }
  }, [updateUploadState, cloudinaryOptions, onUploadComplete, handleUploadError])

  // Handle file selection (already validated by FileDropZone or Modal)
  const handleFileSelect = useCallback(async (file: File, previewUrl: string) => {
    updateUploadState({
      uploadState: 'selecting',
      selectedFile: file,
      previewUrl,
      error: null
    })

    onFileSelect(file, previewUrl)

    // Start upload process if uploadToCloudinary is enabled
    if (uploadToCloudinary) {
      await startUpload(file)
    }
  }, [updateUploadState, onFileSelect, uploadToCloudinary, startUpload])

  // Handle retry upload with error recovery
  const handleRetryUpload = useCallback(async () => {
    if (!fileState.selectedFile || !currentError) return
    
    const errorRecovery = errorRecoveryRef.current
    
    if (!errorRecovery.canRetry(currentError)) {
      showErrorToast(currentError, { showDetails: true })
      return
    }

    try {
      setRetryCount(prev => prev + 1)
      setCurrentError(null)
      
      // Execute retry with exponential backoff
      await errorRecovery.executeRetry(
        () => startUpload(fileState.selectedFile!),
        currentError,
        (attempt, delay) => {
          console.log(`Retry attempt ${attempt} scheduled in ${delay}ms`)
        }
      )
    } catch (retryError) {
      handleUploadError(retryError as FileUploadError, true)
    }
  }, [fileState.selectedFile, currentError, startUpload, handleUploadError])

  // Handle fallback action (open file browser)
  const handleFallbackAction = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = acceptedTypes.join(',')
    input.onchange = async (e) => {
      const target = e.target as HTMLInputElement
      const file = target.files?.[0]
      if (file) {
        const validationResult = await validateFile(file)
        if (validationResult.isValid) {
          const previewUrl = URL.createObjectURL(file)
          await handleFileSelect(file, previewUrl)
        } else {
          const error = createValidationError(validationResult)
          showValidationErrorToast(validationResult.errors, file.name)
          handleUploadError(error, false) // Don't show toast again
        }
      }
    }
    input.click()
  }, [acceptedTypes, validateFile, handleFileSelect, handleUploadError])

  // Handle upload cancellation
  const cancelUpload = useCallback(() => {
    // Clear any ongoing intervals
    if (fileState.uploadInterval) {
      clearInterval(fileState.uploadInterval)
    }

    // Reset component state
    resetState()
  }, [resetState, fileState.uploadInterval])

  // Handle opening camera
  const handleOpenCamera = useCallback(() => {
    setShowCamera(true)
  }, [])

  // Handle camera photo capture with enhanced error handling
  const handleCameraCapture = useCallback(async (file: File) => {
    try {
      // Validate the captured file
      const validationResult = await validateFile(file)

      if (!validationResult.isValid) {
        const error = createValidationError(validationResult)
        showValidationErrorToast(validationResult.errors, 'Captured photo')
        handleUploadError(error, false) // Don't show toast again
        return
      }

      // Create preview URL for the captured image
      const previewUrl = URL.createObjectURL(file)

      // Handle the file selection
      await handleFileSelect(file, previewUrl)
    } catch (error) {
      const uploadError: FileUploadError = {
        type: 'camera',
        message: 'Failed to process captured image',
        details: { originalError: error }
      }
      handleUploadError(uploadError, true)
    }
  }, [validateFile, handleFileSelect, handleUploadError])

  // Handle camera close
  const handleCameraClose = useCallback(() => {
    setShowCamera(false)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cleanup error recovery manager
      errorRecoveryRef.current.destroy()
      
      // Cleanup preview URL
      if (fileState.previewUrl) {
        URL.revokeObjectURL(fileState.previewUrl)
      }
      
      // Dismiss any active progress toast
      if (progressToastRef.current) {
        dismissProgressToast(progressToastRef.current, false, fileState.selectedFile?.name || 'file')
      }
      
      // Cleanup accessibility live regions
      const { cleanupLiveRegions } = require('./accessibility')
      cleanupLiveRegions()
    }
  }, [fileState.previewUrl, fileState.selectedFile?.name])

  return (
    <div className={cn("w-full max-w-full", className)}>
      {/* Main file selector area - mobile-first responsive */}
      <div className="space-y-3 sm:space-y-4">
        {/* Enhanced File Drop Zone with drag-and-drop functionality */}
        <FileDropZone
          onFileSelect={handleFileSelect}
          onError={(error) => {
            // Show validation errors immediately via toast
            if (error.type === 'validation') {
              const errors = error.details?.errors || [error.message]
              showValidationErrorToast(errors)
            }
            handleUploadError(error, error.type !== 'validation')
          }}
          onTakePhoto={handleOpenCamera}
          disabled={disabled || fileState.uploadState === 'uploading'}
          placeholder={placeholder}
          validationRules={validationRulesConfig}
          customValidators={customValidators}
        />

        {/* Enhanced Error Display - mobile optimized */}
        {currentError && (
          <ErrorDisplay
            error={currentError}
            onRetry={errorRecoveryRef.current.canRetry(currentError) ? handleRetryUpload : undefined}
            onFallback={handleFallbackAction}
            onDismiss={handleErrorDismiss}
            currentRetries={retryCount}
            showDetails={showErrorDetails}
            className="mb-3 sm:mb-4"
          />
        )}

        {/* Simple error display for non-critical errors - mobile optimized */}
        {fileState.error && !currentError && (
          <div className="bg-red-50 border border-red-200 rounded-md p-2 sm:p-3 mb-3 sm:mb-4">
            <p className="text-red-800 text-xs sm:text-sm">{fileState.error}</p>
            <button
              onClick={handleErrorDismiss}
              className="text-red-600 hover:text-red-800 text-xs mt-1 underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Upload progress with enhanced visual feedback - mobile optimized */}
        {(fileState.uploadState === 'uploading' || fileState.uploadState === 'success' || fileState.uploadState === 'error') && fileState.selectedFile && (
          <UploadProgress
            progress={fileState.uploadProgress}
            fileName={fileState.selectedFile.name}
            fileSize={fileState.selectedFile.size}
            previewUrl={fileState.previewUrl || undefined}
            onCancel={fileState.uploadState === 'uploading' ? cancelUpload : undefined}
            status={fileState.uploadState === 'uploading' ? 'uploading' :
              fileState.uploadState === 'success' ? 'success' : 'error'}
            errorMessage={fileState.error || undefined}
            showPlaceholder={true}
          />
        )}

        {/* Enhanced File Preview with management features - mobile optimized */}
        {showPreview && fileState.previewUrl && fileState.selectedFile && fileState.uploadState === 'success' && (
          <FilePreview
            file={fileState.selectedFile}
            previewUrl={fileState.previewUrl}
            onRemove={resetState}
            onReplace={() => {
              resetState()
              // Trigger file selection again
              const input = document.createElement('input')
              input.type = 'file'
              input.accept = acceptedTypes.join(',')
              input.onchange = async (e) => {
                const target = e.target as HTMLInputElement
                const file = target.files?.[0]
                if (file) {
                  const validationResult = await validateFile(file)
                  if (validationResult.isValid) {
                    const previewUrl = URL.createObjectURL(file)
                    await handleFileSelect(file, previewUrl)
                  } else {
                    const error = createValidationError(validationResult)
                    handleUploadError(error)
                  }
                }
              }
              input.click()
            }}
            showFullPreview={true}
            className="mt-3 sm:mt-4"
          />
        )}
      </div>

      {/* Camera Capture Modal */}
      {showCamera && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onError={(error) => {
            handleUploadError(error, true)
            setShowCamera(false) // Close camera on error
          }}
          onClose={handleCameraClose}
        />
      )}
    </div>
  )
}

export default EnhancedFileSelector