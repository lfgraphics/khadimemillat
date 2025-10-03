'use client';

import React from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { 
  useReducedMotion, 
  useAnimationPerformance, 
  useIntersectionObserver,
  shouldDisableAnimations,
  INTERSECTION_THRESHOLDS,
  ANIMATION_DURATIONS,
  ANIMATION_EASINGS,
  HOVER_SCALES,
  SHADOW_INTENSITIES
} from '@/lib/animations';

interface ContactMethod {
  id: string;
  icon: React.ReactNode;
  title: string;
  content: React.ReactNode;
  testId?: string;
}

interface AnimatedContactSectionProps {
  /**
   * Contact methods to display
   */
  contactMethods: ContactMethod[];
  /**
   * Section title
   */
  title: string;
  /**
   * Section description
   */
  description: string;
  /**
   * Animation delay for entrance
   */
  delay?: number;
  /**
   * Animation duration
   */
  duration?: number;
  /**
   * Stagger delay between contact cards
   */
  staggerDelay?: number;
  /**
   * Intersection threshold
   */
  threshold?: number;
  /**
   * Whether to trigger animation only once
   */
  triggerOnce?: boolean;
  /**
   * Enable hover effects for contact cards
   */
  enableHoverEffects?: boolean;
  /**
   * Enable icon pulse animation on hover
   */
  enableIconPulse?: boolean;
  /**
   * Custom class name
   */
  className?: string;
  /**
   * Test ID for the section
   */
  testId?: string;
}

/**
 * AnimatedContactSection component with entrance animations and interactive contact cards
 * Implements fade-in animations for title/description and staggered card animations
 */
export const AnimatedContactSection: React.FC<AnimatedContactSectionProps> = ({
  contactMethods,
  title,
  description,
  delay = 0.1,
  duration = 0.6,
  staggerDelay = 0.2,
  threshold = INTERSECTION_THRESHOLDS.quarter,
  triggerOnce = true,
  enableHoverEffects = true,
  enableIconPulse = true,
  className,
  testId
}) => {
  const prefersReducedMotion = useReducedMotion();
  const canAnimate = useAnimationPerformance();
  const disableAnimations = shouldDisableAnimations(prefersReducedMotion, canAnimate);

  // Set up intersection observer
  const [intersectionRef, isIntersecting] = useIntersectionObserver({
    threshold,
    triggerOnce
  });

  // Animation variants for section header
  const headerVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration, 
        ease: ANIMATION_EASINGS.easeOut,
        delay 
      }
    }
  };

  // Animation variants for contact cards container
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: delay + 0.3
      }
    }
  };

  // Animation variants for individual contact cards
  const cardVariants = {
    hidden: { 
      opacity: 0, 
      y: 40,
      scale: 0.95
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: { 
        duration, 
        ease: ANIMATION_EASINGS.easeOut
      }
    }
  };

  // Hover variants for contact cards
  const cardHoverVariants = {
    initial: {
      scale: 1,
      y: 0,
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
    },
    hover: {
      scale: HOVER_SCALES.subtle,
      y: -4,
      boxShadow: SHADOW_INTENSITIES.normal,
      transition: {
        duration: ANIMATION_DURATIONS.fast,
        ease: ANIMATION_EASINGS.easeOut
      }
    }
  };

  // Icon pulse variants
  const iconPulseVariants = {
    initial: { scale: 1 },
    hover: {
      scale: [1, 1.1, 1],
      transition: {
        duration: 0.6,
        ease: ANIMATION_EASINGS.easeInOut,
        repeat: Infinity,
        repeatDelay: 0.5
      }
    }
  };

  // If animations are disabled, render static version
  if (disableAnimations) {
    return (
      <div ref={intersectionRef as any} className={cn(className)} data-testid={testId}>
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {title}
          </h2>
          <p className="text-lg text-muted-foreground">
            {description}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {contactMethods.map((method) => (
            <div 
              key={method.id} 
              className="text-center hover:shadow-lg transition-shadow duration-200" 
              data-testid={method.testId}
            >
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                {method.icon}
              </div>
              <h3 className="font-semibold mb-2">{method.title}</h3>
              <div className="text-muted-foreground">{method.content}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      ref={intersectionRef as any}
      className={cn(className)}
      data-testid={testId}
    >
      {/* Animated Header */}
      <motion.div
        className="text-center mb-12"
        variants={headerVariants}
        initial="hidden"
        animate={isIntersecting ? "visible" : "hidden"}
      >
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
          {title}
        </h2>
        <p className="text-lg text-muted-foreground">
          {description}
        </p>
      </motion.div>

      {/* Animated Contact Cards */}
      <motion.div
        className="grid md:grid-cols-3 gap-8"
        variants={containerVariants}
        initial="hidden"
        animate={isIntersecting ? "visible" : "hidden"}
      >
        {contactMethods.map((method) => (
          <motion.div
            key={method.id}
            className="text-center"
            variants={cardVariants}
            data-testid={method.testId}
          >
            <motion.div
              className="text-center"
              variants={enableHoverEffects ? cardHoverVariants : undefined}
              initial="initial"
              whileHover={enableHoverEffects ? "hover" : undefined}
            >
              <motion.div 
                className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4"
                variants={enableIconPulse ? iconPulseVariants : undefined}
                initial="initial"
                whileHover={enableIconPulse ? "hover" : undefined}
              >
                {method.icon}
              </motion.div>
              <h3 className="font-semibold mb-2">{method.title}</h3>
              <div className="text-muted-foreground">{method.content}</div>
            </motion.div>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
};

export default AnimatedContactSection;