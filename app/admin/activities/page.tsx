"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, Eye, Calendar, Image as ImageIcon, Loader2, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { EnhancedFileSelector } from '@/components/file-selector';
import { FileUploadError, UploadResult } from '@/components/file-selector/types';

interface Activity {
  _id: string;
  title?: string;
  description?: string;
  images: string[];
  date: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  slug?: string;
}

interface ActivityFormData {
  title: string;
  description: string;
  images: string[];
  date: string;
  isActive: boolean;
}

export default function AdminActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [uploadedImages, setUploadedImages] = useState<UploadResult[]>([]);
  const [fileUploadError, setFileUploadError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<ActivityFormData>({
    title: '',
    description: '',
    images: [],
    date: new Date().toISOString().split('T')[0],
    isActive: true
  });

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/activities?combined=true&includeInactive=true');
      const result = await response.json();
      
      if (result.success) {
        setActivities(result.data.managedActivities);
        setGalleryImages(result.data.galleryImages);
      } else {
        toast.error('Failed to fetch activities');
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
      toast.error('Failed to fetch activities');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.images.length === 0) {
      toast.error('Please upload or select at least one image');
      return;
    }

    setSubmitting(true);
    
    try {
      const url = editingActivity 
        ? `/api/activities/${editingActivity._id}`
        : '/api/activities';
      
      const method = editingActivity ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(editingActivity ? 'Activity updated successfully' : 'Activity created successfully');
        setIsDialogOpen(false);
        resetForm();
        fetchActivities();
      } else {
        toast.error(result.error || 'Failed to save activity');
      }
    } catch (error) {
      console.error('Error saving activity:', error);
      toast.error('Failed to save activity');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/activities/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Activity deleted successfully');
        fetchActivities();
      } else {
        toast.error(result.error || 'Failed to delete activity');
      }
    } catch (error) {
      console.error('Error deleting activity:', error);
      toast.error('Failed to delete activity');
    }
  };

  const handleEdit = (activity: Activity) => {
    setEditingActivity(activity);
    setFormData({
      title: activity.title || '',
      description: activity.description || '',
      images: activity.images,
      date: activity.date.split('T')[0],
      isActive: activity.isActive
    });
    setSelectedImages(activity.images);
    setUploadedImages([]);
    setFileUploadError(null);
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingActivity(null);
    setFormData({
      title: '',
      description: '',
      images: [],
      date: new Date().toISOString().split('T')[0],
      isActive: true
    });
    setSelectedImages([]);
    setUploadedImages([]);
    setFileUploadError(null);
  };

  const handleImageToggle = (imagePath: string) => {
    setSelectedImages(prev => {
      const newSelection = prev.includes(imagePath)
        ? prev.filter(img => img !== imagePath)
        : [...prev, imagePath];
      
      updateFormImages(newSelection, uploadedImages);
      return newSelection;
    });
  };

  const updateFormImages = (selected: string[], uploaded: UploadResult[]) => {
    const allImages = [
      ...selected,
      ...uploaded.map(img => img.secureUrl)
    ];
    setFormData(prevForm => ({
      ...prevForm,
      images: allImages
    }));
  };

  // File upload handlers
  const handleFileSelect = (file: File, previewUrl: string) => {
    setFileUploadError(null);
  };

  const handleUploadComplete = (uploadResult: UploadResult) => {
    const newUploaded = [...uploadedImages, uploadResult];
    setUploadedImages(newUploaded);
    updateFormImages(selectedImages, newUploaded);
    toast.success('Image uploaded successfully');
  };

  const handleUploadError = (error: FileUploadError) => {
    console.error('Upload error:', error);
    setFileUploadError(error.message);
    toast.error(`Upload failed: ${error.message}`);
  };

  const removeUploadedImage = (publicId: string) => {
    const newUploaded = uploadedImages.filter(img => img.publicId !== publicId);
    setUploadedImages(newUploaded);
    updateFormImages(selectedImages, newUploaded);
    toast.success('Image removed');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Manage Activities</h1>
          <p className="text-muted-foreground">Create and manage foundation activities</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Activity
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingActivity ? 'Edit Activity' : 'Create New Activity'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Title (Optional)</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Activity title"
                  />
                </div>
                
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Activity description"
                  rows={4}
                />
              </div>

              <div>
                <Label>Images *</Label>
                <p className="text-sm text-muted-foreground mb-4">
                  Upload new images or select from existing images in /public/activities folder
                </p>

                {/* Upload New Images */}
                <div className="mb-6">
                  <Label className="text-sm font-medium mb-2 block">Upload New Images</Label>
                  <EnhancedFileSelector
                    onFileSelect={handleFileSelect}
                    onUploadComplete={handleUploadComplete}
                    onError={handleUploadError}
                    maxFileSize={10 * 1024 * 1024} // 10MB
                    acceptedTypes={['image/jpeg', 'image/png', 'image/webp']}
                    placeholder="Drag and drop activity photos here or click to select"
                    showPreview={true}
                    uploadToCloudinary={true}
                    cloudinaryOptions={{
                      folder: 'kmwf/activities',
                      tags: ['activity', 'community-work']
                    }}
                    className="rounded-lg"
                  />

                  {/* Display uploaded images */}
                  {uploadedImages.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-semibold mb-2">Newly Uploaded Images ({uploadedImages.length})</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {uploadedImages.map((image, index) => (
                          <div key={image.publicId} className="relative group">
                            <img
                              src={image.secureUrl}
                              alt={`Uploaded ${index + 1}`}
                              className="w-full h-20 object-cover rounded-md border border-primary"
                            />
                            <button
                              type="button"
                              onClick={() => removeUploadedImage(image.publicId)}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Remove image"
                            >
                              <X className="h-3 w-3" />
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

                {/* Select from Existing Images */}
                {galleryImages.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Or Select from Existing Images</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-h-60 overflow-y-auto border rounded-lg p-4">
                      {galleryImages.map((imagePath) => (
                        <div
                          key={imagePath}
                          className={`relative cursor-pointer border-2 rounded-lg overflow-hidden ${
                            selectedImages.includes(imagePath) 
                              ? 'border-primary ring-2 ring-primary/20' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => handleImageToggle(imagePath)}
                        >
                          <img
                            src={imagePath}
                            alt="Activity"
                            className="w-full h-20 object-cover"
                          />
                          {selectedImages.includes(imagePath) && (
                            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                              <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm">
                                ✓
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {galleryImages.length === 0 && uploadedImages.length === 0 && (
                  <p className="text-muted-foreground text-center py-4">
                    No existing images found. Upload new images above to get started.
                  </p>
                )}
              </div>

              {editingActivity && (
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  />
                  <Label htmlFor="isActive">Active</Label>
                </div>
              )}

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingActivity ? 'Update' : 'Create'} Activity
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Activities List */}
      <div className="grid gap-6">
        {activities.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Activities Yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first activity to get started
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Activity
              </Button>
            </CardContent>
          </Card>
        ) : (
          activities.map((activity) => (
            <Card key={activity._id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {activity.title || 'Untitled Activity'}
                      <Badge variant={activity.isActive ? 'default' : 'secondary'}>
                        {activity.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </CardTitle>
                    <div className="flex items-center text-sm text-muted-foreground mt-1">
                      <Calendar className="h-4 w-4 mr-1" />
                      {format(new Date(activity.date), 'PPP')}
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`/activities/${activity.slug || activity._id}`, '_blank')}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(activity)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Activity</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this activity? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(activity._id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                {activity.description && (
                  <p className="text-muted-foreground mb-4">{activity.description}</p>
                )}
                
                <div className="flex flex-wrap gap-2">
                  {activity.images.slice(0, 4).map((image, index) => (
                    <img
                      key={index}
                      src={image}
                      alt={`Activity ${index + 1}`}
                      className="w-20 h-20 object-cover rounded-lg border"
                    />
                  ))}
                  {activity.images.length > 4 && (
                    <div className="w-20 h-20 bg-muted rounded-lg border flex items-center justify-center text-sm text-muted-foreground">
                      +{activity.images.length - 4}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}