# Animation Infrastructure

This directory contains the core animation infrastructure for the landing page animations feature.

## Components

### Hooks
- **`useReducedMotion`**: Detects user's reduced motion preference
- **`useAnimationPerformance`**: Monitors device performance and disables animations on low-end devices
- **`useIntersectionObserver`**: Provides viewport detection for scroll-triggered animations

### Constants
- **Animation durations**: Standardized timing values
- **Easing functions**: CSS cubic-bezier curves for smooth animations
- **Thresholds**: Intersection observer trigger points
- **Distances**: Movement distances for entrance animations

### Utilities
- **Variant creators**: Functions to generate motion library animation variants
- **Performance helpers**: Utilities to optimize animation performance
- **CSS variable generators**: Dynamic animation property creation

### Types
- **TypeScript interfaces**: Complete type definitions for animation system
- **Component props**: Standardized props for animated components

## Usage

```typescript
import { 
  useReducedMotion, 
  useAnimationPerformance, 
  useIntersectionObserver,
  createEntranceVariant,
  ANIMATION_DURATIONS 
} from '@/lib/animations';

// In a component
const prefersReducedMotion = useReducedMotion();
const canAnimate = useAnimationPerformance();
const [ref, isVisible] = useIntersectionObserver();

const shouldAnimate = !prefersReducedMotion && canAnimate;
const variant = createEntranceVariant('up', ANIMATION_DURATIONS.normal);
```

## Requirements Addressed

- **1.3**: Respects user's prefers-reduced-motion setting
- **4.3**: Performance monitoring and optimization
- **5.1**: Accessibility compliance with reduced motion support
- **5.2**: Screen reader compatibility (animations don't interfere with content)