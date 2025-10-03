'use client';

import React from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { 
  useReducedMotion, 
  useAnimationPerformance, 
  useIntersectionObserver,
  createStaggerVariant,
  shouldDisableAnimations,
  INTERSECTION_THRESHOLDS,
  STAGGER_DELAYS
} from '@/lib/animations';

interface ProcessStep {
  icon: React.ReactNode;
  title: string;
  description: string;
  testId?: string;
}

interface AnimatedProcessStepsProps {
  /**
   * Array of process steps to animate
   */
  steps: ProcessStep[];
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Animation delay before starting
   */
  delay?: number;
  /**
   * Duration of each step animation
   */
  duration?: number;
  /**
   * Delay between each step animation
   */
  staggerDelay?: number;
  /**
   * Intersection threshold for triggering animation
   */
  threshold?: number;
  /**
   * Whether to trigger animation only once
   */
  triggerOnce?: boolean;
  /**
   * Root margin for intersection observer
   */
  rootMargin?: string;
}

/**
 * AnimatedProcessSteps component with staggered entrance animations
 * Implements slide-up animations with sequential delays and enhanced icon interactions
 */
export const AnimatedProcessSteps: React.FC<AnimatedProcessStepsProps> = ({
  steps,
  className,
  delay = 0.2,
  duration = 0.6,
  staggerDelay = STAGGER_DELAYS.normal,
  threshold = INTERSECTION_THRESHOLDS.quarter,
  triggerOnce = true,
  rootMargin = '0px 0px -10% 0px'
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

  // Create stagger container variant
  const containerVariant = createStaggerVariant(staggerDelay, delay);

  // Individual step animation variant
  const stepVariant = {
    hidden: { 
      opacity: 0, 
      y: 60,
      scale: 0.95
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: { 
        duration,
        ease: [0.25, 0.46, 0.45, 0.94]
      }
    }
  };

  // Icon hover animation variants
  const iconVariant = {
    rest: { 
      scale: 1,
      rotate: 0,
      transition: { duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }
    },
    hover: { 
      scale: 1.1,
      rotate: disableAnimations ? 0 : 5,
      transition: { 
        duration: 0.3, 
        type: 'spring',
        stiffness: 400,
        damping: 10
      }
    },
    tap: {
      scale: 0.95,
      transition: { duration: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }
    }
  };

  // If animations are disabled, render static version
  if (disableAnimations) {
    return (
      <div ref={intersectionRef as any} className={cn("grid md:grid-cols-3 gap-8", className)}>
        {steps.map((step, index) => (
          <div key={index} className="text-center group" data-testid={step.testId}>
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-primary/20 transition-colors">
              {step.icon}
            </div>
            <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
            <p className="text-muted-foreground">{step.description}</p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <motion.div
      ref={intersectionRef as any}
      className={cn("grid md:grid-cols-3 gap-8", className)}
      initial="hidden"
      animate={isIntersecting ? "visible" : "hidden"}
      variants={containerVariant as any}
    >
      {steps.map((step, index) => (
        <motion.div
          key={index}
          className="text-center"
          variants={stepVariant as any}
          data-testid={step.testId}
        >
          <motion.div
            className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 cursor-pointer"
            variants={iconVariant as any}
            initial="rest"
            whileHover="hover"
            whileTap="tap"
          >
            {step.icon}
          </motion.div>
          <motion.h3 
            className="text-xl font-semibold mb-3"
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { 
                opacity: 1, 
                y: 0,
                transition: { duration: duration * 0.8, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }
              }
            }}
          >
            {step.title}
          </motion.h3>
          <motion.p 
            className="text-muted-foreground"
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { 
                opacity: 1, 
                y: 0,
                transition: { duration: duration * 0.8, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }
              }
            }}
          >
            {step.description}
          </motion.p>
        </motion.div>
      ))}
    </motion.div>
  );
};

export default AnimatedProcessSteps;