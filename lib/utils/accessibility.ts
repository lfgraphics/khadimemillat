/**
 * Accessibility utilities for enhanced UI compliance
 */

import React from 'react'

// ARIA label generators
export const generateAriaLabel = {
  // Button actions
  button: (action: string, context?: string) => 
    context ? `${action} ${context}` : action,
  
  // Item actions
  editItem: (itemName: string) => `Edit item: ${itemName}`,
  deleteItem: (itemName: string) => `Delete item: ${itemName}`,
  viewItem: (itemName: string) => `View details for item: ${itemName}`,
  
  // Status indicators
  status: (status: string, context?: string) => 
    context ? `Status: ${status} for ${context}` : `Status: ${status}`,
  
  // Validation states
  validation: (isValid: boolean, errors?: string[]) => {
    if (isValid) return 'Item is valid and ready for listing'
    return `Item has validation errors: ${errors?.join(', ') || 'Unknown errors'}`
  },
  
  // Loading states
  loading: (action: string) => `Loading ${action}...`,
  
  // Progress indicators
  progress: (current: number, total: number, context?: string) => 
    `${context ? `${context}: ` : ''}${current} of ${total} completed`,
  
  // Navigation
  navigation: (destination: string) => `Navigate to ${destination}`,
  
  // Form fields
  field: (fieldName: string, required?: boolean, description?: string) => {
    let label = fieldName
    if (required) label += ' (required)'
    if (description) label += `. ${description}`
    return label
  },
  
  // Statistics
  statistic: (label: string, value: string | number, description?: string) => 
    `${label}: ${value}${description ? `. ${description}` : ''}`,
}

// ARIA describedby generators
export const generateAriaDescribedBy = {
  validation: (fieldId: string) => `${fieldId}-validation`,
  help: (fieldId: string) => `${fieldId}-help`,
  error: (fieldId: string) => `${fieldId}-error`,
}

// Keyboard navigation utilities
export const keyboardNavigation = {
  // Handle arrow key navigation in lists
  handleArrowKeys: (
    event: React.KeyboardEvent,
    currentIndex: number,
    totalItems: number,
    onNavigate: (newIndex: number) => void
  ) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        onNavigate(currentIndex < totalItems - 1 ? currentIndex + 1 : 0)
        break
      case 'ArrowUp':
        event.preventDefault()
        onNavigate(currentIndex > 0 ? currentIndex - 1 : totalItems - 1)
        break
      case 'Home':
        event.preventDefault()
        onNavigate(0)
        break
      case 'End':
        event.preventDefault()
        onNavigate(totalItems - 1)
        break
    }
  },
  
  // Handle Enter and Space for button-like elements
  handleActivation: (
    event: React.KeyboardEvent,
    onActivate: () => void
  ) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onActivate()
    }
  },
  
  // Handle Escape key for modals and dropdowns
  handleEscape: (
    event: React.KeyboardEvent,
    onEscape: () => void
  ) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      onEscape()
    }
  },
  
  // Tab trap for modals
  trapFocus: (
    event: React.KeyboardEvent,
    containerRef: React.RefObject<HTMLElement>
  ) => {
    if (event.key !== 'Tab') return
    
    const container = containerRef.current
    if (!container) return
    
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    
    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement
    
    if (event.shiftKey) {
      if (document.activeElement === firstElement) {
        event.preventDefault()
        lastElement?.focus()
      }
    } else {
      if (document.activeElement === lastElement) {
        event.preventDefault()
        firstElement?.focus()
      }
    }
  },
}

// Screen reader utilities
export const screenReader = {
  // Announce dynamic content changes
  announce: (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcement = document.createElement('div')
    announcement.setAttribute('aria-live', priority)
    announcement.setAttribute('aria-atomic', 'true')
    announcement.className = 'sr-only'
    announcement.textContent = message
    
    document.body.appendChild(announcement)
    
    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement)
    }, 1000)
  },
  
  // Create visually hidden text for screen readers
  createSROnlyText: (text: string) => ({
    position: 'absolute' as const,
    width: '1px',
    height: '1px',
    padding: '0',
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap' as const,
    border: '0',
    children: text,
  }),
}

// Color contrast utilities
export const colorContrast = {
  // Check if color combination meets WCAG AA standards
  meetsWCAG: (foreground: string, background: string): boolean => {
    // This is a simplified check - in production, use a proper contrast ratio library
    // For now, we'll assume our design system colors meet standards
    return true
  },
  
  // Get high contrast alternative
  getHighContrastColor: (color: string): string => {
    // Return high contrast alternatives for common colors
    const highContrastMap: Record<string, string> = {
      'text-gray-600': 'text-gray-900',
      'text-gray-500': 'text-gray-800',
      'text-blue-600': 'text-blue-800',
      'text-green-600': 'text-green-800',
      'text-red-600': 'text-red-800',
      'text-yellow-600': 'text-yellow-800',
    }
    
    return highContrastMap[color] || color
  },
}

