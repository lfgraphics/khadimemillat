/**
 * Accessibility utilities for animations
 * Ensures all animations respect user preferences and accessibility guidelines
 */

import { useReducedMotion, useAnimationPerformance } from '@/lib/animations';

/**
 * Hook that provides comprehensive accessibility state for animations
 */
export const useAnimationAccessibility = () => {
  const prefersReducedMotion = useReducedMotion();
  const canAnimate = useAnimationPerformance();
  
  return {
    prefersReducedMotion,
    canAnimate,
    shouldDisableAnimations: prefersReducedMotion || !canAnimate,
    shouldUseReducedAnimations: prefersReducedMotion && canAnimate,
    isFullyAccessible: !prefersReducedMotion && canAnimate
  };
};

/**
 * Creates animation props that respect accessibility preferences
 */
export const createAccessibleAnimationProps = (
  baseProps: any,
  fallbackProps: any = {},
  shouldDisableAnimations: boolean = false
) => {
  if (shouldDisableAnimations) {
    return {
      ...fallbackProps,
      // Ensure no motion properties are applied
      initial: undefined,
      animate: undefined,
      variants: undefined,
      transition: { duration: 0 },
      whileHover: undefined,
      whileTap: undefined,
      whileInView: undefined
    };
  }
  
  return baseProps;
};

/**
 * Validates that an animation component properly handles reduced motion
 */
export const validateAnimationAccessibility = (
  componentName: string,
  hasReducedMotionSupport: boolean,
  hasPerformanceOptimization: boolean,
  hasFallbackRendering: boolean
): { isValid: boolean; issues: string[] } => {
  const issues: string[] = [];
  
  if (!hasReducedMotionSupport) {
    issues.push(`${componentName} does not respect prefers-reduced-motion`);
  }
  
  if (!hasPerformanceOptimization) {
    issues.push(`${componentName} does not optimize for low-performance devices`);
  }
  
  if (!hasFallbackRendering) {
    issues.push(`${componentName} does not provide fallback rendering when animations are disabled`);
  }
  
  return {
    isValid: issues.length === 0,
    issues
  };
};

/**
 * Utility to announce animation state changes to screen readers
 */
export const announceAnimationState = (
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
) => {
  if (typeof window === 'undefined') return;
  
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
};

/**
 * Checks if the current environment supports animations
 */
export const supportsAnimations = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // Check for CSS animation support
  const testElement = document.createElement('div');
  const animationSupport = 'animation' in testElement.style || 
                          'webkitAnimation' in testElement.style ||
                          'mozAnimation' in testElement.style;
  
  return animationSupport;
};

/**
 * Gets the user's motion preferences from various sources
 */
export const getMotionPreferences = () => {
  if (typeof window === 'undefined') {
    return {
      prefersReducedMotion: false,
      prefersReducedData: false,
      prefersReducedTransparency: false
    };
  }
  
  return {
    prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    prefersReducedData: window.matchMedia('(prefers-reduced-data: reduce)').matches,
    prefersReducedTransparency: window.matchMedia('(prefers-reduced-transparency: reduce)').matches
  };
};

/**
 * Generates accessible aria-label for UI elements
 */
export const generateAriaLabel = (
  element: string,
  context?: string,
  state?: string,
  action?: string
): string => {
  let label = element;
  
  if (context) {
    label += ` in ${context}`;
  }
  
  if (state) {
    label += `, ${state}`;
  }
  
  if (action) {
    label += `. ${action}`;
  }
  
  return label;
};

/**
 * Keyboard navigation utilities
 */
export const keyboardNavigation = {
  /**
   * Handle keyboard navigation for interactive elements
   */
  handleKeyDown: (
    event: React.KeyboardEvent,
    onEnter?: () => void,
    onSpace?: () => void,
    onEscape?: () => void,
    onArrowUp?: () => void,
    onArrowDown?: () => void,
    onArrowLeft?: () => void,
    onArrowRight?: () => void
  ) => {
    switch (event.key) {
      case 'Enter':
        if (onEnter) {
          event.preventDefault();
          onEnter();
        }
        break;
      case ' ':
        if (onSpace) {
          event.preventDefault();
          onSpace();
        }
        break;
      case 'Escape':
        if (onEscape) {
          event.preventDefault();
          onEscape();
        }
        break;
      case 'ArrowUp':
        if (onArrowUp) {
          event.preventDefault();
          onArrowUp();
        }
        break;
      case 'ArrowDown':
        if (onArrowDown) {
          event.preventDefault();
          onArrowDown();
        }
        break;
      case 'ArrowLeft':
        if (onArrowLeft) {
          event.preventDefault();
          onArrowLeft();
        }
        break;
      case 'ArrowRight':
        if (onArrowRight) {
          event.preventDefault();
          onArrowRight();
        }
        break;
    }
  },

  /**
   * Focus management utilities
   */
  focusElement: (selector: string) => {
    const element = document.querySelector(selector) as HTMLElement;
    if (element) {
      element.focus();
    }
  },

  /**
   * Trap focus within a container
   */
  trapFocus: (container: HTMLElement) => {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);
    
    // Return cleanup function
    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  }
};