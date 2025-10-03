/**
 * Animation configuration constants and types
 * Centralized configuration for consistent animations across the app
 */

// Animation durations in seconds
export const ANIMATION_DURATIONS = {
  fast: 0.2,
  normal: 0.4,
  slow: 0.6,
  counter: 2.5,
  stagger: 0.1
} as const;

// Animation easing functions (motion library format)
export const ANIMATION_EASINGS = {
  easeOut: 'easeOut',
  easeIn: 'easeIn', 
  easeInOut: 'easeInOut',
  bounce: 'anticipate',
  spring: 'backOut'
} as const;

// Intersection Observer thresholds
export const INTERSECTION_THRESHOLDS = {
  minimal: 0.1,
  quarter: 0.25,
  half: 0.5,
  full: 1.0
} as const;

// Animation distances for entrance effects
export const ANIMATION_DISTANCES = {
  small: 20,
  medium: 40,
  large: 60
} as const;

// Stagger delays for sequential animations
export const STAGGER_DELAYS = {
  fast: 0.05,
  normal: 0.1,
  slow: 0.2
} as const;

// Hover animation scales
export const HOVER_SCALES = {
  subtle: 1.02,
  normal: 1.05,
  prominent: 1.1
} as const;

// Shadow intensities for hover effects
export const SHADOW_INTENSITIES = {
  subtle: '0 4px 12px rgba(0, 0, 0, 0.1)',
  normal: '0 8px 25px rgba(0, 0, 0, 0.15)',
  prominent: '0 12px 40px rgba(0, 0, 0, 0.2)'
} as const;