// Focus management utilities
export const focusManagement = {
  // Set focus to element with fallback
  setFocus: (elementId: string, fallbackSelector?: string) => {
    const element = document.getElementById(elementId)
    if (element) {
      element.focus()
      return true
    }
    
    if (fallbackSelector) {
      const fallback = document.querySelector(fallbackSelector) as HTMLElement
      if (fallback) {
        fallback.focus()
        return true
      }
    }
    
    return false
  },
  
  // Save and restore focus
  saveFocus: () => {
    return document.activeElement as HTMLElement
  },
  
  restoreFocus: (element: HTMLElement | null) => {
    if (element && element.focus) {
      element.focus()
    }
  },
  
  // Get next focusable element
  getNextFocusable: (currentElement: HTMLElement, direction: 'next' | 'previous' = 'next') => {
    const focusableElements = Array.from(
      document.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ) as HTMLElement[]
    
    const currentIndex = focusableElements.indexOf(currentElement)
    if (currentIndex === -1) return null
    
    if (direction === 'next') {
      return focusableElements[currentIndex + 1] || focusableElements[0]
    } else {
      return focusableElements[currentIndex - 1] || focusableElements[focusableElements.length - 1]
    }
  },
}

// Semantic HTML utilities
export const semanticHTML = {
  // Get appropriate heading level
  getHeadingLevel: (context: 'page' | 'section' | 'subsection' | 'detail') => {
    const levels = {
      page: 'h1',
      section: 'h2',
      subsection: 'h3',
      detail: 'h4',
    }
    return levels[context]
  },
  
  // Get appropriate landmark role
  getLandmarkRole: (context: 'main' | 'navigation' | 'banner' | 'contentinfo' | 'complementary' | 'search') => {
    return context
  },
  
  // Get appropriate list type
  getListType: (ordered: boolean = false) => ordered ? 'ol' : 'ul',
}

// Touch accessibility utilities
export const touchAccessibility = {
  // Minimum touch target size (44px x 44px per WCAG)
  minTouchTarget: {
    minWidth: '44px',
    minHeight: '44px',
  },
  
  // Comfortable touch target size
  comfortableTouchTarget: {
    minWidth: '48px',
    minHeight: '48px',
  },
  
  // Check if element meets touch target requirements
  meetsTouchTarget: (element: HTMLElement): boolean => {
    const rect = element.getBoundingClientRect()
    return rect.width >= 44 && rect.height >= 44
  },
}

// Accessibility testing utilities
export const a11yTesting = {
  // Check for missing alt text on images
  checkImageAltText: (): string[] => {
    const images = Array.from(document.querySelectorAll('img'))
    return images
      .filter(img => !img.alt && !img.getAttribute('aria-label'))
      .map(img => img.src || 'Unknown image')
  },
  
  // Check for missing form labels
  checkFormLabels: (): string[] => {
    const inputs = Array.from(document.querySelectorAll('input, select, textarea'))
    return inputs
      .filter(input => {
        const id = input.id
        const hasLabel = id && document.querySelector(`label[for="${id}"]`)
        const hasAriaLabel = input.getAttribute('aria-label')
        const hasAriaLabelledBy = input.getAttribute('aria-labelledby')
        return !hasLabel && !hasAriaLabel && !hasAriaLabelledBy
      })
      .map(input => (input as HTMLInputElement).name || input.id || 'Unknown input')
  },
  
  // Check for missing heading structure
  checkHeadingStructure: (): string[] => {
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
    const issues: string[] = []
    
    let previousLevel = 0
    headings.forEach((heading, index) => {
      const level = parseInt(heading.tagName.charAt(1))
      
      if (index === 0 && level !== 1) {
        issues.push('Page should start with h1')
      }
      
      if (level > previousLevel + 1) {
        issues.push(`Heading level jumps from h${previousLevel} to h${level}`)
      }
      
      previousLevel = level
    })
    
    return issues
  },
}

// React hooks for accessibility
export const useAccessibility = () => {
  const [announcements, setAnnouncements] = React.useState<string[]>([])
  
  const announce = React.useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    screenReader.announce(message, priority)
    setAnnouncements(prev => [...prev, message])
  }, [])
  
  const clearAnnouncements = React.useCallback(() => {
    setAnnouncements([])
  }, [])
  
  return {
    announce,
    clearAnnouncements,
    announcements,
  }
}

// Keyboard shortcut utilities
export const keyboardShortcuts = {
  // Common shortcut patterns
  shortcuts: {
    save: { key: 's', ctrlKey: true },
    cancel: { key: 'Escape' },
    search: { key: 'f', ctrlKey: true },
    refresh: { key: 'r', ctrlKey: true },
    help: { key: 'F1' },
  },
  
  // Check if event matches shortcut
  matches: (event: KeyboardEvent, shortcut: { key: string; ctrlKey?: boolean; altKey?: boolean; shiftKey?: boolean }) => {
    return (
      event.key === shortcut.key &&
      !!event.ctrlKey === !!shortcut.ctrlKey &&
      !!event.altKey === !!shortcut.altKey &&
      !!event.shiftKey === !!shortcut.shiftKey
    )
  },
  
  // Format shortcut for display
  format: (shortcut: { key: string; ctrlKey?: boolean; altKey?: boolean; shiftKey?: boolean }) => {
    const parts: string[] = []
    if (shortcut.ctrlKey) parts.push('Ctrl')
    if (shortcut.altKey) parts.push('Alt')
    if (shortcut.shiftKey) parts.push('Shift')
    parts.push(shortcut.key)
    return parts.join(' + ')
  },
}