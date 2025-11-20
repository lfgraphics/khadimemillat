'use client'

import React, { useState, useCallback } from 'react'
import { EnhancedFileSelector } from '@/components/file-selector'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Trash2, Download, Eye, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { UploadResult, FileUploadError } from '@/components/file-selector/types'
import { 
  uploadReceiptToCloudinary, 
  validateReceiptFile, 
  createReceiptValidationError,
  ReceiptUploadResult 
} from '@/components/file-selector/receipt-upload'
import { 
  showExpenseErrorToast, 
  showExpenseSuccessToast,
  ExpenseRetryManager,
  createExpenseErrorFromResponse
} from '@/lib/utils/expense-error-handling'

interface ReceiptFile {
  url: string
  publicId: string
  fileName: string
  fileSize: number
  uploadedAt: Date
}

interface ReceiptUploadProps {
  expenseId?: string // Optional for new expenses
  existingReceipts?: ReceiptFile[]
  onReceiptsChange: (receipts: ReceiptFile[]) => void
  disabled?: boolean
  maxReceipts?: number
  className?: string
}

export function ReceiptUpload({
  expenseId,
  existingReceipts = [],
  onReceiptsChange,
  disabled = false,
  maxReceipts = 5,
  className
}: ReceiptUploadProps) {
  const [receipts, setReceipts] = useState<ReceiptFile[]>(existingReceipts)
  const [isUploading, setIsUploading] = useState(false)
  const [retryManager] = useState(() => new ExpenseRetryManager())

  // Update parent component when receipts change
  const updateReceipts = useCallback((newReceipts: ReceiptFile[]) => {
    setReceipts(newReceipts)
    onReceiptsChange(newReceipts)
  }, [onReceiptsChange])

  // Handle upload error with enhanced feedback
  const handleUploadError = useCallback((error: FileUploadError, fileName?: string) => {
    console.error('Receipt upload error:', error)
    
    // Convert FileUploadError to ExpenseError
    const expenseError = new Error(error.message) as any
    expenseError.name = 'FileUploadError'
    expenseError.statusCode = 400
    expenseError.retryable = error.type === 'network' || error.type === 'upload'
    
    showExpenseErrorToast(expenseError, {
      onRetry: fileName ? () => {
        // Retry logic would need to be implemented based on context
        console.log('Retry upload for:', fileName)
      } : undefined,
      showDetails: true
    })
  }, [])

  // Handle successful file upload using receipt-specific upload
  const handleUploadComplete = useCallback(async (file: File) => {
    setIsUploading(true)
    
    try {
      await retryManager.executeWithRetry(async () => {
        // Validate receipt file first
        const validation = validateReceiptFile(file)
        if (!validation.isValid) {
          const error = createReceiptValidationError(validation.errors)
          throw error
        }

        // Upload using receipt-specific endpoint
        const uploadResult: ReceiptUploadResult = await uploadReceiptToCloudinary(file, {
          expenseId,
          onProgress: (progress) => {
            // Progress is handled by the toast notifications in the file selector
            console.log(`Upload progress: ${progress}%`)
          }
        })

        return uploadResult
      })

        const uploadResult = await retryManager.executeWithRetry(async () => {
          // Validate receipt file first
          const validation = validateReceiptFile(file)
          if (!validation.isValid) {
            const error = createReceiptValidationError(validation.errors)
            throw error
          }

          // Upload using receipt-specific endpoint
          return await uploadReceiptToCloudinary(file, {
            expenseId,
            onProgress: (progress) => {
              console.log(`Upload progress: ${progress}%`)
            }
          })
        })

        const newReceipt: ReceiptFile = {
          url: uploadResult.secureUrl,
          publicId: uploadResult.publicId,
          fileName: uploadResult.originalFilename || file.name,
          fileSize: file.size,
          uploadedAt: new Date()
        }

        const updatedReceipts = [...receipts, newReceipt]
        updateReceipts(updatedReceipts)

        // If we have an expense ID, associate with the expense
        if (expenseId) {
          try {
            await retryManager.executeWithRetry(async () => {
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
                const error = createExpenseErrorFromResponse(response)
                throw error
              }
            })

            showExpenseSuccessToast('upload', 'Receipt uploaded and associated with expense')
          } catch (error) {
            console.error('Error associating receipt with expense:', error)
            showExpenseErrorToast(error as Error, {
              onRetry: () => handleUploadComplete(file),
              showDetails: true
            })
            
            // Remove the receipt from local state since server association failed
            updateReceipts(receipts)
          }
        } else {
          showExpenseSuccessToast('upload', 'Receipt uploaded successfully')
        }
    } catch (error) {
      console.error('Receipt upload failed:', error)
      handleUploadError(error as FileUploadError, file.name)
    } finally {
      setIsUploading(false)
    }
  }, [receipts, updateReceipts, expenseId, handleUploadError])

  // Handle file selection and start upload process
  const handleFileSelect = useCallback(async (file: File) => {
    console.log('Receipt file selected:', file.name)
    // Start the upload process immediately
    await handleUploadComplete(file)
  }, [handleUploadComplete])

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
            <EnhancedFileSelector
              onFileSelect={handleFileSelect}
              onUploadComplete={() => {
                // Upload is handled in handleFileSelect, so this is just a placeholder
              }}
              onError={handleUploadError}
              maxFileSize={10 * 1024 * 1024} // 10MB
              acceptedTypes={['image/jpeg', 'image/png', 'image/webp', 'application/pdf']}
              placeholder={`Drop receipt files here or click to select (${remainingSlots} remaining)`}
              disabled={disabled || isUploading}
              uploadToCloudinary={false} // We handle upload manually
              className="w-full"
            />
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
                      {receipt.url.toLowerCase().includes('.pdf') ? (
                        <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center">
                          <span className="text-red-600 dark:text-red-400 text-xs font-semibold">PDF</span>
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
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {receipt.fileName}
                      </p>
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
    </div>
  )
}

export default ReceiptUpload