'use client'

import React, { useRef, useCallback, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Upload, Camera, X } from 'lucide-react'
import { validateFileWithCustomRules, DEFAULT_VALIDATION_RULES } from './validation'
import { FileValidationRules, CustomValidator, FileUploadError } from './types'
import { 
  announceToScreenReader, 
  useFocusTrap, 
  generateId,
  getAriaAttributes,
  ACCESSIBILITY_MESSAGES,
  KEYBOARD_KEYS
} from './accessibility'

interface FileUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onFileSelect: (file: File, previewUrl: string) => void
  onError: (error: FileUploadError) => void
  onTakePhoto: () => void
  acceptedTypes?: string[]
  maxFileSize?: number
  validationRules?: Partial<FileValidationRules>
  customValidators?: CustomValidator[]
  disabled?: boolean
}

export function FileUploadModal({
  isOpen,
  onClose,
  onFileSelect,
  onError,
  onTakePhoto,
  acceptedTypes = DEFAULT_VALIDATION_RULES.allowedTypes,
  maxFileSize = DEFAULT_VALIDATION_RULES.maxSize,
  validationRules,
  customValidators = [],
  disabled = false
}: FileUploadModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Accessibility setup
  const focusTrapRef = useFocusTrap(isOpen)
  const modalId = useRef(generateId('upload-modal')).current
  const descriptionId = useRef(generateId('modal-desc')).current
  const storageDescId = useRef(generateId('storage-desc')).current
  const cameraDescId = useRef(generateId('camera-desc')).current

  // Merge validation rules with defaults
  const mergedValidationRules: FileValidationRules = {
    ...DEFAULT_VALIDATION_RULES,
    maxSize: maxFileSize,
    allowedTypes: acceptedTypes,
    ...validationRules
  }

  // Handle file selection from browser
  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return

    const file = files[0] // Take only the first file

    try {
      // Announce file selection
      announceToScreenReader(ACCESSIBILITY_MESSAGES.FILE_SELECTED(file.name))

      // Validate the selected file
      const validationResult = await validateFileWithCustomRules(
        file,
        mergedValidationRules,
        customValidators
      )

      if (!validationResult.isValid) {
        // Announce validation error
        announceToScreenReader(
          ACCESSIBILITY_MESSAGES.VALIDATION_ERROR(validationResult.errors),
          'assertive'
        )
        
        const error: FileUploadError = {
          type: 'validation',
          message: validationResult.errors.join('; '),
          details: {
            errors: validationResult.errors,
            file: {
              name: file.name,
              size: file.size,
              type: file.type
            }
          }
        }
        onError(error)
        return
      }

      // Create preview URL for the file
      const previewUrl = URL.createObjectURL(file)
      
      // Call the file select callback
      onFileSelect(file, previewUrl)
      
      // Close the modal
      onClose()
    } catch (error) {
      const errorMessage = 'Failed to process selected file'
      announceToScreenReader(errorMessage, 'assertive')
      
      const uploadError: FileUploadError = {
        type: 'validation',
        message: errorMessage,
        details: { originalError: error }
      }
      onError(uploadError)
    }
  }, [mergedValidationRules, customValidators, onFileSelect, onError, onClose])

  // Handle "Select from Storage" button click
  const handleSelectFromStorage = useCallback(() => {
    if (disabled) return
    
    // Trigger the hidden file input
    fileInputRef.current?.click()
  }, [disabled])

  // Handle file input change
  const handleFileInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    handleFileSelect(files)
    
    // Reset the input value to allow selecting the same file again
    if (event.target) {
      event.target.value = ''
    }
  }, [handleFileSelect])

  // Handle "Take Photo" button click
  const handleTakePhoto = useCallback(() => {
    if (disabled) return
    
    onTakePhoto()
    onClose()
  }, [disabled, onTakePhoto, onClose])

  // Handle modal close with keyboard (Escape key)
  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) {
      onClose()
    }
  }, [onClose])

  // Handle escape key for modal close
  useEffect(() => {
    const handleEscape = (event: Event) => {
      if (event instanceof CustomEvent && event.type === 'file-selector-escape') {
        onClose()
      }
    }

    if (isOpen) {
      document?.addEventListener('file-selector-escape', handleEscape)
      return () => {
        document?.removeEventListener('file-selector-escape', handleEscape)
      }
    }
  }, [isOpen, onClose])

  // Announce modal state changes
  useEffect(() => {
    if (isOpen) {
      announceToScreenReader(ACCESSIBILITY_MESSAGES.MODAL_OPENED())
    }
  }, [isOpen])

  // Create accept attribute for file input
  const acceptAttribute = acceptedTypes.join(',')

  return (
    <>
      {/* Hidden file input for browser file selection */}
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptAttribute}
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
        aria-hidden="true"
      />

      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent 
          ref={focusTrapRef}
          className="sm:max-w-md"
          id={modalId}
          aria-describedby={descriptionId}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              Select File Source
            </DialogTitle>
            <DialogDescription id={descriptionId}>
              Choose how you would like to add your file. 
              Supported formats: {acceptedTypes.map(type => type.split('/')[1].toUpperCase()).join(', ')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4" role="group" aria-label="File selection options">
            <Button
              onClick={handleSelectFromStorage}
              variant="outline"
              className="flex items-center gap-2 h-12 hover:bg-accent hover:text-accent-foreground transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              disabled={disabled}
              aria-describedby={storageDescId}
              {...getAriaAttributes({
                disabled: disabled
              })}
            >
              <Upload className="h-5 w-5" aria-hidden="true" />
              Select from Storage
            </Button>
            <p id={storageDescId} className="sr-only">
              Open file browser to select an image from your device storage
            </p>
            
            <Button
              onClick={handleTakePhoto}
              variant="outline"
              className="flex items-center gap-2 h-12 hover:bg-accent hover:text-accent-foreground transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              disabled={disabled}
              aria-describedby={cameraDescId}
              {...getAriaAttributes({
                disabled: disabled
              })}
            >
              <Camera className="h-5 w-5" aria-hidden="true" />
              Take Photo
            </Button>
            <p id={cameraDescId} className="sr-only">
              Open camera to capture a new photo
            </p>
          </div>

          <div className="text-xs text-muted-foreground text-center">
            Maximum file size: {Math.round(maxFileSize / (1024 * 1024))}MB
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default FileUploadModal