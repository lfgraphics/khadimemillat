'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Camera, X, RotateCcw, AlertCircle } from 'lucide-react'
import { FileUploadError } from './types'
import { 
  announceToScreenReader, 
  useFocusTrap, 
  generateId,
  getAriaAttributes,
  ACCESSIBILITY_MESSAGES,
  KEYBOARD_KEYS
} from './accessibility'

interface CameraCaptureProps {
  onCapture: (file: File) => void
  onError: (error: FileUploadError) => void
  onClose: () => void
  className?: string
}

export function CameraCapture({
  onCapture,
  onError,
  onClose,
  className = ''
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false)
  
  // Accessibility setup
  const focusTrapRef = useFocusTrap(true)
  const cameraId = useRef(generateId('camera')).current
  const videoId = useRef(generateId('camera-video')).current
  const statusId = useRef(generateId('camera-status')).current

  // Check for multiple cameras
  const checkCameraDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter(device => device.kind === 'videoinput')
      setHasMultipleCameras(videoDevices.length > 1)
    } catch (err) {
      // Silently fail - not critical for functionality
      console.warn('Could not enumerate camera devices:', err)
    }
  }, [])

  // Start camera with specified facing mode
  const startCamera = useCallback(async (preferredFacingMode: 'user' | 'environment' = 'environment') => {
    setIsLoading(true)
    setError(null)
    
    // Announce camera loading
    announceToScreenReader(ACCESSIBILITY_MESSAGES.COMPONENT_LOADING())

    try {
      // Stop existing stream if any
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: preferredFacingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      }

      const userStream = await navigator.mediaDevices.getUserMedia(constraints)
      setStream(userStream)
      
      if (videoRef.current) {
        videoRef.current.srcObject = userStream
      }
      
      setIsLoading(false)
      // Announce camera ready
      announceToScreenReader(ACCESSIBILITY_MESSAGES.CAMERA_OPENED())
    } catch (err: any) {
      setIsLoading(false)
      let errorMessage = 'Camera access denied or not available'
      let errorType: FileUploadError['type'] = 'camera'

      if (err.name === 'NotAllowedError') {
        errorMessage = 'Camera access denied. Please enable camera permissions and try again.'
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'No camera found on this device.'
      } else if (err.name === 'NotReadableError') {
        errorMessage = 'Camera is being used by another application.'
      } else if (err.name === 'OverconstrainedError') {
        errorMessage = 'Camera does not support the requested configuration.'
      } else if (err.name === 'SecurityError') {
        errorMessage = 'Camera access blocked due to security restrictions.'
      }

      setError(errorMessage)
      // Announce camera error
      announceToScreenReader(ACCESSIBILITY_MESSAGES.CAMERA_ERROR(errorMessage), 'assertive')
      
      onError({
        type: errorType,
        message: errorMessage,
        details: { originalError: err }
      })
    }
  }, [stream, onError])

  // Stop camera and cleanup
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
  }, [stream])

  // Switch between front and back camera
  const switchCamera = useCallback(() => {
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user'
    const cameraName = newFacingMode === 'user' ? 'front' : 'back'
    
    setFacingMode(newFacingMode)
    startCamera(newFacingMode)
    
    // Announce camera switch
    announceToScreenReader(ACCESSIBILITY_MESSAGES.CAMERA_SWITCHED(`${cameraName} camera`))
  }, [facingMode, startCamera])

  // Capture photo and convert to File
  const handleCapture = useCallback(() => {
    if (!videoRef.current || error) return

    const video = videoRef.current
    const canvas = document?.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      const errorMessage = 'Failed to create canvas context for image capture'
      announceToScreenReader(errorMessage, 'assertive')
      onError({
        type: 'camera',
        message: errorMessage,
        details: {}
      })
      return
    }

    // Draw the video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Convert canvas to blob and then to File
    canvas.toBlob((blob) => {
      if (!blob) {
        const errorMessage = 'Failed to capture image from camera'
        announceToScreenReader(errorMessage, 'assertive')
        onError({
          type: 'camera',
          message: errorMessage,
          details: {}
        })
        return
      }

      // Create a File object from the blob
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const filename = `camera-capture-${timestamp}.jpg`
      const file = new File([blob], filename, {
        type: 'image/jpeg',
        lastModified: Date.now()
      })

      // Announce successful capture
      announceToScreenReader(ACCESSIBILITY_MESSAGES.PHOTO_CAPTURED())

      // Call the onCapture callback with the File
      onCapture(file)
      
      // Close the camera
      handleClose()
    }, 'image/jpeg', 0.8) // 80% quality JPEG
  }, [error, onCapture, onError])

  // Handle close with cleanup
  const handleClose = useCallback(() => {
    stopCamera()
    // Announce camera closing
    announceToScreenReader(ACCESSIBILITY_MESSAGES.CAMERA_CLOSED())
    onClose()
  }, [stopCamera, onClose])

  // Handle escape key for camera close
  useEffect(() => {
    const handleEscape = (event: Event) => {
      if (event instanceof CustomEvent && event.type === 'file-selector-escape') {
        handleClose()
      }
    }

    document?.addEventListener('file-selector-escape', handleEscape)
    return () => {
      document?.removeEventListener('file-selector-escape', handleEscape)
    }
  }, [handleClose])

  // Initialize camera on mount
  useEffect(() => {
    checkCameraDevices()
    startCamera(facingMode)

    // Cleanup on unmount
    return () => {
      stopCamera()
    }
  }, []) // Only run on mount

  // Handle video load event
  const handleVideoLoad = useCallback(() => {
    setIsLoading(false)
  }, [])

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 ${className}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={cameraId}
      aria-describedby={statusId}
    >
      <div 
        ref={focusTrapRef}
        className="relative w-full max-w-md bg-card rounded-lg overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 id={cameraId} className="text-lg font-semibold flex items-center gap-2">
            <Camera className="h-5 w-5" aria-hidden="true" />
            Camera
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="h-8 w-8 p-0 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label="Close camera interface"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        {/* Camera View */}
        <div className="relative aspect-video bg-black">
          <div id={statusId} className="sr-only" aria-live="polite">
            {isLoading ? 'Camera is loading' : 
             error ? `Camera error: ${error}` : 
             'Camera is ready for photo capture'}
          </div>
          
          {error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
              <AlertCircle className="h-12 w-12 text-red-500 mb-4" aria-hidden="true" />
              <p className="text-red-600 mb-4">{error}</p>
              <Button
                variant="outline"
                onClick={() => startCamera(facingMode)}
                className="mb-2 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                aria-label="Retry camera access"
              >
                Try Again
              </Button>
              <Button
                variant="ghost"
                onClick={handleClose}
                size="sm"
                className="focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                aria-label="Cancel and close camera"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                id={videoId}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted
                onLoadedData={handleVideoLoad}
                aria-label="Camera preview for photo capture"
              />
              
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <div className="text-white text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2" aria-hidden="true"></div>
                    <p>Starting camera...</p>
                  </div>
                </div>
              )}

              {/* Camera Controls Overlay */}
              {!isLoading && !error && (
                <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-4" role="group" aria-label="Camera controls">
                  {/* Switch Camera Button */}
                  {hasMultipleCameras && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={switchCamera}
                      className="bg-black/50 hover:bg-black/70 text-white border-white/20 focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black"
                      aria-label={`Switch to ${facingMode === 'user' ? 'back' : 'front'} camera`}
                    >
                      <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  )}

                  {/* Capture Button */}
                  <Button
                    onClick={handleCapture}
                    size="lg"
                    className="bg-white hover:bg-gray-100 text-black rounded-full h-16 w-16 p-0 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-black"
                    aria-label="Capture photo"
                  >
                    <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center" aria-hidden="true">
                      <div className="w-8 h-8 bg-white rounded-full"></div>
                    </div>
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t">
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={handleClose}
              size="sm"
              className="focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label="Cancel photo capture and close camera"
            >
              Cancel
            </Button>
            
            <div className="text-xs text-muted-foreground text-center" aria-live="polite">
              {facingMode === 'environment' ? 'Back Camera' : 'Front Camera'}
            </div>
            
            <Button
              onClick={handleCapture}
              disabled={isLoading || !!error}
              size="sm"
              className="focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label="Capture photo from camera"
              {...getAriaAttributes({
                disabled: isLoading || !!error
              })}
            >
              Capture
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CameraCapture