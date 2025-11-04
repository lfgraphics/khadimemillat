'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { validateFile, DEFAULT_VALIDATION_RULES, createValidationError } from './validation'
import { FileValidationRules, CustomValidator, FileUploadError } from './types'
import { FileUploadModal } from './FileUploadModal'
import { 
  announceToScreenReader, 
  useFocusManagement, 
  generateId, 
  isActivationKey,
  getAriaAttributes,
  ACCESSIBILITY_MESSAGES,
  KEYBOARD_KEYS
} from './accessibility'

interface FileDropZoneProps {
    onFileSelect: (file: File, previewUrl: string) => void
    onError?: (error: FileUploadError) => void
    onTakePhoto?: () => void
    disabled?: boolean
    className?: string
    placeholder?: string
    validationRules?: Partial<FileValidationRules>
    customValidators?: CustomValidator[]
}

export function FileDropZone({
    onFileSelect,
    onError,
    onTakePhoto,
    disabled = false,
    className,
    placeholder = "Drag and drop files here or click to select",
    validationRules,
    customValidators = []
}: FileDropZoneProps) {
    const [isDragOver, setIsDragOver] = useState(false)
    const [dragCounter, setDragCounter] = useState(0)
    const [isModalOpen, setIsModalOpen] = useState(false)
    
    // Accessibility state and refs
    const { focusRef } = useFocusManagement()
    const dropZoneId = useRef(generateId('drop-zone')).current
    const descriptionId = useRef(generateId('drop-zone-desc')).current
    const instructionsId = useRef(generateId('drop-zone-instructions')).current

    // Merge validation rules with defaults
    const mergedValidationRules = {
        ...DEFAULT_VALIDATION_RULES,
        ...validationRules
    }

    // Handle file validation and selection for drag-and-drop
    const handleFileSelection = useCallback(async (file: File) => {
        if (disabled) return

        try {
            // Announce file selection
            announceToScreenReader(ACCESSIBILITY_MESSAGES.FILE_SELECTED(file.name))

            const validationResult = await validateFile(file, mergedValidationRules)

            if (!validationResult.isValid) {
                const error = createValidationError(validationResult)
                // Announce validation error
                announceToScreenReader(
                    ACCESSIBILITY_MESSAGES.VALIDATION_ERROR(validationResult.errors),
                    'assertive'
                )
                onError?.(error)
                return
            }

            // Apply custom validation if provided
            if (customValidators.length > 0) {
                for (const validator of customValidators) {
                    const customResult = await validator(file)
                    if (!customResult.isValid) {
                        const error = createValidationError(customResult)
                        // Announce custom validation error
                        announceToScreenReader(
                            ACCESSIBILITY_MESSAGES.VALIDATION_ERROR(customResult.errors),
                            'assertive'
                        )
                        onError?.(error)
                        return
                    }
                }
            }

            // Create preview URL for drag-and-drop files
            const previewUrl = URL.createObjectURL(file)
            onFileSelect(file, previewUrl)
        } catch (error) {
            const errorMessage = 'File validation failed due to an unexpected error'
            announceToScreenReader(errorMessage, 'assertive')
            onError?.({
                type: 'validation',
                message: errorMessage,
                details: error
            })
        }
    }, [disabled, mergedValidationRules, customValidators, onFileSelect, onError])

    // Handle drag enter event
    const handleDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()

        if (disabled) return

        setDragCounter(prev => prev + 1)

        if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
            setIsDragOver(true)
            // Announce drag enter for screen readers
            announceToScreenReader(ACCESSIBILITY_MESSAGES.DRAG_ENTER())
        }
    }, [disabled])

    // Handle drag leave event
    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()

        if (disabled) return

        setDragCounter(prev => {
            const newCounter = prev - 1
            if (newCounter === 0) {
                setIsDragOver(false)
                // Announce drag leave for screen readers
                announceToScreenReader(ACCESSIBILITY_MESSAGES.DRAG_LEAVE())
            }
            return newCounter
        })
    }, [disabled])

    // Handle drag over event
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()

        if (disabled) return

        // Set the dropEffect to indicate this is a valid drop zone
        e.dataTransfer.dropEffect = 'copy'
    }, [disabled])

    // Handle drop event
    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()

        if (disabled) return

        setIsDragOver(false)
        setDragCounter(0)

        const files = Array.from(e.dataTransfer.files)

        if (files.length === 0) {
            const errorMessage = 'No files were dropped'
            announceToScreenReader(errorMessage, 'assertive')
            onError?.({
                type: 'validation',
                message: errorMessage
            })
            return
        }

        // Handle multiple files by accepting only the first valid file
        // as per requirement 1.4
        const firstFile = files[0]

        if (files.length > 1) {
            // Announce multiple files dropped
            announceToScreenReader(ACCESSIBILITY_MESSAGES.MULTIPLE_FILES_DROPPED(files.length))
            console.warn(`Multiple files dropped. Processing only the first file: ${firstFile.name}`)
        } else {
            // Announce single file dropped
            announceToScreenReader(ACCESSIBILITY_MESSAGES.FILE_DROPPED(firstFile.name))
        }

        handleFileSelection(firstFile)
    }, [disabled, handleFileSelection, onError])

    // Handle click to open modal
    const handleClick = useCallback(() => {
        if (disabled) return
        setIsModalOpen(true)
        // Announce modal opening
        announceToScreenReader(ACCESSIBILITY_MESSAGES.MODAL_OPENED())
    }, [disabled])

    // Handle keyboard activation
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (disabled) return

        if (isActivationKey(e.key)) {
            e.preventDefault()
            handleClick()
        }
    }, [disabled, handleClick])

    // Handle modal close
    const handleModalClose = useCallback(() => {
        setIsModalOpen(false)
        // Announce modal closing and restore focus
        announceToScreenReader(ACCESSIBILITY_MESSAGES.MODAL_CLOSED())
        // Focus will be restored by the focus trap hook
    }, [])

    // Handle file selection from modal (browser selection)
    const handleModalFileSelect = useCallback((file: File, previewUrl: string) => {
        onFileSelect(file, previewUrl)
    }, [onFileSelect])

    // Handle take photo from modal
    const handleModalTakePhoto = useCallback(() => {
        onTakePhoto?.()
    }, [onTakePhoto])

    // Announce component state changes
    useEffect(() => {
        if (disabled) {
            announceToScreenReader(ACCESSIBILITY_MESSAGES.COMPONENT_DISABLED())
        } else {
            announceToScreenReader(ACCESSIBILITY_MESSAGES.COMPONENT_READY())
        }
    }, [disabled])

    return (
        <>
            <div
                ref={focusRef}
                id={dropZoneId}
                className={cn(
                    "border-2 border-dashed rounded-lg text-center transition-all duration-200 ease-in-out",
                    "p-4 sm:p-6 md:p-8", // Mobile-first padding
                    "min-h-[120px] sm:min-h-[140px]", // Responsive minimum height
                    isDragOver
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20 scale-[1.01] sm:scale-[1.02] shadow-lg"
                        : "border-gray-300 hoact:border-gray-400 dark:border-gray-600 dark:hoact:border-gray-500",
                    disabled && "opacity-50 cursor-not-allowed",
                    !disabled && "cursor-pointer hoact:bg-gray-50 dark:hoact:bg-gray-800/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                    className
                )}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={handleClick}
                onKeyDown={handleKeyDown}
                {...getAriaAttributes({
                    label: `File upload drop zone. ${placeholder}. Press Enter or Space to open file selection options.`,
                    describedBy: `${descriptionId} ${instructionsId}`,
                    disabled: disabled,
                    expanded: isModalOpen
                })}
                role="button"
                tabIndex={disabled ? -1 : 0}
            >
                <div className="space-y-1 sm:space-y-2">
                    <div className={cn(
                        "text-gray-500 transition-colors duration-200",
                        isDragOver && "text-blue-500"
                    )}>
                        <svg
                            className={cn(
                                "mx-auto transition-all duration-200",
                                "h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12", // Responsive icon size
                                isDragOver ? "text-blue-500 scale-110" : "text-gray-400"
                            )}
                            stroke="currentColor"
                            fill="none"
                            viewBox="0 0 48 48"
                        >
                            <path
                                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </div>
                    <p 
                        id={descriptionId}
                        className={cn(
                            "text-gray-600 dark:text-gray-300 transition-colors duration-200",
                            "text-sm sm:text-base", // Responsive text size
                            "px-2", // Horizontal padding for mobile
                            isDragOver && "text-blue-600 dark:text-blue-400 font-medium"
                        )}
                    >
                        {isDragOver ? "Drop your file here" : placeholder}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-500 px-2">
                        {isDragOver
                            ? "Release to upload"
                            : "Click to browse or drag files here"
                        }
                    </p>
                    {!isDragOver && (
                        <p 
                            id={instructionsId}
                            className="text-xs text-gray-400 dark:text-gray-500 px-2 leading-tight"
                        >
                            <span className="block sm:inline">
                                Formats: {mergedValidationRules.allowedTypes.map(type =>
                                    type.split('/')[1].toUpperCase()
                                ).join(', ')}
                            </span>
                            <span className="block sm:inline sm:ml-1">
                                • Max: {Math.round(mergedValidationRules.maxSize / (1024 * 1024))}MB
                            </span>
                        </p>
                    )}
                </div>
            </div>

            {/* File Upload Modal */}
            <FileUploadModal
                isOpen={isModalOpen}
                onClose={handleModalClose}
                onFileSelect={handleModalFileSelect}
                onError={onError || (() => {})}
                onTakePhoto={handleModalTakePhoto}
                acceptedTypes={mergedValidationRules.allowedTypes}
                maxFileSize={mergedValidationRules.maxSize}
                validationRules={mergedValidationRules}
                customValidators={customValidators}
                disabled={disabled}
            />
        </>
    )
}

export default FileDropZone