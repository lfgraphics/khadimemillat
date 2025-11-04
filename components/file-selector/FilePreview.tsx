'use client'

import React, { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { X, RotateCcw, Eye, Download, FileImage } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { 
  announceToScreenReader, 
  useFocusTrap, 
  generateId,
  getAriaAttributes,
  ACCESSIBILITY_MESSAGES
} from './accessibility'

interface FilePreviewProps {
  file: File
  previewUrl: string
  onRemove?: () => void
  onReplace?: () => void
  className?: string
  showFullPreview?: boolean
  compact?: boolean
}

export function FilePreview({
  file,
  previewUrl,
  onRemove,
  onReplace,
  className,
  showFullPreview = true,
  compact = false
}: FilePreviewProps) {
  const [isFullPreviewOpen, setIsFullPreviewOpen] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  
  // Accessibility setup
  const focusTrapRef = useFocusTrap(isFullPreviewOpen)
  const previewId = useRef(generateId('file-preview')).current
  const detailsId = useRef(generateId('file-details')).current
  const actionsId = useRef(generateId('file-actions')).current

  // Format file size with proper units
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Get file type display name
  const getFileTypeDisplay = (type: string): string => {
    const typeMap: { [key: string]: string } = {
      'image/jpeg': 'JPEG',
      'image/jpg': 'JPG',
      'image/png': 'PNG',
      'image/webp': 'WebP',
      'image/gif': 'GIF',
      'image/svg+xml': 'SVG'
    }
    return typeMap[type] || type.split('/')[1]?.toUpperCase() || 'Unknown'
  }

  // Handle image load to get dimensions
  const handleImageLoad = () => {
    if (imgRef.current) {
      setImageDimensions({
        width: imgRef.current.naturalWidth,
        height: imgRef.current.naturalHeight
      })
    }
  }

  // Handle image error
  const handleImageError = () => {
    setImageError(true)
  }

  // Download file
  const handleDownload = () => {
    const link = document?.createElement('a')
    link.href = previewUrl
    link.download = file.name
    document?.body.appendChild(link)
    link.click()
    document?.body.removeChild(link)
    
    // Announce download
    announceToScreenReader(`Downloaded ${file.name}`)
  }

  // Handle remove with announcement
  const handleRemove = () => {
    if (onRemove) {
      announceToScreenReader(ACCESSIBILITY_MESSAGES.FILE_REMOVED(file.name))
      onRemove()
    }
  }

  // Handle replace with announcement
  const handleReplace = () => {
    if (onReplace) {
      announceToScreenReader(ACCESSIBILITY_MESSAGES.FILE_REPLACED(file.name))
      onReplace()
    }
  }

  // Handle full preview open
  const handleFullPreviewOpen = () => {
    setIsFullPreviewOpen(true)
    announceToScreenReader(`Opened full preview for ${file.name}`)
  }

  // Handle full preview close
  const handleFullPreviewClose = () => {
    setIsFullPreviewOpen(false)
    announceToScreenReader(`Closed full preview for ${file.name}`)
  }

  // Responsive thumbnail sizes
  const getThumbnailSize = () => {
    if (compact) return 'w-10 h-10 sm:w-12 sm:h-12'
    return 'w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20'
  }

  // Compact layout for smaller spaces - mobile optimized
  if (compact) {
    return (
      <div 
        className={cn("bg-white dark:bg-gray-800 border rounded-lg p-2 shadow-sm", className)}
        role="region"
        aria-labelledby={previewId}
        aria-describedby={detailsId}
      >
        <div className="flex items-center space-x-2">
          {/* Thumbnail */}
          <div className="flex-shrink-0">
            {imageError ? (
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 dark:bg-gray-700 rounded-md border flex items-center justify-center">
                <FileImage className="h-4 w-4 sm:h-6 sm:w-6 text-gray-400" aria-hidden="true" />
              </div>
            ) : (
              <img
                ref={imgRef}
                src={previewUrl}
                alt={`Thumbnail of ${file.name}`}
                className="w-10 h-10 sm:w-12 sm:h-12 object-cover rounded-md border"
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
            )}
          </div>
          
          {/* File info */}
          <div className="flex-1 min-w-0">
            <p id={previewId} className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
              {file.name}
            </p>
            <p id={detailsId} className="text-xs text-gray-500 dark:text-gray-400">
              {formatFileSize(file.size)}
            </p>
          </div>
          
          {/* Actions */}
          <div className="flex space-x-0.5 sm:space-x-1" role="group" aria-label="File actions">
            {onReplace && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReplace}
                className="h-6 w-6 p-0 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                aria-label={`Replace ${file.name}`}
              >
                <RotateCcw className="h-3 w-3" aria-hidden="true" />
              </Button>
            )}
            {onRemove && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                className="h-6 w-6 p-0 text-red-600 hoact:text-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                aria-label={`Remove ${file.name}`}
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div 
        className={cn("bg-white dark:bg-gray-800 border rounded-lg shadow-sm transition-all hoact:shadow-md", "p-3 sm:p-4", className)}
        role="region"
        aria-labelledby={previewId}
        aria-describedby={detailsId}
      >
        <div className="flex items-start space-x-3 sm:space-x-4">
          {/* Image preview - mobile optimized */}
          <div className="flex-shrink-0">
            {imageError ? (
              <div className={cn("bg-gray-100 dark:bg-gray-700 rounded-md border flex items-center justify-center", getThumbnailSize())}>
                <FileImage className="h-4 w-4 sm:h-6 sm:w-6 md:h-8 md:w-8 text-gray-400" aria-hidden="true" />
              </div>
            ) : (
              <div className="relative group">
                <img
                  ref={imgRef}
                  src={previewUrl}
                  alt={`Preview of ${file.name}`}
                  className={cn("object-cover rounded-md border transition-all", getThumbnailSize())}
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                />
                {showFullPreview && (
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hoact:bg-opacity-30 transition-all rounded-md flex items-center justify-center opacity-0 group-hoact:opacity-100">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleFullPreviewOpen}
                      className="h-6 w-6 sm:h-8 sm:w-8 p-0 text-white hoact:bg-white hoact:bg-opacity-20 focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black"
                      aria-label={`View full size preview of ${file.name}`}
                    >
                      <Eye className="h-3 w-3 sm:h-4 sm:w-4" aria-hidden="true" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* File info - mobile optimized */}
          <div className="flex-1 min-w-0">
            <p id={previewId} className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 truncate" title={file.name}>
              {file.name}
            </p>
            <div id={detailsId} className="mt-1 space-y-0.5 sm:space-y-1">
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                {formatFileSize(file.size)} • {getFileTypeDisplay(file.type)}
              </p>
              {imageDimensions && (
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {imageDimensions.width} × {imageDimensions.height}px
                </p>
              )}
              <p className="text-xs text-gray-400 dark:text-gray-500 hidden sm:block">
                Modified: {new Date(file.lastModified).toLocaleDateString()}
              </p>
            </div>
          </div>
          
          {/* Actions - mobile optimized */}
          <div 
            className="flex flex-col space-y-0.5 sm:flex-row sm:space-y-0 sm:space-x-1" 
            role="group" 
            aria-labelledby={actionsId}
          >
            <span id={actionsId} className="sr-only">File actions for {file.name}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              className="h-7 w-7 sm:h-8 sm:w-8 p-0 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label={`Download ${file.name}`}
            >
              <Download className="h-3 w-3 sm:h-4 sm:w-4" aria-hidden="true" />
            </Button>
            {onReplace && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReplace}
                className="h-7 w-7 sm:h-8 sm:w-8 p-0 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                aria-label={`Replace ${file.name}`}
              >
                <RotateCcw className="h-3 w-3 sm:h-4 sm:w-4" aria-hidden="true" />
              </Button>
            )}
            {onRemove && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                className="h-7 w-7 sm:h-8 sm:w-8 p-0 text-red-600 hoact:text-red-700 dark:text-red-400 dark:hoact:text-red-300 focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                aria-label={`Remove ${file.name}`}
              >
                <X className="h-3 w-3 sm:h-4 sm:w-4" aria-hidden="true" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Full size preview modal */}
      {showFullPreview && (
        <Dialog open={isFullPreviewOpen} onOpenChange={handleFullPreviewClose}>
          <DialogContent 
            ref={focusTrapRef}
            className="max-w-[95vw] sm:max-w-4xl max-h-[95vh] p-0 m-2 sm:m-4"
            aria-describedby="full-preview-description"
          >
            <DialogHeader className="p-3 sm:p-6 pb-2">
              <DialogTitle className="text-base sm:text-lg font-semibold truncate">
                Full Preview: {file.name}
              </DialogTitle>
              <div id="full-preview-description" className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 space-y-1">
                <p>{formatFileSize(file.size)} • {getFileTypeDisplay(file.type)}</p>
                {imageDimensions && (
                  <p>{imageDimensions.width} × {imageDimensions.height} pixels</p>
                )}
              </div>
            </DialogHeader>
            <div className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="relative max-h-[50vh] sm:max-h-[60vh] overflow-auto rounded-lg border">
                {imageError ? (
                  <div className="flex items-center justify-center h-48 sm:h-64 bg-gray-100 dark:bg-gray-700">
                    <div className="text-center">
                      <FileImage className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mx-auto mb-2" aria-hidden="true" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">Unable to display image</p>
                    </div>
                  </div>
                ) : (
                  <img
                    src={previewUrl}
                    alt={`Full size preview of ${file.name}`}
                    className="w-full h-auto max-w-full"
                    style={{ maxHeight: '50vh', objectFit: 'contain' }}
                  />
                )}
              </div>
              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 mt-3 sm:mt-4" role="group" aria-label="Full preview actions">
                <Button 
                  variant="outline" 
                  onClick={handleDownload}
                  className="w-full sm:w-auto text-sm focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  aria-label={`Download ${file.name}`}
                >
                  <Download className="h-4 w-4 mr-2" aria-hidden="true" />
                  Download
                </Button>
                {onReplace && (
                  <Button 
                    variant="outline" 
                    onClick={() => { 
                      handleReplace()
                      handleFullPreviewClose()
                    }}
                    className="w-full sm:w-auto text-sm focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    aria-label={`Replace ${file.name}`}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" aria-hidden="true" />
                    Replace
                  </Button>
                )}
                {onRemove && (
                  <Button 
                    variant="destructive" 
                    onClick={() => { 
                      handleRemove()
                      handleFullPreviewClose()
                    }}
                    className="w-full sm:w-auto text-sm focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    aria-label={`Remove ${file.name}`}
                  >
                    <X className="h-4 w-4 mr-2" aria-hidden="true" />
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}

export default FilePreview