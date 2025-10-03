// Responsive breakpoint constants and utility functions

import { ResponsiveBreakpoint } from '@/types/dashboard'

// Breakpoint constants (matching Tailwind CSS defaults)
export const BREAKPOINTS = {
  mobile: 0,
  tablet: 768,
  desktop: 1024,
} as const

// Media query strings
export const MEDIA_QUERIES = {
  mobile: `(max-width: ${BREAKPOINTS.tablet - 1}px)`,
  tablet: `(min-width: ${BREAKPOINTS.tablet}px) and (max-width: ${BREAKPOINTS.desktop - 1}px)`,
  desktop: `(min-width: ${BREAKPOINTS.desktop}px)`,
} as const

// Get current breakpoint based on window width
export function getCurrentBreakpoint(): ResponsiveBreakpoint {
  if (typeof window === 'undefined') return 'desktop'
  
  const width = window.innerWidth
  
  if (width < BREAKPOINTS.tablet) return 'mobile'
  if (width < BREAKPOINTS.desktop) return 'tablet'
  return 'desktop'
}

// Check if current viewport matches breakpoint
export function isBreakpoint(breakpoint: ResponsiveBreakpoint): boolean {
  if (typeof window === 'undefined') return false
  
  const width = window.innerWidth
  
  switch (breakpoint) {
    case 'mobile':
      return width < BREAKPOINTS.tablet
    case 'tablet':
      return width >= BREAKPOINTS.tablet && width < BREAKPOINTS.desktop
    case 'desktop':
      return width >= BREAKPOINTS.desktop
    default:
      return false
  }
}

// Check if viewport is mobile or smaller
export function isMobile(): boolean {
  return isBreakpoint('mobile')
}

// Check if viewport is tablet or smaller
export function isTabletOrSmaller(): boolean {
  return isBreakpoint('mobile') || isBreakpoint('tablet')
}

// Check if viewport is desktop or larger
export function isDesktop(): boolean {
  return isBreakpoint('desktop')
}

// Hook for responsive breakpoint detection
export function useResponsiveBreakpoint(): ResponsiveBreakpoint {
  if (typeof window === 'undefined') return 'desktop'
  
  const [breakpoint, setBreakpoint] = React.useState<ResponsiveBreakpoint>(getCurrentBreakpoint())
  
  React.useEffect(() => {
    const handleResize = () => {
      setBreakpoint(getCurrentBreakpoint())
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  
  return breakpoint
}

// CSS classes for responsive design
export const RESPONSIVE_CLASSES = {
  // Grid layouts
  grid: {
    mobile: 'grid-cols-1',
    tablet: 'md:grid-cols-2',
    desktop: 'lg:grid-cols-3 xl:grid-cols-4',
  },
  
  // Spacing
  spacing: {
    mobile: 'space-y-4 p-4',
    tablet: 'md:space-y-6 md:p-6',
    desktop: 'lg:space-y-8 lg:p-8',
  },
  
  // Text sizes
  text: {
    heading: 'text-xl md:text-2xl lg:text-3xl',
    subheading: 'text-lg md:text-xl lg:text-2xl',
    body: 'text-sm md:text-base',
    caption: 'text-xs md:text-sm',
  },
  
  // Container widths
  container: {
    mobile: 'w-full px-4',
    tablet: 'md:px-6',
    desktop: 'lg:px-8 xl:max-w-7xl xl:mx-auto',
  },
} as const

// Utility function to combine responsive classes
export function getResponsiveClasses(
  classMap: Record<ResponsiveBreakpoint, string>
): string {
  return Object.entries(classMap)
    .map(([breakpoint, classes]) => {
      if (breakpoint === 'mobile') return classes
      if (breakpoint === 'tablet') return `md:${classes.replace(/^md:/, '')}`
      if (breakpoint === 'desktop') return `lg:${classes.replace(/^lg:/, '')}`
      return classes
    })
    .join(' ')
}

// Touch-friendly sizing utilities
export const TOUCH_TARGETS = {
  minimum: 'min-h-[44px] min-w-[44px]', // iOS/Android minimum
  comfortable: 'min-h-[48px] min-w-[48px]', // More comfortable
  large: 'min-h-[56px] min-w-[56px]', // Large touch targets
} as const

// Import React for the hook
import React from 'react'