'use client'

import { useEffect, useRef, useCallback } from 'react'

/**
 * Accessibility utilities for the file selector components
 */

// ARIA live region types
export type LiveRegionType = 'polite' | 'assertive' | 'off'

// Screen reader announcement utility
export function announceToScreenReader(
    message: string,
    priority: LiveRegionType = 'polite'
): void {
    // Only run on client side
    if (typeof document === 'undefined') return
    
    // Create or get existing live region
    let liveRegion = document?.getElementById(`file-selector-live-${priority}`)

    if (!liveRegion) {
        liveRegion = document?.createElement('div')
        liveRegion.id = `file-selector-live-${priority}`
        liveRegion.setAttribute('aria-live', priority)
        liveRegion.setAttribute('aria-atomic', 'true')
        liveRegion.className = 'sr-only'
        liveRegion.style.cssText = `
      position: absolute !important;
      width: 1px !important;
      height: 1px !important;
      padding: 0 !important;
      margin: -1px !important;
      overflow: hidden !important;
      clip: rect(0, 0, 0, 0) !important;
      white-space: nowrap !important;
      border: 0 !important;
    `
        document?.body.appendChild(liveRegion)
    }

    // Clear and set new message
    liveRegion.textContent = ''
    setTimeout(() => {
        liveRegion!.textContent = message
    }, 100)
}

// Hook for managing focus trap in modals
export function useFocusTrap(isActive: boolean) {
    const containerRef = useRef<HTMLDivElement>(null)
    const previousFocusRef = useRef<HTMLElement | null>(null)

    const getFocusableElements = useCallback((container: HTMLDivElement): HTMLElement[] => {
        const focusableSelectors = [
            'button:not([disabled])',
            'input:not([disabled])',
            'select:not([disabled])',
            'textarea:not([disabled])',
            'a[href]',
            '[tabindex]:not([tabindex="-1"])',
            '[contenteditable="true"]'
        ].join(', ')

        return Array.from(container.querySelectorAll(focusableSelectors))
    }, [])

    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        if (!isActive || !containerRef.current) return

        if (event.key === 'Tab') {
            const focusableElements = getFocusableElements(containerRef.current)

            if (focusableElements.length === 0) {
                event.preventDefault()
                return
            }

            const firstElement = focusableElements[0]
            const lastElement = focusableElements[focusableElements.length - 1]

            if (event.shiftKey) {
                // Shift + Tab
                if (document?.activeElement === firstElement) {
                    event.preventDefault()
                    lastElement.focus()
                }
            } else {
                // Tab
                if (document?.activeElement === lastElement) {
                    event.preventDefault()
                    firstElement.focus()
                }
            }
        }

        if (event.key === 'Escape') {
            event.preventDefault()
            // Let parent components handle escape
            const escapeEvent = new CustomEvent('file-selector-escape', { bubbles: true })
            containerRef.current?.dispatchEvent(escapeEvent)
        }
    }, [isActive, getFocusableElements])

    useEffect(() => {
        if (isActive && containerRef.current) {
            // Store previous focus
            previousFocusRef.current = document?.activeElement as HTMLElement

            // Focus first focusable element
            const focusableElements = getFocusableElements(containerRef.current)
            if (focusableElements.length > 0) {
                focusableElements[0].focus()
            }

            // Add event listener
            document?.addEventListener('keydown', handleKeyDown)

            return () => {
                document?.removeEventListener('keydown', handleKeyDown)

                // Restore previous focus
                if (previousFocusRef.current) {
                    previousFocusRef.current.focus()
                }
            }
        }
    }, [isActive, handleKeyDown, getFocusableElements])

    return containerRef
}

// Hook for managing focus within a component
export function useFocusManagement() {
    const focusRef = useRef<HTMLDivElement>(null)

    const focusElement = useCallback(() => {
        if (focusRef.current) {
            focusRef.current.focus()
        }
    }, [])

    const blurElement = useCallback(() => {
        if (focusRef.current) {
            focusRef.current.blur()
        }
    }, [])

    return {
        focusRef,
        focusElement,
        blurElement
    }
}

// Generate unique IDs for ARIA relationships
let idCounter = 0
export function generateId(prefix: string = 'file-selector'): string {
    return `${prefix}-${++idCounter}-${Date.now()}`
}

