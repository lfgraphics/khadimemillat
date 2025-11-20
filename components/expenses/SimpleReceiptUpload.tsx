'use client'

import React, { useState, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Trash2, Download, Eye, Upload, Camera, FileText, Image } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { 
  uploadReceiptToCloudinary, 
  validateReceiptFile, 
  createReceiptValidationError,
  ReceiptUploadResult 
} from '@/components/file-selector/receipt-upload'
import ReceiptCameraCapture from './ReceiptCameraCapture'

interface ReceiptFile {
  url: string
  publicId: string
  fileName: string
  fileSize: number
  uploadedAt: Date
  fileType: string
}

interface SimpleReceiptUploadProps {
  expenseId?: string // Optional for new expenses
  existingReceipts?: ReceiptFile[]
  onReceiptsChange: (receipts: ReceiptFile[]) => void
  disabled?: boolean
  maxReceipts?: number
  className?: string
}

export function SimpleReceiptUpload({
  expenseId,
  existingReceipts = [],
  onReceiptsChange,
  disabled = false,
  maxReceipts = 5,
  className
}: SimpleReceiptUploadProps) {
  const [receipts, setReceipts] = useState<ReceiptFile[]>(existingReceipts)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [dragActive, setDragActive] = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Update parent component when receipts change
  const updateReceipts = useCallback((newReceipts: ReceiptFile[]) => {
    setReceipts(newReceipts)
    onReceiptsChange(newReceipts)
  }, [onReceiptsChange])

  // Handle file upload
  const handleFileUpload = useCallback(async (file: File) => {
    setIsUploading(true)
    setUploadProgress(0)
    
    try {
      // Validate receipt file first
      const validation = validateReceiptFile(file)
      if (!validation.isValid) {
        const error = createReceiptValidationError(validation.errors)
        toast.error(error.message)
        return
      }

      // Upload using receipt-specific endpoint
      const uploadResult: ReceiptUploadResult = await uploadReceiptToCloudinary(file, {
        expenseId,
        onProgress: (progress) => {
          setUploadProgress(progress)
        }
      })

      const newReceipt: ReceiptFile = {
        url: uploadResult.secureUrl,
        publicId: uploadResult.publicId,
        fileName: uploadResult.originalFilename || file.name,
        fileSize: file.size,
        uploadedAt: new Date(),
        fileType: file.type
      }

      const updatedReceipts = [...receipts, newReceipt]
      updateReceipts(updatedReceipts)

      // If we have an expense ID, associate with the expense
      if (expenseId) {
        try {
          const response = await fetch(`/api/expenses/${expenseId}/receipts`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              files: [{ url: uploadResult.secureUrl, publicId: uploadResult.publicId }]
            }),
          })

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || 'Failed to associate receipt with expense')
          }

          toast.success('Receipt uploaded and associated with expense')
        } catch (error) {
          console.error('Error associating receipt with expense:', error)
          toast.error('Receipt uploaded but failed to associate with expense')
          
          // Remove the receipt from local state since server association failed
          updateReceipts(receipts)
        }
      } else {
        toast.success('Receipt uploaded successfully')
      }
    } catch (error) {
      console.error('Receipt upload failed:', error)
      toast.error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }, [receipts, updateReceipts, expenseId])

  // Handle file selection
  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return

    const file = files[0]
    const remainingSlots = maxReceipts - receipts.length
    
    if (remainingSlots <= 0) {
      toast.error(`Maximum number of receipts (${maxReceipts}) reached`)
      return
    }

    handleFileUpload(file)
  }, [handleFileUpload, receipts.length, maxReceipts])

  // Handle drag and drop
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (disabled || isUploading) return
    
    const files = e.dataTransfer.files
    handleFileSelect(files)
  }, [disabled, isUploading, handleFileSelect])

  // Handle click to select files
  const handleClick = useCallback(() => {
    if (disabled || isUploading) return
    fileInputRef.current?.click()
  }, [disabled, isUploading])

  // Handle camera capture
  const handleCameraCapture = useCallback((file: File) => {
    setShowCamera(false)
    handleFileUpload(file)
  }, [handleFileUpload])

  // Handle camera open
  const handleOpenCamera = useCallback(() => {
    if (disabled || isUploading) return
    const remainingSlots = maxReceipts - receipts.length
    
    if (remainingSlots <= 0) {
      toast.error(`Maximum number of receipts (${maxReceipts}) reached`)
      return
    }

    setShowCamera(true)
  }, [disabled, isUploading, receipts.length, maxReceipts])

  // Remove receipt
  const handleRemoveReceipt = useCallback((index: number) => {
    const updatedReceipts = receipts.filter((_, i) => i !== index)
    updateReceipts(updatedReceipts)
    toast.success('Receipt removed')
  }, [receipts, updateReceipts])

  // Download receipt
  const handleDownloadReceipt = useCallback((receipt: ReceiptFile) => {
    const link = document.createElement('a')
    link.href = receipt.url
    link.download = receipt.fileName
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [])

  // View receipt in new tab
  const handleViewReceipt = useCallback((receipt: ReceiptFile) => {
    window.open(receipt.url, '_blank')
  }, [])

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Get file icon
  const getFileIcon = (fileType: string) => {
    if (fileType === 'application/pdf') {
      return <FileText className="h-5 w-5 text-red-600" />
    }
    return <Image className="h-5 w-5 text-blue-600" />
  }

  const canAddMore = receipts.length < maxReceipts
  const remainingSlots = maxReceipts - receipts.length

  return (
    <div className={cn("space-y-4", className)}>
      {/* Upload Section */}
      {canAddMore && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Upload className="h-5 w-5" />
              Upload Receipt
              {receipts.length > 0 && (
                <Badge variant="secondary">
                  {receipts.length}/{maxReceipts}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
            />

            {/* Drop Zone */}
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
                dragActive ? "border-blue-500 bg-blue-50 dark:bg-blue-950" : "border-gray-300 dark:border-gray-600",
                disabled || isUploading ? "opacity-50 cursor-not-allowed" : "hover:border-gray-400 dark:hover:border-gray-500"
              )}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={handleClick}
            >
              {isUploading ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center">
                    <Upload className="h-8 w-8 text-blue-600 animate-pulse" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Uploading receipt... {uploadProgress}%
                    </p>
                    <Progress value={uploadProgress} className="w-full max-w-xs mx-auto" />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-center">
                    <Upload className="h-8 w-8 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Drop receipt files here or click to select
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      Supports JPEG, PNG, WebP, and PDF files up to 10MB
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      {remainingSlots} slot{remainingSlots !== 1 ? 's' : ''} remaining
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Camera Button */}
            <div className="mt-4 flex justify-center">
              <Button
                variant="outline"
                onClick={handleOpenCamera}
                disabled={disabled || isUploading}
                className="flex items-center gap-2"
              >
                <Camera className="h-4 w-4" />
                Take Photo
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing Receipts */}
      {receipts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Eye className="h-5 w-5" />
              Uploaded Receipts ({receipts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {receipts.map((receipt, index) => (
                <div
                  key={`${receipt.publicId}-${index}`}
                  className="flex items-center justify-between p-3 border rounded-lg bg-gray-50 dark:bg-gray-800"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Receipt preview */}
                    <div className="flex-shrink-0">
                      {receipt.fileType === 'application/pdf' ? (
                        <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center">
                          <FileText className="h-6 w-6 text-red-600 dark:text-red-400" />
                        </div>
                      ) : (
                        <img
                          src={receipt.url}
                          alt={receipt.fileName}
                          className="w-12 h-12 object-cover rounded-lg"
                        />
                      )}
                    </div>

                    {/* Receipt info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {getFileIcon(receipt.fileType)}
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {receipt.fileName}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatFileSize(receipt.fileSize)} • {receipt.uploadedAt.toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewReceipt(receipt)}
                      className="h-8 w-8 p-0"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownloadReceipt(receipt)}
                      className="h-8 w-8 p-0"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveReceipt(index)}
                      disabled={disabled}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload limits info */}
      {receipts.length >= maxReceipts && (
        <div className="text-sm text-gray-500 dark:text-gray-400 text-center p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
          Maximum number of receipts ({maxReceipts}) reached. Remove a receipt to upload more.
        </div>
      )}

      {/* Camera Capture Modal */}
      <ReceiptCameraCapture
        isOpen={showCamera}
        onClose={() => setShowCamera(false)}
        onCapture={handleCameraCapture}
        onError={(error) => {
          toast.error(`Camera error: ${error}`)
          setShowCamera(false)
        }}
      />
    </div>
  )
}

export default SimpleReceiptUpload