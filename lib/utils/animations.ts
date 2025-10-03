/**
 * Animation utility functions and helpers
 */

import { AnimationVariant, StaggerVariant, AnimationDirection } from '@/types/animations';
import { 
  ANIMATION_DURATIONS, 
  ANIMATION_EASINGS, 
  ANIMATION_DISTANCES,
  STAGGER_DELAYS 
} from '@/lib/constants/animations';

/**
 * Creates animation variants for entrance animations
 */
export const createEntranceVariant = (
  direction: AnimationDirection = 'up',
  duration: number = ANIMATION_DURATIONS.normal,
  distance: number = ANIMATION_DISTANCES.medium
): AnimationVariant => {
  const variants: Record<AnimationDirection, AnimationVariant> = {
    up: {
      hidden: { opacity: 0, y: distance },
      visible: { 
        opacity: 1, 
        y: 0,
        transition: { duration, ease: ANIMATION_EASINGS.easeOut }
      }
    },
    down: {
      hidden: { opacity: 0, y: -distance },
      visible: { 
        opacity: 1, 
        y: 0,
        transition: { duration, ease: ANIMATION_EASINGS.easeOut }
      }
    },
    left: {
      hidden: { opacity: 0, x: distance },
      visible: { 
        opacity: 1, 
        x: 0,
        transition: { duration, ease: ANIMATION_EASINGS.easeOut }
      }
    },
    right: {
      hidden: { opacity: 0, x: -distance },
      visible: { 
        opacity: 1, 
        x: 0,
        transition: { duration, ease: ANIMATION_EASINGS.easeOut }
      }
    },
    fade: {
      hidden: { opacity: 0 },
      visible: { 
        opacity: 1,
        transition: { duration, ease: ANIMATION_EASINGS.easeOut }
      }
    }
  };

  return variants[direction];
};

/**
 * Creates stagger container variant for sequential animations
 */
export const createStaggerVariant = (
  staggerDelay: number = STAGGER_DELAYS.normal,
  delayChildren: number = 0
): StaggerVariant => ({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: staggerDelay,
      delayChildren
    }
  }
});

/**
 * Creates scale animation variant for hover effects
 */
export const createScaleVariant = (
  scale: number = 1.05,
  duration: number = ANIMATION_DURATIONS.fast
): AnimationVariant => ({
  hidden: { scale: 1 },
  visible: { 
    scale,
    transition: { duration, ease: ANIMATION_EASINGS.easeOut }
  }
});

/**
 * Creates bounce animation variant for interactive elements
 */
export const createBounceVariant = (
  scale: number = 1.1,
  duration: number = ANIMATION_DURATIONS.fast
): AnimationVariant => ({
  hidden: { scale: 1 },
  visible: { 
    scale,
    transition: { duration, ease: ANIMATION_EASINGS.bounce }
  }
});

/**
 * Utility to check if animations should be disabled
 * Respects user preferences and device capabilities
 */
export const shouldDisableAnimations = (
  prefersReducedMotion: boolean,
  canAnimate: boolean
): boolean => {
  return prefersReducedMotion || !canAnimate;
};

/**
 * Creates a safe animation variant that respects reduced motion preferences
 * Returns static variant when animations should be disabled
 */
export const createSafeAnimationVariant = (
  variant: AnimationVariant,
  disableAnimations: boolean
): AnimationVariant => {
  if (disableAnimations) {
    return {
      hidden: variant.visible,
      visible: variant.visible
    };
  }
  return variant;
};

/**
 * Creates accessible transition properties that respect user preferences
 */
export const createAccessibleTransition = (
  duration: number,
  delay: number = 0,
  easing: string = ANIMATION_EASINGS.easeOut,
  disableAnimations: boolean = false
) => {
  if (disableAnimations) {
    return {
      duration: 0,
      delay: 0
    };
  }
  
  return {
    duration,
    delay,
    ease: easing
  };
};

/**
 * Creates a delay based on index for staggered animations
 */
export const calculateStaggerDelay = (
  index: number,
  baseDelay: number = 0,
  staggerAmount: number = STAGGER_DELAYS.normal
): number => {
  return baseDelay + (index * staggerAmount);
};

/**
 * Utility to get appropriate animation duration based on content length
 */
export const getAdaptiveDuration = (
  contentLength: number,
  baseDuration: number = ANIMATION_DURATIONS.normal
): number => {
  // Longer content gets slightly longer animation duration
  const factor = Math.min(contentLength / 100, 2); // Cap at 2x duration
  return baseDuration * (1 + factor * 0.3);
};

/**
 * Creates CSS custom properties for dynamic animations
 */
export const createAnimationCSSVars = (config: {
  duration?: number;
  delay?: number;
  easing?: string;
}): React.CSSProperties => {
  return {
    '--animation-duration': `${config.duration || ANIMATION_DURATIONS.normal}s`,
    '--animation-delay': `${config.delay || 0}s`,
    '--animation-easing': config.easing || ANIMATION_EASINGS.easeOut
  } as React.CSSProperties;
};