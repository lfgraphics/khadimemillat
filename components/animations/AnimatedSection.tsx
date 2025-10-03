'use client';

import React from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { 
  useReducedMotion, 
  useAnimationPerformance, 
  useIntersectionObserver,
  createEntranceVariant,
  shouldDisableAnimations,
  INTERSECTION_THRESHOLDS
} from '@/lib/animations';
import type { AnimatedComponentProps } from '@/types/animations';

interface AnimatedSectionProps extends AnimatedComponentProps {
  /**
   * Animation variant type
   */
  variant?: 'fade' | 'slideUp' | 'slideDown' | 'slideLeft' | 'slideRight' | 'scale';
  /**
   * Whether to trigger animation only once
   */
  triggerOnce?: boolean;
  /**
   * Custom threshold for intersection observer
   */
  threshold?: number;
  /**
   * Root margin for intersection observer
   */
  rootMargin?: string;
}

/**
 * AnimatedSection component with viewport-triggered animations
 * Supports multiple entrance animation types with accessibility compliance
 */
export const AnimatedSection: React.FC<AnimatedSectionProps> = ({
  children,
  className,
  delay = 0,
  duration = 0.6,
  direction = 'up',
  variant = 'slideUp',
  threshold = INTERSECTION_THRESHOLDS.quarter,
  triggerOnce = true,
  rootMargin = '0px 0px -10% 0px',
  ...props
}) => {
  const prefersReducedMotion = useReducedMotion();
  const canAnimate = useAnimationPerformance();
  const disableAnimations = shouldDisableAnimations(prefersReducedMotion, canAnimate);

  // Set up intersection observer
  const [intersectionRef, isIntersecting] = useIntersectionObserver({
    threshold,
    rootMargin,
    triggerOnce
  });

  // Create animation variants based on the variant prop
  const getAnimationVariant = () => {
    switch (variant) {
      case 'fade':
        return createEntranceVariant('fade', duration);
      case 'slideUp':
        return createEntranceVariant('up', duration);
      case 'slideDown':
        return createEntranceVariant('down', duration);
      case 'slideLeft':
        return createEntranceVariant('left', duration);
      case 'slideRight':
        return createEntranceVariant('right', duration);
      case 'scale':
        return {
          hidden: { opacity: 0, scale: 0.8 },
          visible: { 
            opacity: 1, 
            scale: 1,
            transition: { duration, ease: 'easeOut', delay }
          }
        };
      default:
        return createEntranceVariant(direction, duration);
    }
  };

  const animationVariant = getAnimationVariant();

  // If animations are disabled, render without motion
  if (disableAnimations) {
    return (
      <div ref={intersectionRef as any} className={className} {...props}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      ref={intersectionRef as any}
      className={cn(className)}
      initial="hidden"
      animate={isIntersecting ? "visible" : "hidden"}
      variants={animationVariant as any}
      transition={{
        delay: delay,
        duration: duration,
        ease: 'easeOut'
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export default AnimatedSection;