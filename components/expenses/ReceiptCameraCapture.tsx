'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Camera, X, RotateCcw, Check, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface ReceiptCameraCaptureProps {
  isOpen: boolean
  onClose: () => void
  onCapture: (file: File) => void
  onError?: (error: string) => void
}

export function ReceiptCameraCapture({
  isOpen,
  onClose,
  onCapture,
  onError
}: ReceiptCameraCaptureProps) {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Initialize camera when dialog opens
  useEffect(() => {
    if (isOpen) {
      initializeCamera()
    } else {
      cleanup()
    }

    return cleanup
  }, [isOpen, facingMode])

  // Initialize camera stream
  const initializeCamera = useCallback(async () => {
    try {
      setError(null)
      
      // Stop existing stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }

      // Request camera access with high resolution for receipt capture
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          aspectRatio: { ideal: 16/9 }
        },
        audio: false
      })

      setStream(mediaStream)

      // Attach stream to video element
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        videoRef.current.play()
      }
    } catch (err) {
      console.error('Camera initialization error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to access camera'
      setError(errorMessage)
      onError?.(errorMessage)
      toast.error('Failed to access camera. Please check permissions.')
    }
  }, [stream, facingMode, onError])

  // Cleanup camera resources
  const cleanup = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    setCapturedImage(null)
    setError(null)
  }, [stream])

  // Capture photo
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return

    setIsCapturing(true)

    try {
      const video = videoRef.current
      const canvas = canvasRef.current
      const context = canvas.getContext('2d')

      if (!context) {
        throw new Error('Failed to get canvas context')
      }

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      // Draw video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height)

      // Convert to data URL
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
      setCapturedImage(dataUrl)

      toast.success('Photo captured! Review and confirm to save.')
    } catch (err) {
      console.error('Photo capture error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to capture photo'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsCapturing(false)
    }
  }, [])

  // Confirm captured photo
  const confirmCapture = useCallback(() => {
    if (!capturedImage) return

    try {
      // Convert data URL to File
      const byteString = atob(capturedImage.split(',')[1])
      const mimeString = capturedImage.split(',')[0].split(':')[1].split(';')[0]
      const ab = new ArrayBuffer(byteString.length)
      const ia = new Uint8Array(ab)
      
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i)
      }

      const blob = new Blob([ab], { type: mimeString })
      const file = new File([blob], `receipt-${Date.now()}.jpg`, { type: 'image/jpeg' })

      onCapture(file)
      onClose()
      toast.success('Receipt photo saved successfully!')
    } catch (err) {
      console.error('File conversion error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to process captured photo'
      setError(errorMessage)
      toast.error(errorMessage)
    }
  }, [capturedImage, onCapture, onClose])

  // Retake photo
  const retakePhoto = useCallback(() => {
    setCapturedImage(null)
    setError(null)
  }, [])

  // Switch camera (front/back)
  const switchCamera = useCallback(() => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user')
  }, [])

  // Handle dialog close
  const handleClose = useCallback(() => {
    cleanup()
    onClose()
  }, [cleanup, onClose])

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Capture Receipt Photo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {/* Camera View */}
          <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
            {!capturedImage ? (
              <>
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                />
                
                {/* Camera overlay for receipt guidance */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-4 border-2 border-white/50 border-dashed rounded-lg flex items-center justify-center">
                    <div className="text-white/75 text-center">
                      <p className="text-sm font-medium">Position receipt within frame</p>
                      <p className="text-xs mt-1">Ensure good lighting and all text is visible</p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <img
                src={capturedImage}
                alt="Captured receipt"
                className="w-full h-full object-cover"
              />
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            {!capturedImage ? (
              <>
                {/* Switch Camera */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={switchCamera}
                  disabled={!stream}
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  Switch
                </Button>

                {/* Capture Button */}
                <Button
                  onClick={capturePhoto}
                  disabled={!stream || isCapturing}
                  size="lg"
                  className="flex items-center gap-2 px-8"
                >
                  <Camera className="h-5 w-5" />
                  {isCapturing ? 'Capturing...' : 'Capture'}
                </Button>

                {/* Cancel Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClose}
                  className="flex items-center gap-2"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
              </>
            ) : (
              <>
                {/* Retake Button */}
                <Button
                  variant="outline"
                  onClick={retakePhoto}
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  Retake
                </Button>

                {/* Confirm Button */}
                <Button
                  onClick={confirmCapture}
                  className="flex items-center gap-2 px-8"
                >
                  <Check className="h-5 w-5" />
                  Use Photo
                </Button>

                {/* Cancel Button */}
                <Button
                  variant="outline"
                  onClick={handleClose}
                  className="flex items-center gap-2"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
              </>
            )}
          </div>

          {/* Tips */}
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center space-y-1">
            <p>💡 Tips for best results:</p>
            <p>• Ensure good lighting and avoid shadows</p>
            <p>• Keep the receipt flat and all text visible</p>
            <p>• Use the back camera for better quality</p>
          </div>
        </div>

        {/* Hidden canvas for photo capture */}
        <canvas ref={canvasRef} className="hidden" />
      </DialogContent>
    </Dialog>
  )
}

export default ReceiptCameraCapture