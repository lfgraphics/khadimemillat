"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PhoneInput } from "@/components/ui/phone-input";
import { cn, safeJson } from "@/lib/utils";
import { EnhancedFileSelector } from "@/components/file-selector";
import { FileUploadError, UploadResult } from "@/components/file-selector/types";
import { toast } from "sonner";

export interface CollectionRequestFormValues {
  address: string;
  phone: string;
  requestedPickupTime?: string;
  notes?: string;
  currentLocation?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  images?: Array<{
    url: string;
    publicId: string;
    width: number;
    height: number;
    format: string;
    bytes: number;
  }>;
}

interface CollectionRequestFormProps {
  defaultValues?: Partial<CollectionRequestFormValues>;
  onSuccess?: (data: any) => void;
  className?: string;
  submitLabel?: string;
  donorId?: string; // Optional explicit donor; if omitted backend infers from session
  showFileUpload?: boolean; // Whether to show the file upload component
}

export const CollectionRequestForm: React.FC<CollectionRequestFormProps> = ({
  defaultValues,
  onSuccess,
  className,
  submitLabel = "Submit Request",
  donorId,
  showFileUpload = true,
}) => {
  const [form, setForm] = useState<CollectionRequestFormValues>({
    address: defaultValues?.address || "",
    phone: defaultValues?.phone || "",
    requestedPickupTime: defaultValues?.requestedPickupTime,
    notes: defaultValues?.notes || "",
    currentLocation: defaultValues?.currentLocation,
    images: defaultValues?.images || [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  // File upload states
  const [uploadedImages, setUploadedImages] = useState<UploadResult[]>(
    defaultValues?.images?.map(img => ({
      publicId: img.publicId,
      url: img.url,
      secureUrl: img.url,
      width: img.width,
      height: img.height,
      format: img.format,
      bytes: img.bytes
    })) || []
  );
  const [fileUploadError, setFileUploadError] = useState<string | null>(null);

  const updateField = <K extends keyof CollectionRequestFormValues>(key: K, value: CollectionRequestFormValues[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  // File upload handlers
  const handleFileSelect = (file: File, previewUrl: string) => {
    setFileUploadError(null);
  };

  const handleUploadComplete = (uploadResult: UploadResult) => {
    setUploadedImages(prev => [...prev, uploadResult]);
    toast.success(`Image uploaded successfully`);
  };

  const handleUploadError = (error: FileUploadError) => {
    console.error('Upload error:', error);
    setFileUploadError(error.message);
    toast.error(`Upload failed: ${error.message}`);
  };

  const removeUploadedImage = (publicId: string) => {
    setUploadedImages(prev => prev.filter(img => img.publicId !== publicId));
    toast.success('Image removed');
  };

  // Get current location
  const getCurrentLocation = () => {
    setLocationLoading(true);
    
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by this browser');
      setLocationLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        };
        updateField('currentLocation', location);
        toast.success('Location captured successfully');
        setLocationLoading(false);
      },
      (error) => {
        console.error('Location error:', error);
        let message = 'Failed to get location';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Location access denied. Please enable location permissions.';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            message = 'Location request timed out.';
            break;
        }
        toast.error(message);
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      if (!form.address.trim() || !form.phone.trim()) {
        setError("Address and phone are required.");
        setLoading(false);
        return;
      }
      const payload: any = {
        ...form,
        // Include uploaded image URLs and metadata
        images: uploadedImages.map(img => ({
          url: img.secureUrl,
          publicId: img.publicId,
          width: img.width,
          height: img.height,
          format: img.format,
          bytes: img.bytes
        }))
      };
      if (donorId) payload.donor = donorId;
      const res = await fetch("/api/protected/collection-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Failed to submit");
      }
      const data = await safeJson<any>(res);
      setSuccess(true);
      if (onSuccess) onSuccess(data?.data || data);
      setForm(prev => ({ ...prev, notes: "", images: [] }));
      setUploadedImages([]);
    } catch (e: any) {
      setError(e.message || "Submission failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className={cn("space-y-4", className)}>
      <div className="space-y-1">
        <label className="block text-sm font-medium">Address<span className="text-red-500">*</span></label>
        <input
          type="text"
          className="w-full border rounded-md px-3 py-2 text-sm"
          value={form.address}
          onChange={(e) => updateField("address", e.target.value)}
          placeholder="Pickup address"
          required
        />
      </div>
      <div className="space-y-1">
        <label className="block text-sm font-medium">Phone<span className="text-red-500">*</span></label>
        <PhoneInput
          value={form.phone}
          onChange={(value) => updateField("phone", value)}
          placeholder="Contact number"
          required
          className="text-sm"
        />
      </div>
      
      {/* Current Location */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">Current Location (helps field executive navigate)</label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={getCurrentLocation}
            disabled={locationLoading}
            className="whitespace-nowrap"
          >
            {locationLoading ? 'Getting Location...' : 'Get Current Location'}
          </Button>
          {form.currentLocation && (
            <div className="flex-1 text-sm text-muted-foreground flex items-center">
              📍 Location captured (accuracy: {form.currentLocation.accuracy ? Math.round(form.currentLocation.accuracy) + 'm' : 'unknown'})
            </div>
          )}
        </div>
        {form.currentLocation && (
          <div className="text-xs text-muted-foreground">
            Lat: {form.currentLocation.latitude.toFixed(6)}, Lng: {form.currentLocation.longitude.toFixed(6)}
          </div>
        )}
      </div>
      <div className="space-y-1">
        <label className="block text-sm font-medium">Requested Pickup Time</label>
        <input
          type="datetime-local"
          className="w-full border rounded-md px-3 py-2 text-sm"
          value={form.requestedPickupTime || ""}
          onChange={(e) => updateField("requestedPickupTime", e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <label className="block text-sm font-medium">Notes</label>
        <Textarea
          value={form.notes}
          onChange={(e) => updateField("notes", e.target.value)}
          placeholder="Describe the scrap items, access instructions, etc."
          rows={5}
        />
      </div>

      {/* Enhanced File Selector for Item Images */}
      {showFileUpload && (
        <div className="space-y-1">
          <label className="block text-sm font-medium">Item Images (Optional)</label>
          <p className="text-xs text-muted-foreground mb-2">
            Upload photos of the items you want to donate. This helps our team prepare for collection.
          </p>
          <EnhancedFileSelector
            onFileSelect={handleFileSelect}
            onUploadComplete={handleUploadComplete}
            onError={handleUploadError}
            maxFileSize={10 * 1024 * 1024} // 10MB
            acceptedTypes={['image/jpeg', 'image/png', 'image/webp']}
            placeholder="Drag and drop item photos here or click to select"
            showPreview={true}
            uploadToCloudinary={true}
            cloudinaryOptions={{
              folder: 'kmwf/collection-requests',
              tags: ['collection-request', 'donation-items']
            }}
            className="rounded-lg"
          />

          {/* Display uploaded images */}
          {uploadedImages.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold mb-2">Uploaded Images ({uploadedImages.length})</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {uploadedImages.map((image, index) => (
                  <div key={image.publicId} className="relative group">
                    <img
                      src={image.url}
                      alt={`Uploaded item ${index + 1}`}
                      className="w-full h-24 object-cover rounded-md border"
                    />
                    <button
                      type="button"
                      onClick={() => removeUploadedImage(image.publicId)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hoact:opacity-100 transition-opacity"
                      title="Remove image"
                    >
                      ×
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 rounded-b-md">
                      {(image.bytes / 1024).toFixed(1)}KB
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* File upload error display */}
          {fileUploadError && (
            <div className="text-xs text-red-600 mt-2">
              Upload Error: {fileUploadError}
            </div>
          )}
        </div>
      )}
      {error && <div className="text-xs text-red-600">{error}</div>}
      {success && <div className="text-xs text-green-600">Request submitted.</div>}
      <div className="pt-2">
        <Button type="submit" disabled={loading} className="w-full md:w-auto">
          {loading ? "Submitting..." : submitLabel}
        </Button>
      </div>
    </form>
  );
};

export default CollectionRequestForm;
