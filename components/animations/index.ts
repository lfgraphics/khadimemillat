/**
 * Animation components exports
 * Central export point for all animation wrapper components
 */

export { AnimatedSection } from './AnimatedSection';
export { AnimatedCard } from './AnimatedCard';
export { AnimatedCounter, AnimatedCounterGroup } from './AnimatedCounter';
export { AnimatedButton } from './AnimatedButton';
export { AnimatedStatsSection } from './AnimatedStatsSection';
export { AnimatedProcessSteps } from './AnimatedProcessSteps';
export { AnimatedProgramCards } from './AnimatedProgramCards';
export { AnimatedContactSection } from './AnimatedContactSection';
// export { AnimationPerformanceMonitor } from './AnimationPerformanceMonitor';

// Re-export animation utilities and hooks for convenience
export {
  useReducedMotion,
  useAnimationPerformance,
  useIntersectionObserver,
  useMultipleIntersectionObserver,
  createEntranceVariant,
  createStaggerVariant,
  createScaleVariant,
  createBounceVariant,
  shouldDisableAnimations,
  calculateStaggerDelay,
  getAdaptiveDuration,
  createAnimationCSSVars,
  ANIMATION_DURATIONS,
  ANIMATION_EASINGS,
  INTERSECTION_THRESHOLDS,
  ANIMATION_DISTANCES,
  STAGGER_DELAYS,
  HOVER_SCALES,
  SHADOW_INTENSITIES
} from '@/lib/animations';

// Re-export types
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