'use client';

import React from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { 
  useReducedMotion, 
  useAnimationPerformance, 
  shouldDisableAnimations,
  HOVER_SCALES,
  SHADOW_INTENSITIES,
  ANIMATION_DURATIONS
} from '@/lib/animations';
import type { CardAnimationProps } from '@/types/animations';

interface AnimatedCardProps extends CardAnimationProps {
  /**
   * Whether to apply shadow animation on hover
   */
  hoverShadow?: boolean;
  /**
   * Scale factor on hover
   */
  hoverScale?: number;
  /**
   * Scale factor on click/tap
   */
  clickScale?: number;
  /**
   * Custom shadow intensity
   */
  shadowIntensity?: 'subtle' | 'normal' | 'prominent';
  /**
   * Whether to add tap feedback on mobile
   */
  tapFeedback?: boolean;
  /**
   * Custom hover duration
   */
  hoverDuration?: number;
  /**
   * Additional props to pass to motion.div
   */
  motionProps?: any;
}

/**
 * AnimatedCard component with hover lift effects and mobile touch feedback
 * Provides smooth hover animations with shadow effects and accessibility support
 */
export const AnimatedCard: React.FC<AnimatedCardProps> = ({
  children,
  className,
  hoverScale = HOVER_SCALES.normal,
  hoverShadow = true,
  clickScale = 0.98,
  shadowIntensity = 'normal',
  tapFeedback = true,
  hoverDuration = ANIMATION_DURATIONS.fast,
  motionProps = {},
  ...props
}) => {
  const prefersReducedMotion = useReducedMotion();
  const canAnimate = useAnimationPerformance();
  const disableAnimations = shouldDisableAnimations(prefersReducedMotion, canAnimate);

  // Animation variants
  const cardVariants = {
    initial: {
      scale: 1,
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
    },
    hover: {
      scale: hoverScale,
      boxShadow: hoverShadow ? SHADOW_INTENSITIES[shadowIntensity] : '0 1px 3px rgba(0, 0, 0, 0.1)',
      transition: {
        duration: hoverDuration,
        ease: 'easeOut'
      }
    },
    tap: {
      scale: clickScale,
      transition: {
        duration: 0.1,
        ease: 'easeInOut'
      }
    }
  };

  // If animations are disabled, render without motion
  if (disableAnimations) {
    return (
      <div 
        className={cn(
          'transition-shadow duration-200',
          hoverShadow && 'hover:shadow-lg',
          className
        )} 
        {...props}
      >
        {children}
      </div>
    );
  }

  return (
    <motion.div
      className={cn(className)}
      variants={cardVariants}
      initial="initial"
      whileHover="hover"
      whileTap={tapFeedback ? "tap" : undefined}
      style={{
        transformOrigin: 'center center'
      }}
      {...motionProps}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export default AnimatedCard;