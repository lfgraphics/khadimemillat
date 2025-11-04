'use client';

import React from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { 
  useReducedMotion, 
  useAnimationPerformance, 
  shouldDisableAnimations,
  HOVER_SCALES,
  ANIMATION_DURATIONS
} from '@/lib/animations';

interface AnimatedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Scale factor on hover
   */
  hoverScale?: number;
  /**
   * Scale factor on click/tap
   */
  clickScale?: number;
  /**
   * Whether to add color transition on hover
   */
  colorTransition?: boolean;
  /**
   * Custom hover duration
   */
  hoverDuration?: number;
  /**
   * Whether to add tap feedback on mobile
   */
  tapFeedback?: boolean;
  /**
   * Additional motion props
   */
  motionProps?: any;
  /**
   * Button content
   */
  children: React.ReactNode;
}

/**
 * AnimatedButton component with hover scale and color transition effects
 * Provides smooth hover animations with press feedback and accessibility support
 */
export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  children,
  className,
  hoverScale = HOVER_SCALES.subtle,
  clickScale = 0.95,
  colorTransition = true,
  hoverDuration = ANIMATION_DURATIONS.fast,
  tapFeedback = true,
  motionProps = {},
  ...props
}) => {
  const prefersReducedMotion = useReducedMotion();
  const canAnimate = useAnimationPerformance();
  const disableAnimations = shouldDisableAnimations(prefersReducedMotion, canAnimate);

  // Animation variants
  const buttonVariants = {
    initial: {
      scale: 1,
    },
    hover: {
      scale: hoverScale,
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

  // If animations are disabled, render regular button with CSS transitions
  if (disableAnimations) {
    return (
      <button 
        className={cn(
          'transition-all duration-200',
          colorTransition && 'hoact:brightness-110',
          className
        )} 
        {...props}
      >
        {children}
      </button>
    );
  }

  return (
    <motion.button
      className={cn(className)}
      variants={buttonVariants}
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
    </motion.button>
  );
};

export default AnimatedButton;