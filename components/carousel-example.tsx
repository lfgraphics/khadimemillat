"use client";

import { Carousel } from '@/components/ui/carousel';

// Example usage component
export function CarouselExample() {
  const sampleImages = [
    {
      id: '1',
      src: '/images/hero-desktop-1.jpg', // 3240x540 for desktop
      mobileSrc: '/images/hero-mobile-1.jpg', // 960x460 for mobile
      alt: 'Hero image 1'
    },
    {
      id: '2',
      src: '/images/hero-desktop-2.jpg',
      mobileSrc: '/images/hero-mobile-2.jpg',
      alt: 'Hero image 2'
    },
    {
      id: '3',
      src: '/images/hero-desktop-3.jpg',
      mobileSrc: '/images/hero-mobile-3.jpg',
      alt: 'Hero image 3'
    },
    {
      id: '4',
      src: '/images/hero-desktop-4.jpg',
      mobileSrc: '/images/hero-mobile-4.jpg',
      alt: 'Hero image 4'
    }
  ];

  return (
    <div className="w-full max-w-7xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Carousel Example</h2>
      
      {/* Basic carousel with all features */}
      <Carousel
        images={sampleImages}
        autoPlayInterval={5000} // 5 seconds
        showIndicators={true}
        showArrows={true}
        className="mb-8"
      />

      {/* Carousel without auto-play */}
      <h3 className="text-xl font-semibold mb-4">Manual Navigation Only</h3>
      <Carousel
        images={sampleImages}
        autoPlayInterval={0} // Disabled
        showIndicators={true}
        showArrows={true}
        className="mb-8"
      />

      {/* Minimal carousel */}
      <h3 className="text-xl font-semibold mb-4">Minimal (No Controls)</h3>
      <Carousel
        images={sampleImages}
        autoPlayInterval={3000}
        showIndicators={false}
        showArrows={false}
      />
    </div>
  );
}