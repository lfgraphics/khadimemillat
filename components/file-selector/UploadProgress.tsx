'use client'

import React, { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import { 
  announceToScreenReader, 
  generateId,
  getAriaAttributes,
  ACCESSIBILITY_MESSAGES
} from './accessibility'

interface UploadProgressProps {
  progress: number
  fileName?: string
  fileSize?: number
  previewUrl?: string
  onCancel?: () => void
  className?: string
  status?: 'uploading' | 'success' | 'error'
  errorMessage?: string
  showPlaceholder?: boolean
}

export function UploadProgress({
  progress,
  fileName,
  fileSize,
  previewUrl,
  onCancel,
  className,
  status = 'uploading',
  errorMessage,
  showPlaceholder = true
}: UploadProgressProps) {
  const [animatedProgress, setAnimatedProgress] = useState(0)
  
  // Accessibility setup
  const progressId = useRef(generateId('upload-progress')).current
  const statusId = useRef(generateId('upload-status')).current
  const previousProgressRef = useRef(0)

  // Animate progress changes and announce progress updates
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedProgress(progress)
      
      // Announce progress updates at 25% intervals for screen readers
      const currentProgress = Math.round(progress)
      const previousProgress = previousProgressRef.current
      
      if (fileName && status === 'uploading' && 
          currentProgress > previousProgress && 
          currentProgress % 25 === 0 && 
          currentProgress > 0 && 
          currentProgress < 100) {
        announceToScreenReader(
          ACCESSIBILITY_MESSAGES.UPLOAD_PROGRESS(fileName, currentProgress)
        )
      }
      
      previousProgressRef.current = currentProgress
    }, 100)
    return () => clearTimeout(timer)
  }, [progress, fileName, status])

  // Announce status changes
  useEffect(() => {
    if (!fileName) return
    
    switch (status) {
      case 'uploading':
        if (progress === 0) {
          announceToScreenReader(ACCESSIBILITY_MESSAGES.UPLOAD_STARTED(fileName))
        }
        break
      case 'success':
        announceToScreenReader(ACCESSIBILITY_MESSAGES.UPLOAD_COMPLETE(fileName))
        break
      case 'error':
        if (errorMessage) {
          announceToScreenReader(ACCESSIBILITY_MESSAGES.UPLOAD_ERROR(fileName, errorMessage), 'assertive')
        }
        break
    }
  }, [status, fileName, errorMessage, progress])

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return ''
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />
      default:
        return <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'bg-green-600'
      case 'error':
        return 'bg-red-600'
      default:
        return 'bg-blue-600'
    }
  }

  return (
    <div 
      className={cn(
        "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm transition-all duration-200",
        "p-3 sm:p-4", // Mobile-first padding
        className
      )}
      role="region"
      aria-labelledby={progressId}
      aria-describedby={statusId}
    >
      {/* Header with file info and cancel button - mobile optimized */}
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
          <div className="flex-shrink-0">
            {getStatusIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <p id={progressId} className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {fileName || 'Uploading file...'}
            </p>
            {fileSize && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formatFileSize(fileSize)}
              </p>
            )}
          </div>
        </div>
        {onCancel && status === 'uploading' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (fileName) {
                announceToScreenReader(ACCESSIBILITY_MESSAGES.UPLOAD_CANCELLED(fileName))
              }
              onCancel()
            }}
            className="ml-1 sm:ml-2 h-7 w-7 sm:h-8 sm:w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex-shrink-0"
            aria-label={`Cancel upload of ${fileName || 'file'}`}
          >
            <X className="h-3 w-3 sm:h-4 sm:w-4" aria-hidden="true" />
          </Button>
        )}
      </div>

      {/* Image preview or placeholder - mobile optimized */}
      {showPlaceholder && (
        <div className="mb-2 sm:mb-3 relative">
          <div className="w-full h-24 sm:h-32 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden relative">
            {previewUrl ? (
              <Image
                src={previewUrl}
                alt={`Preview of ${fileName || 'uploaded file'}`}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
              />
            ) : (
              <Image
                src="/assets/placeholder.png"
                alt="Upload placeholder image"
                fill
                className="object-cover opacity-50"
                sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
              />
            )}
            
            {/* Overlay for upload status - mobile optimized */}
            {status === 'uploading' && (
              <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center" aria-hidden="true">
                <div className="bg-white dark:bg-gray-800 rounded-full p-1.5 sm:p-2 shadow-lg">
                  <Loader2 className="h-4 w-4 sm:h-6 sm:w-6 text-blue-600 animate-spin" />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Progress bar - mobile optimized */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 sm:h-2 mb-2 overflow-hidden">
        <div 
          className={cn(
            "h-1.5 sm:h-2 rounded-full transition-all duration-500 ease-out",
            getStatusColor()
          )}
          style={{ width: `${Math.min(100, Math.max(0, animatedProgress))}%` }}
          role="progressbar"
          aria-valuenow={Math.round(animatedProgress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Upload progress: ${Math.round(animatedProgress)}%`}
        />
      </div>
      
      {/* Status and progress info - mobile optimized */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-1 sm:space-x-2 flex-1 min-w-0">
          <span id={statusId} className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0" aria-live="polite">
            {status === 'success' ? 'Complete' : 
             status === 'error' ? 'Failed' :
             `${Math.round(animatedProgress)}%`}
          </span>
          {status === 'error' && errorMessage && (
            <span className="text-xs text-red-600 dark:text-red-400 truncate" role="alert">
              - {errorMessage}
            </span>
          )}
        </div>
        
        {/* Loading animation dots - mobile optimized */}
        {status === 'uploading' && animatedProgress < 100 && (
          <div className="flex space-x-0.5 sm:space-x-1 flex-shrink-0" aria-hidden="true">
            <div className="w-1 h-1 bg-blue-600 rounded-full animate-pulse" />
            <div className="w-1 h-1 bg-blue-600 rounded-full animate-pulse delay-75" />
            <div className="w-1 h-1 bg-blue-600 rounded-full animate-pulse delay-150" />
          </div>
        )}
      </div>
    </div>
  )
}

export default UploadProgress