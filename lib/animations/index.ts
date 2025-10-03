/**
 * Animation system exports
 * Central export point for all animation-related utilities, hooks, and types
 */

// Hooks
export { useReducedMotion } from '@/hooks/useReducedMotion';
export { useAnimationPerformance } from '@/hooks/useAnimationPerformance';
export { 
  useIntersectionObserver, 
  useMultipleIntersectionObserver 
} from '@/hooks/useIntersectionObserver';

// Constants
export {
  ANIMATION_DURATIONS,
  ANIMATION_EASINGS,
  INTERSECTION_THRESHOLDS,
  ANIMATION_DISTANCES,
  STAGGER_DELAYS,
  HOVER_SCALES,
  SHADOW_INTENSITIES
} from '@/lib/constants/animations';

// Utilities
export {
  createEntranceVariant,
  createStaggerVariant,
  createScaleVariant,
  createBounceVariant,
  shouldDisableAnimations,
  calculateStaggerDelay,
  getAdaptiveDuration,
  createAnimationCSSVars,
  createSafeAnimationVariant,
  createAccessibleTransition
} from '@/lib/utils/animations';

// Accessibility utilities
export {
  useAnimationAccessibility,
  createAccessibleAnimationProps,
  validateAnimationAccessibility,
  announceAnimationState,
  supportsAnimations,
  getMotionPreferences
} from '@/lib/utils/accessibility';

// Performance utilities
export {
  getPerformanceLevel,
  getOptimizedDuration,
  getOptimizedStaggerDelay,
  createOptimizedAnimationConfig,
  useAnimationQueue,
  supportsHardwareAcceleration,
  applyPerformanceOptimizations,
  animationQueue
} from '@/lib/utils/performance';

// Performance monitoring
export { useDetailedAnimationPerformance } from '@/hooks/useAnimationPerformance';

// Types
export type {
  AnimationDirection,
  AnimationTrigger,
  AnimationEasing,
  AnimationConfig,
  SectionAnimation,
  IntersectionOptions,
  AnimationVariant,
  StaggerVariant,
  PerformanceMetrics,
  AnimatedComponentProps,
  CounterAnimationProps,
  CardAnimationProps
} from '@/types/animations';