# Carousel Component

A fully-featured, responsive carousel component built with React and TypeScript.

## Features

- ✅ **Responsive Design**: Automatically switches between desktop (3240x540) and mobile (960x460) image sizes
- ✅ **Smooth Slide Animation**: CSS transitions with proper easing
- ✅ **Touch/Swipe Support**: Native touch gestures for mobile devices
- ✅ **Auto-play**: Configurable auto-advance with pause on hover
- ✅ **Navigation Controls**: Previous/Next buttons and dot indicators
- ✅ **Seamless Loop**: Smooth transition from last slide back to first
- ✅ **Accessibility**: ARIA labels and keyboard navigation support
- ✅ **Performance**: Lazy loading for non-visible images
- ✅ **Customizable**: Extensive styling and behavior options

## Usage

```tsx
import { Carousel } from '@/components/ui/carousel';

const images = [
  {
    id: '1',
    src: '/images/desktop-1.jpg',
    mobileSrc: '/images/mobile-1.jpg',
    alt: 'Description 1'
  },
  // ... more images
];

export function MyComponent() {
  return (
    <Carousel
      images={images}
      autoPlayInterval={5000}
      showIndicators={true}
      showArrows={true}
    />
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `images` | `CarouselImage[]` | **required** | Array of image objects |
| `autoPlayInterval` | `number` | `5000` | Auto-advance interval in ms (0 to disable) |
| `showIndicators` | `boolean` | `true` | Show dot indicators |
| `showArrows` | `boolean` | `true` | Show navigation arrows |
| `className` | `string` | `undefined` | Additional CSS classes for container |
| `imageClassName` | `string` | `undefined` | Additional CSS classes for images |
| `mobileBreakpoint` | `number` | `768` | Breakpoint for mobile/desktop switch (px) |

## CarouselImage Interface

```tsx
interface CarouselImage {
  id: string;        // Unique identifier
  src: string;       // Desktop image URL
  alt: string;       // Alt text for accessibility
  mobileSrc?: string; // Optional mobile image URL
}
```

## Responsive Behavior

- **Desktop (≥768px)**: Uses `src` with aspect ratio 3240:540
- **Mobile (<768px)**: Uses `mobileSrc` (fallback to `src`) with aspect ratio 960:460
- Breakpoint is customizable via `mobileBreakpoint` prop

## Touch Gestures

- **Swipe Left**: Next slide
- **Swipe Right**: Previous slide
- **Minimum swipe distance**: 50px to trigger navigation
- Auto-play pauses during touch interaction

## Auto-play Behavior

- Pauses on hover (desktop)
- Pauses during touch interaction (mobile)
- Resumes when interaction ends
- Set `autoPlayInterval={0}` to disable

## Styling

The component uses Tailwind CSS classes and can be customized:

```tsx
<Carousel
  className="rounded-xl shadow-lg"
  imageClassName="object-cover"
  images={images}
/>
```

## Accessibility

- ARIA labels for navigation buttons
- Keyboard navigation support
- Proper alt text for images
- Focus management during transitions

## Performance

- First image loads eagerly, others lazy load
- Smooth CSS transitions (300ms duration)
- Optimized re-renders with useCallback hooks
- Automatic cleanup of intervals and event listeners