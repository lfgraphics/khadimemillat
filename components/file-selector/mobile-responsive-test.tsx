'use client'

import React, { useState } from 'react'
import { EnhancedFileSelector } from './index'
import { UploadResult, FileUploadError } from './types'

export function MobileResponsiveTest() {
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleFileSelect = (file: File, previewUrl: string) => {
    console.log('File selected:', file.name, file.size)
    setIsLoading(true)
    setError(null)
    setUploadResult(null)
  }

  const handleUploadComplete = (result: UploadResult) => {
    console.log('Upload completed:', result)
    setUploadResult(result)
    setIsLoading(false)
  }

  const handleError = (error: FileUploadError) => {
    console.error('Upload error:', error)
    setError(error.message)
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile-first container */}
      <div className="w-full max-w-full px-3 sm:px-4 md:px-6 lg:max-w-4xl lg:mx-auto py-4 sm:py-6">
        
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Mobile-First File Selector
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            Optimized for screens as small as 300px wide
          </p>
        </div>

        {/* File Selector - Mobile Optimized */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3 sm:p-4 md:p-6 mb-4 sm:mb-6">
          <EnhancedFileSelector
            onFileSelect={handleFileSelect}
            onUploadComplete={handleUploadComplete}
            onError={handleError}
            uploadToCloudinary={true}
            cloudinaryOptions={{
              folder: 'kmwf/mobile-test',
              tags: ['mobile', 'responsive', 'test'],
              maxRetries: 2
            }}
            maxFileSize={5 * 1024 * 1024} // 5MB
            placeholder="Mobile-optimized file upload"
            className="w-full"
          />
        </div>

        {/* Status Display - Mobile Optimized */}
        {isLoading && (
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 sm:p-4 mb-4">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <p className="text-sm sm:text-base text-blue-800 dark:text-blue-200">Uploading...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3 sm:p-4 mb-4">
            <h3 className="font-semibold text-sm sm:text-base text-red-800 dark:text-red-200 mb-1">Upload Error:</h3>
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {uploadResult && (
          <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-3 sm:p-4 mb-4">
            <h3 className="font-semibold text-sm sm:text-base text-green-800 dark:text-green-200 mb-2">Upload Successful!</h3>
            <div className="space-y-1 text-xs sm:text-sm">
              <p className="break-all"><strong>Public ID:</strong> {uploadResult.publicId}</p>
              <p className="break-all"><strong>URL:</strong> <a href={uploadResult.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{uploadResult.url}</a></p>
              <p><strong>Dimensions:</strong> {uploadResult.width} x {uploadResult.height}</p>
              <p><strong>Format:</strong> {uploadResult.format}</p>
              <p><strong>Size:</strong> {(uploadResult.bytes / 1024).toFixed(2)} KB</p>
            </div>
            
            {uploadResult.secureUrl && (
              <div className="mt-3">
                <img 
                  src={uploadResult.secureUrl} 
                  alt="Uploaded image" 
                  className="w-full max-w-xs h-auto rounded-md shadow-sm border"
                />
              </div>
            )}
          </div>
        )}

        {/* Mobile Testing Info */}
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 sm:p-4">
          <h3 className="font-semibold text-sm sm:text-base text-gray-800 dark:text-gray-200 mb-2">Mobile Testing Guide:</h3>
          <ul className="text-xs sm:text-sm space-y-1 text-gray-700 dark:text-gray-300">
            <li>• Test on screens as narrow as 300px</li>
            <li>• Verify touch targets are at least 44px</li>
            <li>• Check text readability at small sizes</li>
            <li>• Ensure no horizontal scrolling</li>
            <li>• Test drag and drop on touch devices</li>
            <li>• Verify modal dialogs fit on screen</li>
            <li>• Test camera functionality on mobile</li>
          </ul>
        </div>

        {/* Viewport Info for Testing */}
        <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
          <p>Current breakpoint: <span className="sm:hidden">XS (&lt;640px)</span><span className="hidden sm:inline md:hidden">SM (640px+)</span><span className="hidden md:inline lg:hidden">MD (768px+)</span><span className="hidden lg:inline xl:hidden">LG (1024px+)</span><span className="hidden xl:inline">XL (1280px+)</span></p>
        </div>
      </div>
    </div>
  )
}

export default MobileResponsiveTest