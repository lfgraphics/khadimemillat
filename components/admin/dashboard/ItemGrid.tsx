"use client"

import React from 'react'
import { EnhancedScrapItem, QuickAction } from '@/types/dashboard'
import EnhancedItemCard from './EnhancedItemCard'
import MobileItemCard from './MobileItemCard'
import { useResponsiveBreakpoint } from '@/lib/utils/responsive'

interface ItemGridProps {
  items: EnhancedScrapItem[]
  onEditItem: (item: EnhancedScrapItem) => void
  onQuickAction: (itemId: string, action: QuickAction) => void
  savingItems: Record<string, boolean>
  validationErrors: Record<string, string[]>
  loading?: boolean
  compact?: boolean
  selectedItems?: string[]
  onSelectItem?: (itemId: string, selected: boolean) => void
}

export default function ItemGrid({
  items,
  onEditItem,
  onQuickAction,
  savingItems,
  validationErrors,
  loading = false,
  compact = false,
  selectedItems = [],
  onSelectItem
}: ItemGridProps) {
  const breakpoint = useResponsiveBreakpoint()
  
  const getGridClasses = () => {
    if (compact) {
      switch (breakpoint) {
        case 'mobile':
          return 'grid-cols-1'
        case 'tablet':
          return 'grid-cols-2'
        case 'desktop':
          return 'grid-cols-3'
        default:
          return 'grid-cols-1'
      }
    }
    
    switch (breakpoint) {
      case 'mobile':
        return 'grid-cols-1'
      case 'tablet':
        return 'grid-cols-2'
      case 'desktop':
        return 'grid-cols-2 xl:grid-cols-3'
      default:
        return 'grid-cols-1'
    }
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-2">
          <svg
            className="mx-auto h-12 w-12"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2 2v-5m16 0h-2M4 13h2m13-8V4a1 1 0 00-1-1H7a1 1 0 00-1 1v1m8 0V4.5"
            />
          </svg>
        </div>
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
          No items found
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {loading ? 'Loading items...' : 'No items match the current filters.'}
        </p>
      </div>
    )
  }

  const isMobile = breakpoint === 'mobile'

  // Use mobile-optimized cards for mobile devices
  if (isMobile) {
    return (
      <div className="space-y-3">
        {items.map((item, index) => (
          <div 
            key={item.id}
            className="animate-fade-in-up"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <MobileItemCard
              item={item}
              onEdit={onEditItem}
              onQuickAction={onQuickAction}
              loading={savingItems[item.id] || loading}
              validationErrors={validationErrors[item.id] || []}
              selected={selectedItems.includes(item.id)}
              onSelect={onSelectItem ? (selected) => onSelectItem(item.id, selected) : undefined}
            />
          </div>
        ))}
      </div>
    )
  }

  // Desktop grid layout
  return (
    <div className={`grid gap-4 ${getGridClasses()}`}>
      {items.map(item => (
        <EnhancedItemCard
          key={item.id}
          item={item}
          onEdit={onEditItem}
          onQuickAction={onQuickAction}
          loading={savingItems[item.id] || loading}
          validationErrors={validationErrors[item.id] || []}
          compact={compact}
          selected={selectedItems.includes(item.id)}
          onSelect={onSelectItem ? (selected) => onSelectItem(item.id, selected) : undefined}
        />
      ))}
    </div>
  )
}