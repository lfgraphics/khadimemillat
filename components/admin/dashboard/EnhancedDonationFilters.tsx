"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { 
  Calendar as CalendarIcon, 
  X, 
  Filter,
  ChevronDown,
  ChevronUp,
  Search,
  Zap
} from 'lucide-react'
import { EnhancedDonationFiltersState, ItemCondition } from '@/types/dashboard'
import { useResponsiveBreakpoint, TOUCH_TARGETS } from '@/lib/utils/responsive'
import FilterPresets from './FilterPresets'

interface EnhancedDonationFiltersProps {
  value: EnhancedDonationFiltersState
  onChange: (filters: EnhancedDonationFiltersState) => void
  onClear?: () => void
  activeFiltersCount?: number
  itemCounts?: Record<string, number>
}

export default function EnhancedDonationFilters({
  value,
  onChange,
  onClear,
  activeFiltersCount = 0,
  itemCounts = {}
}: EnhancedDonationFiltersProps) {
  const [collapsed, setCollapsed] = React.useState(true) // Start collapsed on mobile
  const [showAdvanced, setShowAdvanced] = React.useState(false)
  const breakpoint = useResponsiveBreakpoint()
  const isMobile = breakpoint === 'mobile'

  const set = (patch: Partial<EnhancedDonationFiltersState>) => {
    onChange({ ...value, ...patch })
  }

  const conditions: { value: ItemCondition; label: string }[] = [
    { value: 'new', label: 'New' },
    { value: 'good', label: 'Good' },
    { value: 'repairable', label: 'Repairable' },
    { value: 'scrap', label: 'Scrap' },
    { value: 'not applicable', label: 'Not Applicable' }
  ]

  const FilterContent = () => (
    <div className="space-y-4">
      {/* Quick Filter Presets */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Zap className="h-4 w-4 text-primary" />
          <label className="text-sm font-medium">Quick Filters</label>
        </div>
        <FilterPresets
          currentFilters={value}
          onApplyPreset={onChange}
          itemCounts={itemCounts}
        />
      </div>

      {/* Search - Always visible */}
      <div>
        <label className="text-sm font-medium text-muted-foreground mb-2 block">
          Search
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search items or donors..."
            value={value.q || ''}
            onChange={e => set({ q: e.target.value })}
            className={`pl-10 ${TOUCH_TARGETS.comfortable}`}
          />
        </div>
      </div>

      {/* Advanced Filters Toggle */}
      {isMobile && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full justify-between"
        >
          <span>Advanced Filters</span>
          {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      )}

      {/* Advanced Filters */}
      {(!isMobile || showAdvanced) && (
        <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'}`}>
          {/* Donation Status */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Donation Status
            </label>
            <Select 
              value={value.status ?? 'any'} 
              onValueChange={v => set({ status: v === 'any' ? undefined : v })}
            >
              <SelectTrigger className={TOUCH_TARGETS.comfortable}>
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="collected">Collected</SelectItem>
                <SelectItem value="done">Done</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Item Status */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Item Status
            </label>
            <Select 
              value={value.itemStatus ?? 'any'} 
              onValueChange={v => set({ itemStatus: v === 'any' ? undefined : v })}
            >
              <SelectTrigger className={TOUCH_TARGETS.comfortable}>
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                <SelectItem value="listed">Listed</SelectItem>
                <SelectItem value="unlisted">Unlisted</SelectItem>
                <SelectItem value="sold">Sold</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Condition */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Condition
            </label>
            <Select 
              value={value.condition ?? 'any'} 
              onValueChange={v => set({ condition: v === 'any' ? undefined : v as ItemCondition })}
            >
              <SelectTrigger className={TOUCH_TARGETS.comfortable}>
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                {conditions.map(condition => (
                  <SelectItem key={condition.value} value={condition.value}>
                    {condition.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Range */}
          <div className={isMobile ? 'col-span-1' : 'col-span-2 md:col-span-1'}>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Date Range
            </label>
            <div className="flex flex-col gap-2">
              <DatePicker 
                label="From" 
                value={value.from} 
                onChange={d => set({ from: d })} 
              />
              <DatePicker 
                label="To" 
                value={value.to} 
                onChange={d => set({ to: d })} 
              />
            </div>
          </div>
        </div>
      )}

      {/* Quick Action Buttons */}
      {(!isMobile || showAdvanced) && (
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          <Button
            variant={value.hasPrice === false ? "default" : "outline"}
            size="sm"
            onClick={() => set({ hasPrice: value.hasPrice === false ? undefined : false })}
            className={TOUCH_TARGETS.comfortable}
          >
            Without Price
          </Button>
          <Button
            variant={value.canList === true ? "default" : "outline"}
            size="sm"
            onClick={() => set({ canList: value.canList === true ? undefined : true })}
            className={TOUCH_TARGETS.comfortable}
          >
            Ready to List
          </Button>
        </div>
      )}
    </div>
  )

  if (isMobile) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filters
              </CardTitle>
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {activeFiltersCount}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              {onClear && activeFiltersCount > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onClear}
                  className={`${TOUCH_TARGETS.comfortable} p-2`}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCollapsed(!collapsed)}
                className={`${TOUCH_TARGETS.comfortable} p-2`}
              >
                {collapsed ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        {!collapsed && (
          <CardContent className="pt-0">
            <FilterContent />
          </CardContent>
        )}
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Filters</CardTitle>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {activeFiltersCount} active
              </Badge>
            )}
          </div>
          {onClear && activeFiltersCount > 0 && (
            <Button variant="outline" size="sm" onClick={onClear}>
              <X className="h-4 w-4 mr-1" />
              Clear All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <FilterContent />
      </CardContent>
    </Card>
  )
}

function DatePicker({ 
  label, 
  value, 
  onChange 
}: { 
  label: string
  value?: Date
  onChange: (d?: Date) => void 
}) {
  const [open, setOpen] = React.useState(false)
  
  return (
    <div className="w-full">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            className={cn(
              "w-full justify-start text-left font-normal",
              TOUCH_TARGETS.comfortable,
              !value && "text-muted-foreground"
            )}
          > 
            <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
            <span className="truncate">
              {value ? value.toLocaleDateString() : label}
            </span>
            {value && (
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto h-4 w-4 p-0 hoact:bg-transparent"
                onClick={(e) => {
                  e.stopPropagation()
                  onChange(undefined)
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0" align="start">
          <Calendar 
            mode="single" 
            selected={value} 
            onSelect={(date) => {
              onChange(date)
              setOpen(false)
            }} 
            initialFocus 
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}