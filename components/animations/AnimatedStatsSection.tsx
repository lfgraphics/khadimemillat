'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { CountingNumber } from '@/components/ui/shadcn-io/counting-number';
import { 
  useReducedMotion, 
  useAnimationPerformance, 
  useIntersectionObserver,
  shouldDisableAnimations,
  INTERSECTION_THRESHOLDS,
  ANIMATION_DURATIONS,
  ANIMATION_EASINGS,
  STAGGER_DELAYS
} from '@/lib/animations';

interface StatItem {
  number: number;
  label: string;
  testId?: string;
}

interface AnimatedStatsSectionProps {
  stats: StatItem[];
  className?: string;
  threshold?: number;
  triggerOnce?: boolean;
  counterDuration?: number;
  simultaneousStart?: boolean;
  enableEntranceAnimations?: boolean;
  staggerDelay?: number;
}

/**
 * AnimatedStatsSection component that triggers all counter animations simultaneously
 * when the section comes into view, with entrance animations for labels and layout
 */
export const AnimatedStatsSection: React.FC<AnimatedStatsSectionProps> = ({
  stats,
  className,
  threshold = INTERSECTION_THRESHOLDS.half,
  triggerOnce = true,
  counterDuration = ANIMATION_DURATIONS.counter,
  simultaneousStart = true,
  enableEntranceAnimations = true,
  staggerDelay = STAGGER_DELAYS.fast
}) => {
  const prefersReducedMotion = useReducedMotion();
  const canAnimate = useAnimationPerformance();
  const disableAnimations = shouldDisableAnimations(prefersReducedMotion, canAnimate);
  
  const [shouldStartCounters, setShouldStartCounters] = useState(false);
  
  // Set up intersection observer for the entire stats section
  const [intersectionRef, isIntersecting] = useIntersectionObserver({
    threshold,
    triggerOnce
  });

  // Trigger counter animations when section comes into view
  useEffect(() => {
    if (isIntersecting && !shouldStartCounters) {
      if (disableAnimations) {
        // If animations are disabled, show counters immediately
        setShouldStartCounters(true);
        return;
      }

      // Start all counters simultaneously
      setShouldStartCounters(true);
    }
  }, [isIntersecting, shouldStartCounters, disableAnimations]);

  // Animation variants for the stats grid
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: ANIMATION_DURATIONS.normal,
        staggerChildren: enableEntranceAnimations ? staggerDelay : 0,
        delayChildren: 0.1
      }
    }
  };

  // Animation variants for individual stat items
  const itemVariants = {
    hidden: { 
      opacity: 0, 
      y: 20,
      scale: 0.95
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: ANIMATION_DURATIONS.normal
      }
    }
  };

  // Animation variants for stat labels
  const labelVariants = {
    hidden: { 
      opacity: 0, 
      y: 10
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: ANIMATION_DURATIONS.normal,
        delay: 0.2 // Slight delay after the number appears
      }
    }
  };

  // If animations are disabled, render without motion components
  if (disableAnimations) {
    return (
      <div 
        ref={intersectionRef as any}
        className={cn("grid grid-cols-2 md:grid-cols-4 gap-8", className)}
      >
        {stats.map((stat, index) => (
          <div 
            key={index} 
            className="text-center" 
            data-testid={stat.testId}
          >
            <div className="text-3xl md:text-4xl font-bold text-primary mb-2">
              <CountingNumber 
                number={stat.number}
                fromNumber={0}
                inView={false}
                transition={{
                  stiffness: 90,
                  damping: 50,
                  duration: counterDuration * 1000
                }}
              />
            </div>
            <div className="text-muted-foreground">{stat.label}</div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <motion.div 
      ref={intersectionRef as any}
      className={cn("grid grid-cols-2 md:grid-cols-4 gap-8", className)}
      variants={enableEntranceAnimations ? containerVariants : undefined}
      initial={enableEntranceAnimations ? "hidden" : undefined}
      animate={isIntersecting && enableEntranceAnimations ? "visible" : undefined}
    >
      {stats.map((stat, index) => (
        <motion.div 
          key={index} 
          className="text-center" 
          data-testid={stat.testId}
          variants={enableEntranceAnimations ? itemVariants : undefined}
        >
          <motion.div 
            className="text-3xl md:text-4xl font-bold text-primary mb-2"
            variants={enableEntranceAnimations ? itemVariants : undefined}
          >
            {shouldStartCounters ? (
              <CountingNumber 
                number={stat.number}
                fromNumber={0}
                inView={false} // We control the trigger manually
                transition={{
                  stiffness: 90,
                  damping: 50,
                  duration: counterDuration * 1000
                }}
              />
            ) : (
              <span>0</span>
            )}
          </motion.div>
          <motion.div 
            className="text-muted-foreground"
            variants={enableEntranceAnimations ? labelVariants : undefined}
          >
            {stat.label}
          </motion.div>
        </motion.div>
      ))}
    </motion.div>
  );
};

export default AnimatedStatsSection;