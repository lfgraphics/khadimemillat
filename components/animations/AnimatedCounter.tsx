'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, useSpring, useTransform } from 'motion/react';
import { cn } from '@/lib/utils';
import { 
  useReducedMotion, 
  useAnimationPerformance, 
  useIntersectionObserver,
  shouldDisableAnimations,
  INTERSECTION_THRESHOLDS,
  ANIMATION_DURATIONS
} from '@/lib/animations';
import type { CounterAnimationProps } from '@/types/animations';

interface AnimatedCounterProps extends CounterAnimationProps {
  /**
   * Starting number for the animation
   */
  from?: number;
  /**
   * Target number to animate to
   */
  to: number;
  /**
   * Animation duration in seconds
   */
  duration?: number;
  /**
   * Delay before starting animation
   */
  delay?: number;
  /**
   * Prefix text (e.g., "$", "+")
   */
  prefix?: string;
  /**
   * Suffix text (e.g., "%", "K", "M")
   */
  suffix?: string;
  /**
   * Whether to format large numbers (e.g., 1000 -> 1K)
   */
  formatLargeNumbers?: boolean;
  /**
   * Decimal places to show
   */
  decimalPlaces?: number;
  /**
   * Whether to trigger animation only once
   */
  triggerOnce?: boolean;
  /**
   * Intersection threshold for triggering animation
   */
  threshold?: number;
  /**
   * Whether to use stagger delay (for multiple counters)
   */
  staggerIndex?: number;
  /**
   * Base stagger delay amount
   */
  staggerDelay?: number;
}

/**
 * AnimatedCounter component with viewport detection and smooth counting animation
 * Supports staggered animations for multiple counters and accessibility compliance
 */
export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  from = 0,
  to,
  duration = ANIMATION_DURATIONS.counter,
  delay = 0,
  prefix = '',
  suffix = '',
  formatLargeNumbers = false,
  decimalPlaces = 0,
  triggerOnce = true,
  threshold = INTERSECTION_THRESHOLDS.half,
  staggerIndex = 0,
  staggerDelay = 0.1,
  className,
  ...props
}) => {
  const prefersReducedMotion = useReducedMotion();
  const canAnimate = useAnimationPerformance();
  const disableAnimations = shouldDisableAnimations(prefersReducedMotion, canAnimate);
  
  const [hasTriggered, setHasTriggered] = useState(false);
  const countRef = useRef<HTMLSpanElement>(null);

  // Set up intersection observer
  const [intersectionRef, isIntersecting] = useIntersectionObserver({
    threshold,
    triggerOnce
  });

  // Calculate total delay including stagger
  const totalDelay = delay + (staggerIndex * staggerDelay);

  // Spring animation for smooth counting
  const spring = useSpring(from, {
    damping: 25,
    stiffness: 100,
    duration: duration * 1000 // Convert to milliseconds
  });

  // Transform spring value to display value
  const display = useTransform(spring, (value) => {
    const rounded = parseFloat(value.toFixed(decimalPlaces));
    return formatNumber(rounded, formatLargeNumbers);
  });

  // Format number for display
  const formatNumber = (num: number, format: boolean): string => {
    if (!format) return num.toFixed(decimalPlaces);
    
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toFixed(decimalPlaces);
  };

  // Trigger animation when in view
  useEffect(() => {
    if (isIntersecting && !hasTriggered) {
      if (disableAnimations) {
        // If animations are disabled, show final value immediately
        spring.set(to);
        setHasTriggered(true);
        return;
      }

      // Start animation with delay
      const timer = setTimeout(() => {
        spring.set(to);
        setHasTriggered(true);
      }, totalDelay * 1000);

      return () => clearTimeout(timer);
    }
  }, [isIntersecting, hasTriggered, spring, to, totalDelay, disableAnimations]);

  // If animations are disabled, show final value
  if (disableAnimations) {
    return (
      <span ref={intersectionRef as any} className={cn(className)} {...props}>
        {prefix}{formatNumber(to, formatLargeNumbers)}{suffix}
      </span>
    );
  }

  return (
    <span ref={intersectionRef as any} className={cn(className)} {...props}>
      {prefix}
      <motion.span ref={countRef}>
        {display}
      </motion.span>
      {suffix}
    </span>
  );
};

/**
 * AnimatedCounterGroup component for managing multiple counters with staggered animations
 */
interface AnimatedCounterGroupProps {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
}

export const AnimatedCounterGroup: React.FC<AnimatedCounterGroupProps> = ({
  children,
  className,
  staggerDelay = 0.1
}) => {
  return (
    <div className={cn(className)}>
      {React.Children.map(children, (child, index) => {
        if (React.isValidElement(child) && child.type === AnimatedCounter) {
          const childProps = child.props as AnimatedCounterProps;
          return React.cloneElement(child as React.ReactElement<AnimatedCounterProps>, {
            ...childProps,
            staggerIndex: index,
            staggerDelay
          });
        }
        return child;
      })}
    </div>
  );
};

export default AnimatedCounter;