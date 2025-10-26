"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar, Eye, Image as ImageIcon, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { AnimatedSection } from '@/components/animations';
import { format } from 'date-fns';
import Link from 'next/link';

interface Activity {
  _id: string;
  title?: string;
  description?: string;
  images: string[];
  date: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  slug?: string;
}

interface ActivitiesClientProps {
  initialManagedActivities: Activity[];
  initialGalleryImages: string[];
}

export default function ActivitiesClient({ 
  initialManagedActivities, 
  initialGalleryImages 
}: ActivitiesClientProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!imageDialogOpen || selectedImageIndex === null) return;
      
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        navigateImage('prev');
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        navigateImage('next');
      } else if (event.key === 'Escape') {
        event.preventDefault();
        closeImageDialog();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [imageDialogOpen, selectedImageIndex]);

  const handleImageClick = (imagePath: string) => {
    // Find the index of the clicked image in the combined image array
    const allImages = [
      ...initialManagedActivities.flatMap(activity => activity.images),
      ...initialGalleryImages
    ];
    const imageIndex = allImages.findIndex(img => img === imagePath);
    setSelectedImageIndex(imageIndex >= 0 ? imageIndex : 0);
    setImageDialogOpen(true);
  };

  const closeImageDialog = () => {
    setSelectedImageIndex(null);
    setImageDialogOpen(false);
  };

  const navigateImage = (direction: 'prev' | 'next') => {
    const allImages = [
      ...initialManagedActivities.flatMap(activity => activity.images),
      ...initialGalleryImages
    ];
    
    if (selectedImageIndex === null) return;
    
    if (direction === 'prev') {
      setSelectedImageIndex(selectedImageIndex > 0 ? selectedImageIndex - 1 : allImages.length - 1);
    } else {
      setSelectedImageIndex(selectedImageIndex < allImages.length - 1 ? selectedImageIndex + 1 : 0);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection variant="fade" delay={0.1}>
            <div className="text-center">
              <h1 className="text-4xl md:text-6xl font-bold mb-6">
                Our Activities
              </h1>
              <p className="text-xl md:text-2xl mb-8 text-primary-foreground/90 max-w-3xl mx-auto">
                Discover our community initiatives, welfare programs, and the positive impact we're making together
              </p>
            </div>
          </AnimatedSection>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Managed Activities Section */}
        {initialManagedActivities.length > 0 && (
          <section className="mb-16">
            <AnimatedSection variant="fade" delay={0.2}>
              <h2 className="text-3xl font-bold text-center mb-12">Recent Activities</h2>
            </AnimatedSection>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {initialManagedActivities.map((activity, index) => (
                <AnimatedSection 
                  key={activity._id} 
                  variant="slideUp" 
                  delay={0.1 + (index * 0.1)}
                >
                  <Card className="h-full hover:shadow-lg transition-shadow">
                    <div className="relative">
                      <img
                        src={activity.images[0]}
                        alt={activity.title || 'Activity'}
                        className="w-full h-48 object-cover rounded-t-lg"
                      />
                      {activity.images.length > 1 && (
                        <Badge className="absolute top-2 right-2 bg-black/50 text-white">
                          +{activity.images.length - 1} more
                        </Badge>
                      )}
                    </div>
                    
                    <CardContent className="p-6">
                      <div className="flex items-center text-sm text-muted-foreground mb-3">
                        <Calendar className="h-4 w-4 mr-1" />
                        {format(new Date(activity.date), 'PPP')}
                      </div>
                      
                      {activity.title && (
                        <h3 className="text-xl font-semibold mb-3">{activity.title}</h3>
                      )}
                      
                      {activity.description && (
                        <p className="text-muted-foreground mb-4 line-clamp-3">
                          {activity.description}
                        </p>
                      )}
                      
                      <Link href={`/activities/${activity.slug || activity._id}`}>
                        <Button className="w-full">
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                </AnimatedSection>
              ))}
            </div>
          </section>
        )}

        {/* Gallery Section */}
        {initialGalleryImages.length > 0 && (
          <section>
            <AnimatedSection variant="fade" delay={0.3}>
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold mb-4">
                  {initialManagedActivities.length > 0 ? 'More From Our Gallery' : 'Activity Gallery'}
                </h2>
                <p className="text-lg text-muted-foreground">
                  A collection of moments from our community work and initiatives
                </p>
              </div>
            </AnimatedSection>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {initialGalleryImages.map((imagePath, index) => (
                <AnimatedSection 
                  key={imagePath} 
                  variant="slideUp" 
                  delay={0.1 + (index * 0.05)}
                >
                  <div
                    className="relative aspect-square cursor-pointer group overflow-hidden rounded-lg"
                    onClick={() => handleImageClick(imagePath)}
                  >
                    <img
                      src={imagePath}
                      alt={`Gallery image ${index + 1}`}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <Eye className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </AnimatedSection>
              ))}
            </div>
          </section>
        )}

        {/* Empty State */}
        {initialManagedActivities.length === 0 && initialGalleryImages.length === 0 && (
          <AnimatedSection variant="fade" delay={0.2}>
            <Card className="text-center py-16">
              <CardContent>
                <ImageIcon className="h-16 w-16 mx-auto text-muted-foreground mb-6" />
                <h2 className="text-2xl font-semibold mb-4">No Activities Yet</h2>
                <p className="text-muted-foreground mb-6">
                  We're working on documenting our activities. Check back soon to see our community work!
                </p>
                <p className="text-sm text-muted-foreground">
                  To add activities, place images in the <code>/public/activities</code> folder or use the admin panel.
                </p>
              </CardContent>
            </Card>
          </AnimatedSection>
        )}
      </div>

      {/* Image Carousel Dialog */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[95vh] p-0">
          <DialogHeader className="p-6 pb-0">
            <div className="flex justify-between items-center">
              <DialogTitle>
                {(() => {
                  const allImages = [
                    ...initialManagedActivities.flatMap(activity => activity.images),
                    ...initialGalleryImages
                  ];
                  return `Photo ${selectedImageIndex !== null ? selectedImageIndex + 1 : 1} of ${allImages.length}`;
                })()}
              </DialogTitle>
            </div>
          </DialogHeader>
          
          {selectedImageIndex !== null && (() => {
            const allImages = [
              ...initialManagedActivities.flatMap(activity => activity.images),
              ...initialGalleryImages
            ];
            return (
              <div className="relative p-6 pt-0">
                <img
                  src={allImages[selectedImageIndex]}
                  alt={`Gallery image ${selectedImageIndex + 1}`}
                  className="w-full h-auto max-h-[75vh] object-contain rounded-lg"
                />
                
                {/* Navigation Buttons */}
                {allImages.length > 1 && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute left-8 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white"
                      onClick={() => navigateImage('prev')}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute right-8 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white"
                      onClick={() => navigateImage('next')}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </>
                )}
                
                {/* Image Counter */}
                <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                  {selectedImageIndex + 1} / {allImages.length}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}