// Keyboard event handlers
export const KEYBOARD_KEYS = {
    ENTER: 'Enter',
    SPACE: ' ',
    ESCAPE: 'Escape',
    TAB: 'Tab',
    ARROW_UP: 'ArrowUp',
    ARROW_DOWN: 'ArrowDown',
    ARROW_LEFT: 'ArrowLeft',
    ARROW_RIGHT: 'ArrowRight'
} as const

export function isActivationKey(key: string): boolean {
    return key === KEYBOARD_KEYS.ENTER || key === KEYBOARD_KEYS.SPACE
}

// ARIA attributes helpers
export function getAriaAttributes(options: {
    label?: string
    labelledBy?: string
    describedBy?: string
    expanded?: boolean
    selected?: boolean
    disabled?: boolean
    invalid?: boolean
    required?: boolean
    live?: LiveRegionType
}) {
    const attrs: Record<string, string | boolean> = {}

    if (options.label) attrs['aria-label'] = options.label
    if (options.labelledBy) attrs['aria-labelledby'] = options.labelledBy
    if (options.describedBy) attrs['aria-describedby'] = options.describedBy
    if (options.expanded !== undefined) attrs['aria-expanded'] = options.expanded
    if (options.selected !== undefined) attrs['aria-selected'] = options.selected
    if (options.disabled !== undefined) attrs['aria-disabled'] = options.disabled
    if (options.invalid !== undefined) attrs['aria-invalid'] = options.invalid
    if (options.required !== undefined) attrs['aria-required'] = options.required
    if (options.live) attrs['aria-live'] = options.live

    return attrs
}

// Status announcements for different file selector states
export const ACCESSIBILITY_MESSAGES = {
    // File selection
    FILE_SELECTED: (fileName: string) => `File selected: ${fileName}`,
    FILE_DROPPED: (fileName: string) => `File dropped: ${fileName}`,
    MULTIPLE_FILES_DROPPED: (count: number) => `${count} files dropped, processing first file only`,

    // Upload progress
    UPLOAD_STARTED: (fileName: string) => `Upload started for ${fileName}`,
    UPLOAD_PROGRESS: (fileName: string, progress: number) => `Upload progress for ${fileName}: ${progress}%`,
    UPLOAD_COMPLETE: (fileName: string) => `Upload completed successfully for ${fileName}`,
    UPLOAD_CANCELLED: (fileName: string) => `Upload cancelled for ${fileName}`,

    // Errors
    VALIDATION_ERROR: (errors: string[]) => `File validation failed: ${errors.join(', ')}`,
    UPLOAD_ERROR: (fileName: string, error: string) => `Upload failed for ${fileName}: ${error}`,
    CAMERA_ERROR: (error: string) => `Camera error: ${error}`,

    // Camera
    CAMERA_OPENED: () => 'Camera opened for photo capture',
    CAMERA_CLOSED: () => 'Camera closed',
    PHOTO_CAPTURED: () => 'Photo captured successfully',
    CAMERA_SWITCHED: (mode: string) => `Switched to ${mode} camera`,

    // Modal
    MODAL_OPENED: () => 'File selection modal opened',
    MODAL_CLOSED: () => 'File selection modal closed',

    // Drag and drop
    DRAG_ENTER: () => 'File dragged over drop zone',
    DRAG_LEAVE: () => 'File dragged away from drop zone',

    // Actions
    FILE_REMOVED: (fileName: string) => `File removed: ${fileName}`,
    FILE_REPLACED: (fileName: string) => `File replaced: ${fileName}`,
    RETRY_ATTEMPTED: (attempt: number) => `Retry attempt ${attempt}`,

    // States
    COMPONENT_READY: () => 'File selector ready for file upload',
    COMPONENT_DISABLED: () => 'File selector is disabled',
    COMPONENT_LOADING: () => 'File selector is loading'
} as const

// Cleanup function for live regions
export function cleanupLiveRegions(): void {
    // Only run on client side
    if (typeof document === 'undefined') return
    
    const liveRegions = document?.querySelectorAll('[id^="file-selector-live-"]')
    liveRegions.forEach(region => region.remove())
}