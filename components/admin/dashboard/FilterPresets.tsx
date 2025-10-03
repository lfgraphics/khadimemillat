"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  List, 
  AlertCircle, 
  CheckCircle, 
  ShoppingCart, 
  DollarSign, 
  Wrench,
  Filter
} from 'lucide-react'
import { FilterPreset, EnhancedDonationFiltersState } from '@/types/dashboard'
import { FILTER_PRESETS } from '@/lib/utils/dashboard'

interface FilterPresetsProps {
  currentFilters: EnhancedDonationFiltersState
  onApplyPreset: (filters: EnhancedDonationFiltersState) => void
  itemCounts?: Record<string, number>
}

const PRESET_ICONS = {
  List,
  AlertCircle,
  CheckCircle,
  ShoppingCart,
  DollarSign,
  Wrench,
  Filter
}

export default function FilterPresets({
  currentFilters,
  onApplyPreset,
  itemCounts = {}
}: FilterPresetsProps) {
  const isPresetActive = (preset: FilterPreset): boolean => {
    const presetKeys = Object.keys(preset.filters)
    const currentKeys = Object.keys(currentFilters)
    
    if (presetKeys.length === 0 && currentKeys.length === 0) return true
    if (presetKeys.length !== currentKeys.length) return false
    
    return presetKeys.every(key => {
      const presetValue = preset.filters[key as keyof EnhancedDonationFiltersState]
      const currentValue = currentFilters[key as keyof EnhancedDonationFiltersState]
      return presetValue === currentValue
    })
  }

  return (
    <div className="flex flex-wrap gap-2">
      {FILTER_PRESETS.map(preset => {
        const IconComponent = PRESET_ICONS[preset.icon as keyof typeof PRESET_ICONS] || Filter
        const isActive = isPresetActive(preset)
        const count = itemCounts[preset.id]
        
        return (
          <Button
            key={preset.id}
            variant={isActive ? "default" : "outline"}
            size="sm"
            onClick={() => onApplyPreset(preset.filters)}
            className="flex items-center gap-2"
          >
            <IconComponent className="h-4 w-4" />
            <span>{preset.name}</span>
            {count !== undefined && (
              <Badge 
                variant={isActive ? "secondary" : "outline"} 
                className="ml-1 text-xs"
              >
                {count}
              </Badge>
            )}
          </Button>
        )
      })}
    </div>
  )
}