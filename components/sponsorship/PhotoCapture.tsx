"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Camera,
  Upload,
  X,
  Eye,
  Download,
  RotateCcw,
  Trash2,
  ImageIcon,
  AlertCircle
} from "lucide-react";
import Image from "next/image";

export interface CapturedPhoto {
  id: string;
  file: File;
  url: string;
  category: 'identity' | 'housing' | 'documentation' | 'family' | 'other';
  description?: string;
  timestamp: Date;
  publicId?: string; // Added after upload to Cloudinary
}

interface PhotoCaptureProps {
  category: 'identity' | 'housing' | 'documentation' | 'family' | 'other';
  maxPhotos?: number;
  onPhotosChange: (photos: CapturedPhoto[]) => void;
  existingPhotos?: CapturedPhoto[];
  disabled?: boolean;
  required?: boolean;
}

const categoryLabels = {
  identity: 'Identity Documents',
  housing: 'Housing Conditions',
  documentation: 'Supporting Documents',
  family: 'Family Photos',
  other: 'Other Evidence'
};

const categoryDescriptions = {
  identity: 'Aadhaar card, passport, or other ID documents',
  housing: 'Photos of house exterior, interior, and living conditions',
  documentation: 'Income certificates, medical reports, etc.',
  family: 'Family members and household composition',
  other: 'Any other relevant evidence or documentation'
};

export default function PhotoCapture({
  category,
  maxPhotos = 10,
  onPhotosChange,
  existingPhotos = [],
  disabled = false,
  required = false
}: PhotoCaptureProps) {
  const [photos, setPhotos] = useState<CapturedPhoto[]>(existingPhotos);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewPhoto, setPreviewPhoto] = useState<CapturedPhoto | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Start camera
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        setIsCameraActive(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast.error('Unable to access camera. Please check permissions.');
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
  };

  // Capture photo from camera
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to blob
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `${category}-${Date.now()}.jpg`, {
          type: 'image/jpeg'
        });

        addPhoto(file);
        stopCamera();
      }
    }, 'image/jpeg', 0.8);
  };

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);

    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        addPhoto(file);
      } else {
        toast.error(`${file.name} is not a valid image file`);
      }
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Add photo to collection
  const addPhoto = (file: File) => {
    if (photos.length >= maxPhotos) {
      toast.error(`Maximum ${maxPhotos} photos allowed for ${categoryLabels[category]}`);
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Photo size must be less than 5MB');
      return;
    }

    const newPhoto: CapturedPhoto = {
      id: `${category}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      url: URL.createObjectURL(file),
      category,
      timestamp: new Date()
    };

    const updatedPhotos = [...photos, newPhoto];
    setPhotos(updatedPhotos);
    onPhotosChange(updatedPhotos);
  };

  // Remove photo
  const removePhoto = (photoId: string) => {
    const photoToRemove = photos.find(p => p.id === photoId);
    if (photoToRemove) {
      URL.revokeObjectURL(photoToRemove.url);
    }

    const updatedPhotos = photos.filter(p => p.id !== photoId);
    setPhotos(updatedPhotos);
    onPhotosChange(updatedPhotos);

    toast.success('Photo removed');
  };

  // Upload photos to server
  const uploadPhotos = async () => {
    if (photos.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const uploadPromises = photos.map(async (photo, index) => {
        const formData = new FormData();
        formData.append('file', photo.file);
        formData.append('folder', `kmwf/${photo.category}`);

        const response = await fetch('/api/upload/cloudinary', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(`Upload failed for photo ${index + 1}: ${errorData.error || response.statusText}`);
        }

        const result = await response.json();

        // Update progress
        setUploadProgress(((index + 1) / photos.length) * 100);

        return {
          ...photo,
          url: result.secure_url || result.url,
          publicId: result.public_id
        };
      });

      const uploadedPhotos = await Promise.all(uploadPromises);

      // Update photos with server URLs
      setPhotos(uploadedPhotos);
      onPhotosChange(uploadedPhotos);

      toast.success('All photos uploaded successfully');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload some photos. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Download photo
  const downloadPhoto = (photo: CapturedPhoto) => {
    const link = document.createElement('a');
    link.href = photo.url;
    link.download = `${photo.category}-${photo.timestamp.toISOString().split('T')[0]}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                {categoryLabels[category]}
                {required && <span className="text-red-500">*</span>}
              </h3>
              <p className="text-sm text-muted-foreground">
                {categoryDescriptions[category]}
              </p>
            </div>
            <Badge variant="outline">
              {photos.length} / {maxPhotos}
            </Badge>
          </div>

          {/* Camera View */}
          {isCameraActive && (
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full max-w-md mx-auto rounded-lg"
              />
              <canvas ref={canvasRef} className="hidden" />

              <div className="flex justify-center gap-2 mt-4">
                <Button type="button" onClick={capturePhoto} size="lg">
                  <Camera className="w-5 h-5 mr-2" />
                  Capture
                </Button>
                <Button type="button" variant="outline" onClick={stopCamera}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {!isCameraActive && (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={startCamera}
                disabled={disabled || photos.length >= maxPhotos}
                variant="outline"
              >
                <Camera className="w-4 h-4 mr-2" />
                Take Photo
              </Button>

              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || photos.length >= maxPhotos}
                variant="outline"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Photo
              </Button>

              {photos.length > 0 && (
                <Button
                  type="button"
                  onClick={uploadPhotos}
                  disabled={isUploading}
                  className="ml-auto"
                >
                  {isUploading ? (
                    <>
                      <RotateCcw className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload All
                    </>
                  )}
                </Button>
              )}
            </div>
          )}

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading photos...</span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <Progress value={uploadProgress} />
            </div>
          )}

          {/* Photo Grid */}
          {photos.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {photos.map((photo) => (
                <div key={photo.id} className="relative group">
                  <div className="aspect-square relative overflow-hidden rounded-lg border">
                    <Image
                      src={photo.url}
                      alt={`${category} photo`}
                      fill
                      className="object-cover"
                    />

                    {/* Overlay with actions */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => setPreviewPhoto(photo)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => downloadPhoto(photo)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => removePhoto(photo.id)}
                        disabled={disabled}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {photo.timestamp.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {photos.length === 0 && (
            <div className="text-center py-8 border-2 border-dashed border-muted-foreground/25 rounded-lg">
              <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground mb-2">No photos added yet</p>
              <p className="text-sm text-muted-foreground">
                Take photos or upload from your device
              </p>
            </div>
          )}

          {/* Requirements Notice */}
          {required && photos.length === 0 && (
            <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-orange-600" />
              <span className="text-sm text-orange-800">
                At least one photo is required for {categoryLabels[category].toLowerCase()}
              </span>
            </div>
          )}

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Photo Preview Modal */}
        {previewPhoto && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <div className="relative max-w-4xl max-h-full">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="absolute top-4 right-4 z-10"
                onClick={() => setPreviewPhoto(null)}
              >
                <X className="w-4 h-4" />
              </Button>

              <Image
                src={previewPhoto.url}
                alt="Photo preview"
                width={800}
                height={600}
                className="max-w-full max-h-full object-contain rounded-lg"
              />

              <div className="absolute bottom-4 left-4 bg-black/70 text-white p-2 rounded">
                <p className="text-sm">
                  {categoryLabels[previewPhoto.category]} - {previewPhoto.timestamp.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}