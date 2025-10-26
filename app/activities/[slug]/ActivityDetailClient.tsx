"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Calendar, Eye, X, ChevronLeft, ChevronRight } from 'lucide-react';
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

interface ActivityDetailClientProps {
  activity: Activity;
}

export default function ActivityDetailClient({ activity }: ActivityDetailClientProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);

  // Keyboard navigation for image carousel
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

  const handleImageClick = (index: number) => {
    setSelectedImageIndex(index);
    setImageDialogOpen(true);
  };

  const closeImageDialog = () => {
    setSelectedImageIndex(null);
    setImageDialogOpen(false);
  };

  const navigateImage = (direction: 'prev' | 'next') => {
    if (selectedImageIndex === null) return;
    
    if (direction === 'prev') {
      setSelectedImageIndex(selectedImageIndex > 0 ? selectedImageIndex - 1 : activity.images.length - 1);
    } else {
      setSelectedImageIndex(selectedImageIndex < activity.images.length - 1 ? selectedImageIndex + 1 : 0);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* SEO-friendly structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Event",
            "name": activity.title || "Community Activity",
            "description": activity.description || "Community activity by Khadim-e-Millat Welfare Foundation",
            "startDate": activity.date,
            "organizer": {
              "@type": "Organization",
              "name": "Khadim-e-Millat Welfare Foundation",
              "url": "https://khadimemillat.org"
            },
            "location": {
              "@type": "Place",
              "name": "Gorakhpur, Uttar Pradesh, India"
            },
            "image": activity.images.length > 0 ? activity.images : undefined,
            "url": `https://khadimemillat.org/activities/${activity.slug}`
          })
        }}
      />

      {/* Header */}
      <section className="bg-card border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <AnimatedSection variant="fade" delay={0.1}>
            <div className="flex items-center gap-4 mb-6">
              <Link href="/activities">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Activities
                </Button>
              </Link>
            </div>
            
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-2">
                  {activity.title || 'Community Activity'}
                </h1>
                <div className="flex items-center gap-4 text-muted-foreground">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    <time dateTime={activity.date}>
                      {format(new Date(activity.date), 'PPP')}
                    </time>
                  </div>
                  <Badge variant="outline">
                    {activity.images.length} {activity.images.length === 1 ? 'Photo' : 'Photos'}
                  </Badge>
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-3 gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Description */}
            {activity.description && (
              <AnimatedSection variant="slideUp" delay={0.2}>
                <Card className="mb-8">
                  <CardContent className="p-6">
                    <h2 className="text-xl font-semibold mb-4">About This Activity</h2>
                    <div className="prose prose-gray max-w-none">
                      <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {activity.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </AnimatedSection>
            )}

            {/* Image Gallery */}
            <AnimatedSection variant="slideUp" delay={0.3}>
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-6">
                    Photo Gallery ({activity.images.length})
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activity.images.map((image, index) => (
                      <div
                        key={index}
                        className="relative aspect-video cursor-pointer group overflow-hidden rounded-lg"
                        onClick={() => handleImageClick(index)}
                      >
                        <img
                          src={image}
                          alt={`${activity.title || 'Activity'} - Photo ${index + 1}`}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          loading={index < 2 ? 'eager' : 'lazy'}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <Eye className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </AnimatedSection>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <AnimatedSection variant="slideUp" delay={0.4}>
              <Card className="sticky top-8">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Activity Details</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Date</label>
                      <p className="text-sm">
                        <time dateTime={activity.date}>
                          {format(new Date(activity.date), 'PPPP')}
                        </time>
                      </p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Photos</label>
                      <p className="text-sm">{activity.images.length} images</p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Status</label>
                      <div className="mt-1">
                        <Badge variant={activity.isActive ? 'default' : 'secondary'}>
                          {activity.isActive ? 'Active' : 'Archived'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t">
                    <Link href="/activities">
                      <Button variant="outline" className="w-full">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        View All Activities
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </AnimatedSection>
          </div>
        </div>
      </div>

      {/* Image Lightbox Dialog */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[95vh] p-0">
          <DialogHeader className="p-6 pb-0">
            <div className="flex justify-between items-center">
              <DialogTitle>
                Photo {selectedImageIndex !== null ? selectedImageIndex + 1 : 1} of {activity.images.length}
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
                src={activity.images[selectedImageIndex]}
                alt={`${activity.title || 'Activity'} - Photo ${selectedImageIndex + 1}`}
                className="w-full h-auto max-h-[75vh] object-contain rounded-lg"
              />
              
              {/* Navigation Buttons */}
              {activity.images.length > 1 && (
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
                {selectedImageIndex + 1} / {activity.images.length}
              </div>

              {/* Keyboard Navigation Hint */}
              {activity.images.length > 1 && (
                <div className="absolute top-8 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-xs opacity-75">
                  Use ← → keys to navigate
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}