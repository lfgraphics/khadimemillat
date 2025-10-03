'use client';

import React from 'react';
import { motion, Variants } from 'motion/react';
import { cn } from '@/lib/utils';
import { 
  useReducedMotion, 
  useAnimationPerformance, 
  useIntersectionObserver,
  shouldDisableAnimations,
  createEntranceVariant,
  createStaggerVariant,
  ANIMATION_DURATIONS,
  ANIMATION_EASINGS,
  STAGGER_DELAYS,
  INTERSECTION_THRESHOLDS
} from '@/lib/animations';
import { AnimatedCard } from './AnimatedCard';

interface ProgramCard {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  stats: {
    icon: React.ReactNode;
    text: string;
  };
  testId?: string;
  className?: string;
}

interface AnimatedProgramCardsProps {
  /**
   * Array of program cards to display
   */
  cards: ProgramCard[];
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Animation delay
   */
  delay?: number;
  /**
   * Animation duration
   */
  duration?: number;
  /**
   * Intersection threshold
   */
  threshold?: number;
  /**
   * Whether to trigger animation only once
   */
  triggerOnce?: boolean;
  /**
   * Grid layout configuration
   */
  gridCols?: 'auto' | 1 | 2 | 3 | 4;
  /**
   * Stagger delay between card animations
   */
  staggerDelay?: number;
  /**
   * Whether to enable hover effects on cards
   */
  enableHoverEffects?: boolean;
  /**
   * Hover scale factor for cards
   */
  hoverScale?: number;
  /**
   * Whether to enable icon scale animations within cards
   */
  enableIconAnimations?: boolean;
  /**
   * Icon scale factor on hover
   */
  iconHoverScale?: number;
}

/**
 * AnimatedProgramCards component with staggered entrance animations and enhanced hover effects
 * Implements slide-up animations for cards grid with fade-in effects for card content
 */
export const AnimatedProgramCards: React.FC<AnimatedProgramCardsProps> = ({
  cards,
  className,
  delay = 0.2,
  duration = ANIMATION_DURATIONS.normal,
  threshold = INTERSECTION_THRESHOLDS.quarter,
  triggerOnce = true,
  gridCols = 'auto',
  staggerDelay = STAGGER_DELAYS.normal,
  enableHoverEffects = true,
  hoverScale = 1.02,
  enableIconAnimations = true,
  iconHoverScale = 1.1,
  ...props
}) => {
  const prefersReducedMotion = useReducedMotion();
  const canAnimate = useAnimationPerformance();
  const disableAnimations = shouldDisableAnimations(prefersReducedMotion, canAnimate);

  const [ref, isIntersecting] = useIntersectionObserver<HTMLDivElement>({
    threshold,
    triggerOnce,
    rootMargin: '50px'
  });

  // Grid class mapping
  const gridClasses = {
    auto: 'md:grid-cols-2 lg:grid-cols-3',
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4'
  };

  // Animation variants
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: delay
      }
    }
  };

  const cardVariants: Variants = {
    hidden: { opacity: 0, y: 60 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration, ease: 'easeOut' }
    }
  };

  const iconVariants: Variants = {
    initial: { scale: 1 },
    hover: { 
      scale: iconHoverScale,
      transition: {
        duration: ANIMATION_DURATIONS.fast,
        ease: 'easeOut'
      }
    }
  };

  // If animations are disabled, render static version
  if (disableAnimations) {
    return (
      <div 
        ref={ref}
        className={cn('grid gap-8', gridClasses[gridCols], className)}
        {...props}
      >
        {cards.map((card) => (
          <div
            key={card.id}
            className={cn(
              'overflow-hidden transition-shadow duration-200',
              enableHoverEffects && 'hover:shadow-lg',
              card.className
            )}
            data-testid={card.testId}
          >
            <div className="p-6">
              <div className={cn(
                "w-full h-48 rounded-lg mb-4 flex items-center justify-center",
                card.className
              )}>
                {card.icon}
              </div>
              <h3 className="text-xl font-semibold mb-3">{card.title}</h3>
              <p className="text-muted-foreground mb-4">{card.description}</p>
              <div className="flex items-center text-sm text-primary">
                {card.stats.icon}
                <span>{card.stats.text}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <motion.div
      ref={ref}
      className={cn('grid gap-8', gridClasses[gridCols], className)}
      variants={containerVariants}
      initial="hidden"
      animate={isIntersecting ? "visible" : "hidden"}
      {...props}
    >
      {cards.map((card) => (
        <motion.div
          key={card.id}
          variants={cardVariants}
          data-testid={card.testId}
        >
          <AnimatedCard
            className={cn('overflow-hidden', card.className)}
            hoverScale={enableHoverEffects ? hoverScale : 1}
            hoverShadow={enableHoverEffects}
            shadowIntensity="prominent"
            hoverDuration={ANIMATION_DURATIONS.normal}
          >
            <div className="p-6">
              <div className={cn(
                "w-full h-48 rounded-lg mb-4 flex items-center justify-center",
                card.className
              )}>
                <motion.div
                  variants={enableIconAnimations ? iconVariants : undefined}
                  whileHover={enableIconAnimations ? "hover" : undefined}
                >
                  {card.icon}
                </motion.div>
              </div>
              <h3 className="text-xl font-semibold mb-3">{card.title}</h3>
              <p className="text-muted-foreground mb-4">{card.description}</p>
              <div className="flex items-center text-sm text-primary">
                {card.stats.icon}
                <span>{card.stats.text}</span>
              </div>
            </div>
          </AnimatedCard>
        </motion.div>
      ))}
    </motion.div>
  );
};

export default AnimatedProgramCards;