export interface CarouselImage {
  id: string;
  src: string;
  alt: string;
  mobileSrc?: string; // Optional mobile-specific image
}

export interface CarouselProps {
  images: CarouselImage[];
  autoPlayInterval?: number; // in milliseconds, 0 to disable
  showIndicators?: boolean;
  showArrows?: boolean;
  className?: string;
  imageClassName?: string;
  mobileBreakpoint?: number; // px, default 768
}

export interface CarouselState {
  currentIndex: number;
  isTransitioning: boolean;
  isMobile: boolean;
}