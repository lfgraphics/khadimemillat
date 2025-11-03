"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CarouselImage {
  title?: string;
  id: string;
  src: string;
  alt: string;
  mobileSrc?: string; // Optional mobile-specific image
}

interface CarouselProps {
  images: CarouselImage[];
  autoPlayInterval?: number; // in milliseconds, 0 to disable
  showIndicators?: boolean;
  showArrows?: boolean;
  className?: string;
  imageClassName?: string;
  mobileBreakpoint?: number; // px, default 768
}

export function Carousel({
  images,
  autoPlayInterval = 5000,
  showIndicators = true,
  showArrows = true,
  className,
  imageClassName,
  mobileBreakpoint = 768
}: CarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < mobileBreakpoint);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [mobileBreakpoint]);

  // Auto-play functionality
  const startAutoPlay = useCallback(() => {
    if (autoPlayInterval > 0) {
      autoPlayRef.current = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
      }, autoPlayInterval);
    }
  }, [autoPlayInterval, images.length]);

  const stopAutoPlay = useCallback(() => {
    if (autoPlayRef.current) {
      clearInterval(autoPlayRef.current);
      autoPlayRef.current = null;
    }
  }, []);

  useEffect(() => {
    startAutoPlay();
    return stopAutoPlay;
  }, [startAutoPlay, stopAutoPlay]);

  // Navigation functions
  const goToSlide = useCallback((index: number) => {
    if (isTransitioning) return;

    setIsTransitioning(true);
    setCurrentIndex(index);

    setTimeout(() => {
      setIsTransitioning(false);
    }, 300);
  }, [isTransitioning]);

  const goToPrevious = useCallback(() => {
    const newIndex = currentIndex === 0 ? images.length - 1 : currentIndex - 1;
    goToSlide(newIndex);
  }, [currentIndex, images.length, goToSlide]);

  const goToNext = useCallback(() => {
    const newIndex = (currentIndex + 1) % images.length;
    goToSlide(newIndex);
  }, [currentIndex, images.length, goToSlide]);

  // Touch handlers for swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
    stopAutoPlay();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) {
      startAutoPlay();
      return;
    }

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      goToNext();
    } else if (isRightSwipe) {
      goToPrevious();
    }

    startAutoPlay();
  };

  // Mouse handlers for hover pause
  const handleMouseEnter = () => stopAutoPlay();
  const handleMouseLeave = () => startAutoPlay();

  if (!images.length) return null;

  return (
    <div
      ref={carouselRef}
      className={cn(
        "relative mx-auto w-[98%] overflow-hidden rounded-lg",
        className
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Images Container */}
      <div
        className="flex transition-transform duration-300 ease-in-out"
        style={{
          transform: `translateX(-${currentIndex * 100}%)`,
        }}
      >
        {images.map((image, index) => (
          <div
            key={image.id}
            className="w-full flex-shrink-0 relative overflow-clip"
          >
            <img
              src={isMobile && image.mobileSrc ? image.mobileSrc : image.src}
              alt={image.alt}
              className={cn(
                "w-full h-auto object-cover",
                isMobile ? "aspect-[960/460]" : "aspect-[3240/540]",
                imageClassName
              )}
              loading={index === 0 ? "eager" : "lazy"}
            />
            {image.title &&
              <div className="absolute bottom-0 left-0 w-full text-white bg-gradient-to-r from-black/45 via-black/20 to-transparent px-2">
                {image.title}
              </div>
            }
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      {showArrows && images.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            disabled={isTransitioning}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/40 text-white hover:bg-black/70 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            onClick={goToNext}
            disabled={isTransitioning}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/40 text-white hover:bg-black/70 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Next image"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Indicators */}
      {showIndicators && images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex space-x-2">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              disabled={isTransitioning}
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-200 disabled:cursor-not-allowed",
                index === currentIndex
                  ? "bg-white w-6"
                  : "bg-white/50 hover:bg-white/75"
              )}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}