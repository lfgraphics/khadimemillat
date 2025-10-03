/**
 * Performance optimization utilities for animations
 * Provides dynamic animation adjustment based on device capabilities
 */

import { ANIMATION_DURATIONS, STAGGER_DELAYS } from '@/lib/constants/animations';

export interface PerformanceLevel {
  level: 'high' | 'medium' | 'low' | 'minimal';
  score: number;
  canAnimate: boolean;
  optimizations: {
    reduceDuration: boolean;
    reduceStagger: boolean;
    simplifyAnimations: boolean;
    disableHoverEffects: boolean;
    disableParallax: boolean;
    limitConcurrentAnimations: boolean;
  };
}

/**
 * Determines performance level based on score
 */
export const getPerformanceLevel = (score: number): PerformanceLevel => {
  if (score >= 80) {
    return {
      level: 'high',
      score,
      canAnimate: true,
      optimizations: {
        reduceDuration: false,
        reduceStagger: false,
        simplifyAnimations: false,
        disableHoverEffects: false,
        disableParallax: false,
        limitConcurrentAnimations: false
      }
    };
  }
  
  if (score >= 60) {
    return {
      level: 'medium',
      score,
      canAnimate: true,
      optimizations: {
        reduceDuration: true,
        reduceStagger: true,
        simplifyAnimations: false,
        disableHoverEffects: false,
        disableParallax: true,
        limitConcurrentAnimations: false
      }
    };
  }
  
  if (score >= 40) {
    return {
      level: 'low',
      score,
      canAnimate: true,
      optimizations: {
        reduceDuration: true,
        reduceStagger: true,
        simplifyAnimations: true,
        disableHoverEffects: true,
        disableParallax: true,
        limitConcurrentAnimations: true
      }
    };
  }
  
  return {
    level: 'minimal',
    score,
    canAnimate: false,
    optimizations: {
      reduceDuration: true,
      reduceStagger: true,
      simplifyAnimations: true,
      disableHoverEffects: true,
      disableParallax: true,
      limitConcurrentAnimations: true
    }
  };
};

/**
 * Optimizes animation duration based on performance level
 */
export const getOptimizedDuration = (
  baseDuration: number,
  performanceLevel: PerformanceLevel
): number => {
  if (!performanceLevel.canAnimate) return 0;
  
  if (performanceLevel.optimizations.reduceDuration) {
    return baseDuration * 0.7; // Reduce by 30%
  }
  
  return baseDuration;
};

/**
 * Optimizes stagger delay based on performance level
 */
export const getOptimizedStaggerDelay = (
  baseStagger: number,
  performanceLevel: PerformanceLevel
): number => {
  if (!performanceLevel.canAnimate) return 0;
  
  if (performanceLevel.optimizations.reduceStagger) {
    return baseStagger * 0.5; // Reduce by 50%
  }
  
  return baseStagger;
};

/**
 * Creates optimized animation configuration based on performance
 */
export const createOptimizedAnimationConfig = (
  performanceScore: number,
  baseConfig: {
    duration?: number;
    staggerDelay?: number;
    enableHoverEffects?: boolean;
    enableComplexAnimations?: boolean;
  } = {}
) => {
  const performanceLevel = getPerformanceLevel(performanceScore);
  
  return {
    duration: getOptimizedDuration(
      baseConfig.duration || ANIMATION_DURATIONS.normal,
      performanceLevel
    ),
    staggerDelay: getOptimizedStaggerDelay(
      baseConfig.staggerDelay || STAGGER_DELAYS.normal,
      performanceLevel
    ),
    enableHoverEffects: baseConfig.enableHoverEffects && 
                       !performanceLevel.optimizations.disableHoverEffects,
    enableComplexAnimations: baseConfig.enableComplexAnimations && 
                            !performanceLevel.optimizations.simplifyAnimations,
    canAnimate: performanceLevel.canAnimate,
    performanceLevel: performanceLevel.level
  };
};

/**
 * Animation queue manager for limiting concurrent animations
 */
class AnimationQueue {
  private queue: Array<() => void> = [];
  private running: Set<string> = new Set();
  private maxConcurrent: number = 3;

  constructor(maxConcurrent: number = 3) {
    this.maxConcurrent = maxConcurrent;
  }

  add(id: string, animation: () => void): void {
    if (this.running.size < this.maxConcurrent) {
      this.running.add(id);
      animation();
      
      // Clean up after animation completes (estimated)
      setTimeout(() => {
        this.running.delete(id);
        this.processQueue();
      }, 1000);
    } else {
      this.queue.push(() => {
        this.running.add(id);
        animation();
        setTimeout(() => {
          this.running.delete(id);
          this.processQueue();
        }, 1000);
      });
    }
  }

  private processQueue(): void {
    if (this.queue.length > 0 && this.running.size < this.maxConcurrent) {
      const nextAnimation = this.queue.shift();
      nextAnimation?.();
    }
  }

  setMaxConcurrent(max: number): void {
    this.maxConcurrent = max;
  }

  clear(): void {
    this.queue = [];
    this.running.clear();
  }
}

// Global animation queue instance
export const animationQueue = new AnimationQueue();

/**
 * Hook for managing animation queue based on performance
 */
export const useAnimationQueue = (performanceScore: number) => {
  const performanceLevel = getPerformanceLevel(performanceScore);
  
  // Adjust queue size based on performance
  const maxConcurrent = performanceLevel.optimizations.limitConcurrentAnimations ? 2 : 5;
  animationQueue.setMaxConcurrent(maxConcurrent);
  
  return {
    addAnimation: (id: string, animation: () => void) => {
      if (performanceLevel.canAnimate) {
        animationQueue.add(id, animation);
      }
    },
    canAnimate: performanceLevel.canAnimate,
    performanceLevel: performanceLevel.level
  };
};

/**
 * Utility to check if device supports hardware acceleration
 */
export const supportsHardwareAcceleration = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  
  return !!gl;
};

/**
 * Applies performance-based CSS optimizations
 */
export const applyPerformanceOptimizations = (
  element: HTMLElement,
  performanceLevel: PerformanceLevel
): void => {
  if (!element) return;
  
  // Enable hardware acceleration for better performance
  if (supportsHardwareAcceleration() && performanceLevel.level !== 'minimal') {
    element.style.transform = element.style.transform || 'translateZ(0)';
    element.style.willChange = 'transform, opacity';
  }
  
  // Disable complex effects on low-end devices
  if (performanceLevel.optimizations.simplifyAnimations) {
    element.style.filter = 'none';
    element.style.backdropFilter = 'none';
  }
  
  // Cleanup will-change after animation
  const cleanup = () => {
    element.style.willChange = 'auto';
  };
  
  // Clean up after estimated animation duration
  setTimeout(cleanup, 2000);
};