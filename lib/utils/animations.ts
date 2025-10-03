/**
 * Animation utilities for enhanced UI interactions
 */

// Animation duration constants
export const ANIMATION_DURATIONS = {
  fast: 150,
  normal: 200,
  slow: 300,
  slower: 500,
} as const

// Easing functions
export const EASING = {
  easeOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
} as const

// Animation classes for common interactions
export const ANIMATION_CLASSES = {
  // Hover effects
  hoverLift: 'transition-all duration-200 ease-out hover:transform hover:-translate-y-0.5 hover:shadow-lg',
  hoverScale: 'transition-transform duration-200 ease-out hover:scale-105',
  hoverGlow: 'transition-all duration-200 ease-out hover:shadow-md hover:shadow-primary/20',
  
  // Button interactions
  buttonPress: 'transition-transform duration-75 ease-out active:scale-95',
  buttonHover: 'transition-all duration-200 ease-out hover:shadow-md hover:-translate-y-0.5',
  
  // Card interactions
  cardHover: 'transition-all duration-300 ease-out hover:shadow-lg hover:-translate-y-1',
  cardPress: 'transition-transform duration-150 ease-out active:scale-98',
  
  // Loading states
  pulse: 'animate-pulse',
  spin: 'animate-spin',
  bounce: 'animate-bounce',
  
  // Fade animations
  fadeIn: 'animate-in fade-in duration-300',
  fadeOut: 'animate-out fade-out duration-200',
  slideIn: 'animate-in slide-in-from-bottom-4 duration-300',
  slideOut: 'animate-out slide-out-to-bottom-4 duration-200',
  
  // Focus states
  focusRing: 'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-all duration-200',
  
  // Micro-interactions
  wiggle: 'animate-pulse hover:animate-none',
  heartbeat: 'animate-pulse',
} as const

// Stagger animation delays for lists
export const STAGGER_DELAYS = {
  children: 'delay-75',
  items: (index: number) => `delay-[${index * 50}ms]`,
} as const

// Animation variants for different states
export const ANIMATION_VARIANTS = {
  button: {
    idle: 'transition-all duration-200 ease-out',
    hover: 'transform -translate-y-0.5 shadow-md',
    active: 'transform scale-95',
    disabled: 'opacity-50 cursor-not-allowed',
  },
  card: {
    idle: 'transition-all duration-300 ease-out',
    hover: 'transform -translate-y-1 shadow-lg',
    selected: 'ring-2 ring-primary shadow-lg',
    loading: 'animate-pulse opacity-70',
  },
  modal: {
    enter: 'animate-in fade-in-0 zoom-in-95 duration-300',
    exit: 'animate-out fade-out-0 zoom-out-95 duration-200',
  },
  toast: {
    enter: 'animate-in slide-in-from-right-full duration-300',
    exit: 'animate-out slide-out-to-right-full duration-200',
  },
} as const

// Progress animation utilities
export const createProgressAnimation = (progress: number) => ({
  width: `${progress}%`,
  transition: `width ${ANIMATION_DURATIONS.normal}ms ${EASING.easeOut}`,
})

// Staggered animation utility
export const createStaggeredAnimation = (index: number, baseDelay = 50) => ({
  animationDelay: `${index * baseDelay}ms`,
})

// Loading skeleton animation
export const SKELETON_ANIMATION = 'animate-pulse bg-gradient-to-r from-muted via-muted/50 to-muted bg-[length:200%_100%]'

// Micro-interaction helpers
export const microInteractions = {
  // Button feedback
  buttonFeedback: (element: HTMLElement) => {
    element.style.transform = 'scale(0.95)'
    setTimeout(() => {
      element.style.transform = 'scale(1)'
    }, 100)
  },
  
  // Success feedback
  successPulse: (element: HTMLElement) => {
    element.classList.add('animate-pulse')
    setTimeout(() => {
      element.classList.remove('animate-pulse')
    }, 600)
  },
  
  // Error shake
  errorShake: (element: HTMLElement) => {
    element.style.animation = 'shake 0.5s ease-in-out'
    setTimeout(() => {
      element.style.animation = ''
    }, 500)
  },
}

// CSS-in-JS animation keyframes (for dynamic animations)
export const keyframes = {
  shake: `
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
      20%, 40%, 60%, 80% { transform: translateX(2px); }
    }
  `,
  
  slideInUp: `
    @keyframes slideInUp {
      from {
        transform: translateY(100%);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }
  `,
  
  slideInDown: `
    @keyframes slideInDown {
      from {
        transform: translateY(-100%);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }
  `,
  
  scaleIn: `
    @keyframes scaleIn {
      from {
        transform: scale(0.8);
        opacity: 0;
      }
      to {
        transform: scale(1);
        opacity: 1;
      }
    }
  `,
  
  fadeInUp: `
    @keyframes fadeInUp {
      from {
        transform: translateY(20px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }
  `,
}

// Animation state management
export class AnimationController {
  private element: HTMLElement
  private currentAnimation: string | null = null
  
  constructor(element: HTMLElement) {
    this.element = element
  }
  
  play(animationClass: string, duration?: number) {
    this.stop()
    this.element.classList.add(animationClass)
    this.currentAnimation = animationClass
    
    if (duration) {
      setTimeout(() => this.stop(), duration)
    }
  }
  
  stop() {
    if (this.currentAnimation) {
      this.element.classList.remove(this.currentAnimation)
      this.currentAnimation = null
    }
  }
  
  toggle(animationClass: string) {
    if (this.currentAnimation === animationClass) {
      this.stop()
    } else {
      this.play(animationClass)
    }
  }
}

// React hook for animation controller
import React from 'react'

export const useAnimationController = (ref: React.RefObject<HTMLElement>) => {
  const [controller, setController] = React.useState<AnimationController | null>(null)
  
  React.useEffect(() => {
    if (ref.current) {
      setController(new AnimationController(ref.current))
    }
  }, [ref])
  
  return controller
}