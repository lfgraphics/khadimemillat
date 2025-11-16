"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Camera, 
  Upload, 
  X, 
  User, 
  FileText, 
  CreditCard,
  AlertCircle,
  CheckCircle,
  RotateCcw,
  SwitchCamera
} from "lucide-react";

import { SurveyPhoto, FamilyMember } from "@/types/survey";

interface FamilyPhotoCaptureProps {
  familyMembers: FamilyMember[];
  photos: SurveyPhoto[];
  onPhotosChange: (photos: SurveyPhoto[]) => void;
}

export function FamilyPhotoCapture({ familyMembers, photos, onPhotosChange }: FamilyPhotoCaptureProps) {
  const [activeTab, setActiveTab] = useState("overview");

  const photosRef = useRef<SurveyPhoto[]>(photos);
  
  // Camera states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [currentCameraContext, setCurrentCameraContext] = useState<{
    category: SurveyPhoto['category'];
    memberIndex?: number;
    documentType?: string;
  } | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);



  // Keep ref in sync with props
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  // Only run cleanup on component mount to handle stuck photos from previous sessions
  useEffect(() => {
    const stuckPhotos = photos.filter(photo => 
      photo.uploading && photo.url.startsWith('blob:')
    );
    
    if (stuckPhotos.length > 0) {
      console.log('Found stuck uploading photos from previous session, cleaning up:', stuckPhotos.length);
      const cleanedPhotos = photos.filter(photo => !photo.uploading || !photo.url.startsWith('blob:'));
      if (cleanedPhotos.length !== photos.length) {
        onPhotosChange(cleanedPhotos);
      }
    }
  }, []); // Only run on mount

  const handleFileUpload = async (
    files: FileList | null, 
    category: SurveyPhoto['category'], 
    memberIndex?: number,
    documentType?: string
  ) => {
    if (!files) return;

    const fileArray = Array.from(files).filter(file => file.type.startsWith('image/'));
    if (fileArray.length === 0) return;

    // Process files sequentially to avoid state conflicts
    for (const file of fileArray) {
      await uploadSinglePhoto(file, category, memberIndex, documentType);
    }
  };

  const uploadSinglePhoto = async (
    file: File,
    category: SurveyPhoto['category'],
    memberIndex?: number,
    documentType?: string
  ) => {
    const photoId = `temp-${Date.now()}-${Math.random().toString(36).substring(2)}`;
    
    // Create temporary photo with loading state
    const tempPhoto: SurveyPhoto = {
      id: photoId,
      file,
      url: URL.createObjectURL(file),
      category,
      memberIndex,
      documentType,
      description: `${category} for ${memberIndex !== undefined ? familyMembers[memberIndex]?.name : 'family'}`,
      timestamp: new Date(),
      uploading: true
    };

    try {
      // Add temporary photo to show upload progress
      const newPhotos = [...photosRef.current, tempPhoto];
      photosRef.current = newPhotos;
      onPhotosChange(newPhotos);
      
      const formData = new FormData();
      formData.append('photo', file);
      formData.append('category', category);
      if (memberIndex !== undefined) formData.append('memberIndex', memberIndex.toString());
      if (documentType) formData.append('documentType', documentType);
      
      // Get surveyId from window or props (we'll need to pass this)
      const surveyId = (window as any).currentSurveyId || 'temp-survey';
      formData.append('surveyId', surveyId);
      
      const response = await fetch('/api/sponsorship/upload-photos', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Upload failed with response:', errorText);
        throw new Error(`Upload failed: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success && result.photo) {
        // Clean up blob URL before updating
        const oldPhoto = photosRef.current.find(p => p.id === photoId);
        if (oldPhoto && oldPhoto.url.startsWith('blob:')) {
          URL.revokeObjectURL(oldPhoto.url);
        }
        
        // Update the photo with uploaded data
        const updatedPhoto = {
          id: result.photo.id || photoId,
          url: result.photo.url, // Use Cloudinary URL
          publicId: result.photo.publicId,
          category,
          memberIndex,
          documentType,
          description: tempPhoto.description,
          timestamp: new Date(),
          uploading: false,
          file: undefined // Remove file reference
        };
        
        const updatedPhotos = photosRef.current.map((p: SurveyPhoto) => 
          p.id === photoId ? updatedPhoto : p
        );
        
        photosRef.current = updatedPhotos;
        onPhotosChange(updatedPhotos);
        
        // Show success message
        if (typeof window !== 'undefined' && (window as any).toast) {
          (window as any).toast.success('Photo uploaded successfully');
        }
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Photo upload error:', error);
      
      // Remove temporary photo on error
      const filteredPhotos = photosRef.current.filter((p: SurveyPhoto) => p.id !== photoId);
      photosRef.current = filteredPhotos;
      onPhotosChange(filteredPhotos);
      
      // Show error message
      if (typeof window !== 'undefined' && (window as any).toast) {
        (window as any).toast.error('Failed to upload photo. Please try again.');
      }
    }
  };

  // Camera functions
  const startCamera = async (category: SurveyPhoto['category'], memberIndex?: number, documentType?: string) => {
    try {
      // First set the camera as active to show the overlay
      setIsCameraActive(true);
      setCurrentCameraContext({ category, memberIndex, documentType });
      
      // Then request camera permissions
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      // Wait a bit for the video element to be available in the portal
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          setStream(mediaStream);
        }
      }, 100);
      
    } catch (error) {
      console.error('Error accessing camera:', error);
      setIsCameraActive(false);
      setCurrentCameraContext(null);
      
      if (typeof window !== 'undefined' && (window as any).toast) {
        (window as any).toast.error('Unable to access camera. Please check permissions.');
      }
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
    setCurrentCameraContext(null);
  };

  const switchCamera = async () => {
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacingMode);
    
    if (isCameraActive && currentCameraContext) {
      stopCamera();
      setTimeout(() => {
        startCamera(currentCameraContext.category, currentCameraContext.memberIndex, currentCameraContext.documentType);
      }, 100);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current || !currentCameraContext) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to blob and create file
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
        
        // Create file list and trigger upload
        const dt = new DataTransfer();
        dt.items.add(file);
        const fileList = dt.files;
        
        handleFileUpload(
          fileList, 
          currentCameraContext.category, 
          currentCameraContext.memberIndex, 
          currentCameraContext.documentType
        );
        
        stopCamera();
      }
    }, 'image/jpeg', 0.8);
  };

  const removePhoto = async (photoId: string) => {
    const photoToRemove = photos.find(p => p.id === photoId);
    if (!photoToRemove) return;

    try {
      // If it's a blob URL (not yet uploaded), just clean up locally
      if (photoToRemove.url.startsWith('blob:')) {
        URL.revokeObjectURL(photoToRemove.url);
        const updatedPhotos = photos.filter(photo => photo.id !== photoId);
        onPhotosChange(updatedPhotos);
        return;
      }

      // If it has a publicId (uploaded to Cloudinary), delete from cloud
      if (photoToRemove.publicId) {
        const response = await fetch(`/api/sponsorship/delete-photo?publicId=${encodeURIComponent(photoToRemove.publicId)}`, {
          method: 'DELETE'
        });

        if (!response.ok) {
          throw new Error('Failed to delete photo from cloud storage');
        }

        const result = await response.json();
        console.log('Photo deleted from Cloudinary:', result);

        if (typeof window !== 'undefined' && (window as any).toast) {
          (window as any).toast.success('Photo deleted successfully');
        }
      }

      // Remove from local state
      const updatedPhotos = photos.filter(photo => photo.id !== photoId);
      onPhotosChange(updatedPhotos);

    } catch (error) {
      console.error('Error removing photo:', error);
      if (typeof window !== 'undefined' && (window as any).toast) {
        (window as any).toast.error('Failed to delete photo. Please try again.');
      }
    }
  };

  const cleanupStuckPhotos = () => {
    const stuckPhotos = photos.filter(photo => 
      photo.uploading && photo.url.startsWith('blob:')
    );
    
    if (stuckPhotos.length > 0) {
      // Clean up blob URLs
      stuckPhotos.forEach(photo => {
        if (photo.url.startsWith('blob:')) {
          URL.revokeObjectURL(photo.url);
        }
      });
      
      // Remove stuck photos
      const cleanedPhotos = photos.filter(photo => 
        !(photo.uploading && photo.url.startsWith('blob:'))
      );
      onPhotosChange(cleanedPhotos);
      
      if (typeof window !== 'undefined' && (window as any).toast) {
        (window as any).toast.success(`Cleaned up ${stuckPhotos.length} stuck photo(s)`);
      }
    }
  };

  const getPhotosForMember = (memberIndex: number, category?: SurveyPhoto['category']) => {
    return photos.filter(photo => 
      photo.memberIndex === memberIndex && 
      (category ? photo.category === category : true)
    );
  };

  const getRequiredDocuments = (member: FamilyMember, memberIndex: number) => {
    const required: Array<{type: string; label: string; uploaded: boolean}> = [];
    
    // Member photo is always required
    required.push({
      type: 'member_photo',
      label: 'Member Photo',
      uploaded: getPhotosForMember(memberIndex, 'member_photo').length > 0
    });

    // Certificates if marked as having them
    if (member.certificates) {
      required.push({
        type: 'certificate',
        label: 'Certificates',
        uploaded: getPhotosForMember(memberIndex, 'certificate').length > 0
      });
    }

    // Identity documents if they need correction or are new
    if (member.identityDocuments?.aadhaar?.needsCorrection || member.identityDocuments?.aadhaar?.needsNew) {
      required.push({
        type: 'aadhaar',
        label: 'Aadhaar Document',
        uploaded: photos.some(p => p.memberIndex === memberIndex && p.documentType === 'aadhaar')
      });
    }

    if (member.identityDocuments?.voterId?.needsCorrection || member.identityDocuments?.voterId?.needsNew) {
      required.push({
        type: 'voterId',
        label: 'Voter ID Document',
        uploaded: photos.some(p => p.memberIndex === memberIndex && p.documentType === 'voterId')
      });
    }

    return required;
  };

  const getOverallProgress = () => {
    let totalRequired = 0;
    let totalUploaded = 0;

    familyMembers.forEach((member, index) => {
      const required = getRequiredDocuments(member, index);
      totalRequired += required.length;
      totalUploaded += required.filter(r => r.uploaded).length;
    });

    return { totalRequired, totalUploaded };
  };

  const { totalRequired, totalUploaded } = getOverallProgress();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Family Photos & Documents
          </CardTitle>
          <div className="flex gap-2 flex-wrap">
            <Badge variant={totalUploaded === totalRequired ? "default" : "secondary"}>
              {totalUploaded}/{totalRequired} uploaded
            </Badge>
            {photos.some(p => p.uploading) && (
              <Badge variant="outline" className="text-blue-600 border-blue-600">
                {photos.filter(p => p.uploading).length} uploading...
              </Badge>
            )}
            {photos.some(p => p.url.startsWith('blob:')) && (
              <Badge variant="outline" className="text-orange-600 border-orange-600">
                {photos.filter(p => p.url.startsWith('blob:')).length} pending
              </Badge>
            )}
            {photos.some(p => p.uploading && p.url.startsWith('blob:')) && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={cleanupStuckPhotos}
                className="text-xs"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Fix Stuck
              </Button>
            )}

          </div>
        </div>
        {totalRequired > 0 && (
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(totalUploaded / totalRequired) * 100}%` }}
            ></div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="family">Family</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {familyMembers.map((member, index) => {
                const required = getRequiredDocuments(member, index);
                const uploaded = required.filter(r => r.uploaded).length;
                
                return (
                  <Card key={index} className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span className="font-medium">{member.name}</span>
                      </div>
                      <Badge variant={uploaded === required.length ? "default" : "secondary"}>
                        {uploaded}/{required.length}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      {required.map((req, reqIndex) => (
                        <div key={reqIndex} className="flex items-center justify-between text-sm">
                          <span>{req.label}</span>
                          {req.uploaded ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-red-600" />
                          )}
                        </div>
                      ))}
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full mt-3"
                      onClick={() => setActiveTab("members")}
                    >
                      Upload Photos
                    </Button>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="members" className="space-y-6">
            {familyMembers.map((member, memberIndex) => {
              const memberPhotos = getPhotosForMember(memberIndex);
              const required = getRequiredDocuments(member, memberIndex);
              
              return (
                <Card key={memberIndex} className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium flex items-center gap-2">
                      <User className="w-4 h-4" />
                      {member.name}
                    </h4>
                    <Badge variant={required.every(r => r.uploaded) ? "default" : "secondary"}>
                      {required.filter(r => r.uploaded).length}/{required.length} complete
                    </Badge>
                  </div>

                  <div className="space-y-4">
                    {/* Member Photo */}
                    <div>
                      <Label className="flex items-center gap-2 mb-2">
                        <Camera className="w-4 h-4" />
                        Member Photo *
                      </Label>
                      <div className="flex items-center gap-2 flex-wrap">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(e) => handleFileUpload(e.target.files, 'member_photo', memberIndex)}
                          className="hidden"
                          id={`member-photo-${memberIndex}`}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById(`member-photo-${memberIndex}`)?.click()}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Upload
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => startCamera('member_photo', memberIndex)}
                        >
                          <Camera className="w-4 h-4 mr-2" />
                          Camera
                        </Button>
                        {getPhotosForMember(memberIndex, 'member_photo').length > 0 && (
                          <Badge variant="default">
                            {getPhotosForMember(memberIndex, 'member_photo').length} uploaded
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Certificates */}
                    {member.certificates && (
                      <div>
                        <Label className="flex items-center gap-2 mb-2">
                          <FileText className="w-4 h-4" />
                          Certificates *
                        </Label>
                        <div className="flex items-center gap-2 flex-wrap">
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={(e) => handleFileUpload(e.target.files, 'certificate', memberIndex)}
                            className="hidden"
                            id={`certificates-${memberIndex}`}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => document.getElementById(`certificates-${memberIndex}`)?.click()}
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Upload
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => startCamera('certificate', memberIndex)}
                          >
                            <Camera className="w-4 h-4 mr-2" />
                            Camera
                          </Button>
                          {getPhotosForMember(memberIndex, 'certificate').length > 0 && (
                            <Badge variant="default">
                              {getPhotosForMember(memberIndex, 'certificate').length} uploaded
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Identity Documents */}
                    {(member.identityDocuments?.aadhaar?.needsCorrection || member.identityDocuments?.aadhaar?.needsNew) && (
                      <div>
                        <Label className="flex items-center gap-2 mb-2">
                          <CreditCard className="w-4 h-4" />
                          Aadhaar Document *
                        </Label>
                        <div className="flex items-center gap-4">
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={(e) => handleFileUpload(e.target.files, 'identity', memberIndex, 'aadhaar')}
                            className="hidden"
                            id={`aadhaar-${memberIndex}`}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => document.getElementById(`aadhaar-${memberIndex}`)?.click()}
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Upload Aadhaar
                          </Button>
                          {photos.filter(p => p.memberIndex === memberIndex && p.documentType === 'aadhaar').length > 0 && (
                            <Badge variant="default">
                              {photos.filter(p => p.memberIndex === memberIndex && p.documentType === 'aadhaar').length} uploaded
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {(member.identityDocuments?.voterId?.needsCorrection || member.identityDocuments?.voterId?.needsNew) && (
                      <div>
                        <Label className="flex items-center gap-2 mb-2">
                          <CreditCard className="w-4 h-4" />
                          Voter ID Document *
                        </Label>
                        <div className="flex items-center gap-4">
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={(e) => handleFileUpload(e.target.files, 'identity', memberIndex, 'voterId')}
                            className="hidden"
                            id={`voterId-${memberIndex}`}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => document.getElementById(`voterId-${memberIndex}`)?.click()}
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Upload Voter ID
                          </Button>
                          {photos.filter(p => p.memberIndex === memberIndex && p.documentType === 'voterId').length > 0 && (
                            <Badge variant="default">
                              {photos.filter(p => p.memberIndex === memberIndex && p.documentType === 'voterId').length} uploaded
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Other Documents */}
                    <div>
                      <Label className="flex items-center gap-2 mb-2">
                        <FileText className="w-4 h-4" />
                        Other Documents (Optional)
                      </Label>
                      <div className="flex items-center gap-4">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(e) => handleFileUpload(e.target.files, 'other_document', memberIndex)}
                          className="hidden"
                          id={`other-docs-${memberIndex}`}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById(`other-docs-${memberIndex}`)?.click()}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Upload Other Documents
                        </Button>
                        {getPhotosForMember(memberIndex, 'other_document').length > 0 && (
                          <Badge variant="secondary">
                            {getPhotosForMember(memberIndex, 'other_document').length} uploaded
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Display uploaded photos for this member */}
                    {memberPhotos.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
                        {memberPhotos.map((photo) => (
                          <div key={photo.id} className="relative group">
                            <img
                              src={photo.url}
                              alt={photo.description}
                              className={`w-full h-20 object-cover rounded border ${
                                photo.uploading ? 'opacity-50' : ''
                              }`}
                            />
                            {photo.uploading && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded">
                                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              </div>
                            )}
                            {!photo.uploading && (
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => removePhoto(photo.id)}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            )}
                            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 rounded-b">
                              {photo.category.replace('_', ' ')}
                              {photo.uploading && ' (uploading...)'}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['certificate', 'identity', 'other_document'].map((category) => {
                const categoryPhotos = photos.filter(p => p.category === category);
                return (
                  <Card key={category} className="p-4">
                    <h4 className="font-medium mb-3 capitalize">
                      {category.replace('_', ' ')}s ({categoryPhotos.length})
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {categoryPhotos.map((photo) => (
                        <div key={photo.id} className="relative group">
                          <img
                            src={photo.url}
                            alt={photo.description}
                            className="w-full h-16 object-cover rounded border"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute top-1 right-1 h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removePhoto(photo.id)}
                          >
                            <X className="w-2 h-2" />
                          </Button>
                          <div className="text-xs mt-1 truncate">
                            {familyMembers[photo.memberIndex || 0]?.name}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="family" className="space-y-4">
            <div>
              <Label className="flex items-center gap-2 mb-4">
                <Camera className="w-4 h-4" />
                Family Group Photos & General Documents
              </Label>
              
              <div className="space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleFileUpload(e.target.files, 'other_document')}
                    className="hidden"
                    id="family-photos"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('family-photos')?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => startCamera('other_document')}
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Camera
                  </Button>
                </div>

                {photos.filter(p => p.memberIndex === undefined).length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {photos.filter(p => p.memberIndex === undefined).map((photo) => (
                      <div key={photo.id} className="relative group">
                        <img
                          src={photo.url}
                          alt={photo.description}
                          className="w-full h-24 object-cover rounded border"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removePhoto(photo.id)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Camera Overlay - Rendered as Portal to document.body */}
      {isCameraActive && typeof window !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center p-4"
          style={{ zIndex: 99999 }}
        >
          <div className="w-full max-w-lg space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between text-white mb-4">
              <div>
                <h3 className="text-lg font-medium text-white">
                  Capture {currentCameraContext?.category?.replace('_', ' ')}
                </h3>
                {currentCameraContext?.memberIndex !== undefined && (
                  <p className="text-sm text-gray-300">
                    for {familyMembers[currentCameraContext.memberIndex]?.name}
                  </p>
                )}
              </div>
              <Button 
                type="button" 
                variant="ghost" 
                size="sm" 
                onClick={stopCamera} 
                className="text-white hover:bg-white/20 bg-black/50"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            {/* Camera View */}
            <div className="relative bg-gray-900 rounded-lg overflow-hidden border-2 border-white/20">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full aspect-[4/3] object-cover bg-gray-800"
                onLoadedMetadata={() => {
                  if (videoRef.current) {
                    videoRef.current.play();
                  }
                }}
                onError={(e) => {
                  console.error('Video error:', e);
                  if (typeof window !== 'undefined' && (window as any).toast) {
                    (window as any).toast.error('Camera error occurred');
                  }
                }}
              />
              
              {/* Loading indicator if video not ready */}
              {!stream && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                  <div className="text-white text-center">
                    <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-sm">Starting camera...</p>
                  </div>
                </div>
              )}
              
              {/* Camera controls */}
              <div className="absolute bottom-4 left-0 right-0 flex justify-center items-center gap-6 px-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={switchCamera}
                  className="bg-black/70 border-white/30 text-white hover:bg-black/50 backdrop-blur-sm"
                >
                  <SwitchCamera className="w-4 h-4" />
                </Button>
                
                <Button
                  type="button"
                  onClick={capturePhoto}
                  size="lg"
                  className="bg-white text-black hover:bg-gray-200 rounded-full w-16 h-16 shadow-lg border-4 border-white/20"
                  disabled={!stream}
                >
                  <Camera className="w-6 h-6" />
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={stopCamera}
                  className="bg-black/70 border-white/30 text-white hover:bg-black/50 backdrop-blur-sm"
                >
                  Cancel
                </Button>
              </div>
            </div>
            
            <p className="text-center text-sm text-gray-400">
              Position the {currentCameraContext?.category?.replace('_', ' ')} in the frame and tap the capture button
            </p>
          </div>
          
          {/* Hidden canvas for photo capture */}
          <canvas ref={canvasRef} className="hidden" />
        </div>,
        document.body
      )}
    </Card>
  );
}