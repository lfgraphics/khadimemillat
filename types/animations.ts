/**
 * TypeScript types and interfaces for animation system
 */

// Animation direction types
export type AnimationDirection = 'up' | 'down' | 'left' | 'right' | 'fade';

// Animation trigger types
export type AnimationTrigger = 'viewport' | 'hover' | 'immediate' | 'click';

// Animation easing types
export type AnimationEasing = 'easeOut' | 'easeIn' | 'easeInOut' | 'bounce' | 'spring';

// Animation configuration interface
export interface AnimationConfig {
  duration: number;
  delay: number;
  easing: AnimationEasing;
  threshold: number;
  reducedMotion: boolean;
}

// Section animation configuration
export interface SectionAnimation {
  id: string;
  type: 'fadeIn' | 'slideUp' | 'slideLeft' | 'slideRight' | 'slideDown' | 'scale' | 'stagger';
  config: AnimationConfig;
  trigger: AnimationTrigger;
}

// Intersection observer options
export interface IntersectionOptions {
  threshold?: number | number[];
  root?: Element | null;
  rootMargin?: string;
  triggerOnce?: boolean;
}

// Animation variant types for motion library
export interface AnimationVariant {
  hidden: {
    opacity?: number;
    x?: number;
    y?: number;
    scale?: number;
    rotate?: number;
  };
  visible: {
    opacity?: number;
    x?: number;
    y?: number;
    scale?: number;
    rotate?: number;
    transition?: {
      duration?: number;
      delay?: number;
      ease?: string;
      staggerChildren?: number;
      delayChildren?: number;
    };
  };
}

// Stagger container variant
export interface StaggerVariant {
  hidden: {
    opacity: number;
  };
  visible: {
    opacity: number;
    transition: {
      staggerChildren: number;
      delayChildren?: number;
    };
  };
}

// Performance monitoring interface
export interface PerformanceMetrics {
  canAnimate: boolean;
  deviceMemory?: number;
  hardwareConcurrency?: number;
  connectionType?: string;
  saveData?: boolean;
  batteryLevel?: number;
  isCharging?: boolean;
}

// Animation component props
export interface AnimatedComponentProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  direction?: AnimationDirection;
  threshold?: number;
  triggerOnce?: boolean;
}

// Counter animation props
export interface CounterAnimationProps {
  number: number;
  duration?: number;
  delay?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
}

// Card animation props
export interface CardAnimationProps {
  children: React.ReactNode;
  className?: string;
  hoverScale?: number;
  hoverShadow?: boolean;
  clickScale?: number;
}