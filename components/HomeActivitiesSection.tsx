"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye, ArrowRight, Image as ImageIcon, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { AnimatedSection } from '@/components/animations';
import Link from 'next/link';

interface Activity {
  _id: string;
  title?: string;
  description?: string;
  images: string[];
  date: string;
  isActive: boolean;
}

interface HomeActivitiesSectionProps {
  activities: Activity[];
  galleryImages: string[];
}

export default function HomeActivitiesSection({ activities, galleryImages }: HomeActivitiesSectionProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);

  // Combine all images for display (limit to 6 for home page)
  const allImages = [
    ...activities.flatMap(activity => activity.images),
    ...galleryImages
  ].slice(0, 6);

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
    const imageIndex = allImages.findIndex(img => img === imagePath);
    setSelectedImageIndex(imageIndex >= 0 ? imageIndex : 0);
    setImageDialogOpen(true);
  };

  const closeImageDialog = () => {
    setSelectedImageIndex(null);
    setImageDialogOpen(false);
  };

  const navigateImage = (direction: 'prev' | 'next') => {
    if (selectedImageIndex === null) return;
    
    if (direction === 'prev') {
      setSelectedImageIndex(selectedImageIndex > 0 ? selectedImageIndex - 1 : allImages.length - 1);
    } else {
      setSelectedImageIndex(selectedImageIndex < allImages.length - 1 ? selectedImageIndex + 1 : 0);
    }
  };

  if (allImages.length === 0) {
    return null; // Don't show section if no images
  }

  return (
    <>
      <section className="bg-card py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection variant="fade" delay={0.1}>
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Our Activities
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Discover our community initiatives, welfare programs, and the positive impact we're making together
              </p>
            </div>
          </AnimatedSection>

          {/* Scrollable Image Row */}
          <AnimatedSection variant="slideUp" delay={0.2}>
            <div className="relative">
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {allImages.map((imagePath, index) => (
                  <div
                    key={imagePath}
                    className="relative flex-shrink-0 w-64 h-48 cursor-pointer group overflow-hidden rounded-lg"
                    onClick={() => handleImageClick(imagePath)}
                  >
                    <img
                      src={imagePath}
                      alt={`Activity ${index + 1}`}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <Eye className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Gradient fade on right */}
              <div className="absolute top-0 right-0 h-full w-16 bg-gradient-to-l from-card to-transparent pointer-events-none" />
            </div>
          </AnimatedSection>

          {/* View More Button */}
          <AnimatedSection variant="slideUp" delay={0.3}>
            <div className="text-center mt-8">
              <Link href="/activities">
                <Button size="lg" className="group">
                  View All Activities
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Image Carousel Dialog */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[95vh] p-0">
          <DialogHeader className="p-6 pb-0">
            <div className="flex justify-between items-center">
              <DialogTitle>
                Photo {selectedImageIndex !== null ? selectedImageIndex + 1 : 1} of {allImages.length}
              </DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={closeImageDialog}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          
          {selectedImageIndex !== null && (
            <div className="relative p-6 pt-0">
              <img
                src={allImages[selectedImageIndex]}
                alt={`Activity image ${selectedImageIndex + 1}`}
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
              
              {/* Keyboard Navigation Hint */}
              <div className="absolute top-8 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-xs opacity-75">
                Use ← → keys to navigate
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}