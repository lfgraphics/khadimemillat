"use client"

import React, { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Calendar as CalendarIcon, X, Search } from 'lucide-react'
import { format, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns'

export interface MoneyDonationFiltersState {
  searchTerm?: string
  statusFilter?: string
  paymentVerified?: string
  panProvided?: string
  showAllDonations?: boolean
  dateRange?: {
    from?: Date
    to?: Date
  }
}

interface MoneyDonationFiltersProps {
  value: MoneyDonationFiltersState
  onChange: (filters: MoneyDonationFiltersState) => void
  onClear?: () => void
}

const datePresets = [
  {
    label: 'Today',
    getValue: () => ({
      from: startOfDay(new Date()),
      to: endOfDay(new Date())
    })
  },
  {
    label: 'Yesterday',
    getValue: () => ({
      from: startOfDay(subDays(new Date(), 1)),
      to: endOfDay(subDays(new Date(), 1))
    })
  },
  {
    label: 'Last 7 days',
    getValue: () => ({
      from: startOfDay(subDays(new Date(), 7)),
      to: endOfDay(new Date())
    })
  },
  {
    label: 'Last 30 days',
    getValue: () => ({
      from: startOfDay(subDays(new Date(), 30)),
      to: endOfDay(new Date())
    })
  },
  {
    label: 'This month',
    getValue: () => ({
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date())
    })
  },
  {
    label: 'Last month',
    getValue: () => ({
      from: startOfMonth(subMonths(new Date(), 1)),
      to: endOfMonth(subMonths(new Date(), 1))
    })
  }
]

export default function MoneyDonationFilters({ value, onChange, onClear }: MoneyDonationFiltersProps) {
  const [showDatePresets, setShowDatePresets] = useState(false)

  const updateFilter = (patch: Partial<MoneyDonationFiltersState>) => {
    onChange({ ...value, ...patch })
  }

  const applyDatePreset = (preset: typeof datePresets[0]) => {
    const range = preset.getValue()
    updateFilter({ dateRange: range })
    setShowDatePresets(false)
  }

  const clearDateRange = () => {
    updateFilter({ dateRange: undefined })
  }

  const hasActiveFilters = !!(
    value.searchTerm ||
    (value.statusFilter && value.statusFilter !== 'all') ||
    (value.paymentVerified && value.paymentVerified !== 'all') ||
    (value.panProvided && value.panProvided !== 'all') ||
    value.dateRange?.from ||
    value.dateRange?.to
  )

  return (
    <div className="space-y-4">
      {/* Main filters row */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by donor name, email, program, or campaign..."
              value={value.searchTerm || ''}
              onChange={(e) => updateFilter({ searchTerm: e.target.value })}
              className="pl-10"
            />
          </div>
        </div>
        
        <Select 
          value={value.statusFilter || 'all'} 
          onValueChange={(v) => updateFilter({ statusFilter: v === 'all' ? undefined : v })}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>

        <Select 
          value={value.paymentVerified || 'all'} 
          onValueChange={(v) => updateFilter({ paymentVerified: v === 'all' ? undefined : v })}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Payment verification" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Payments</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
            <SelectItem value="unverified">Unverified</SelectItem>
          </SelectContent>
        </Select>

        <Select 
          value={value.panProvided || 'all'} 
          onValueChange={(v) => updateFilter({ panProvided: v === 'all' ? undefined : v })}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="PAN status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Donations</SelectItem>
            <SelectItem value="provided">PAN Provided</SelectItem>
            <SelectItem value="not_provided">No PAN</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Date range filtering */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex flex-wrap gap-2">
          {datePresets.map((preset) => (
            <Button
              key={preset.label}
              variant="outline"
              size="sm"
              onClick={() => applyDatePreset(preset)}
              className="text-xs"
            >
              {preset.label}
            </Button>
          ))}
        </div>
        
        <div className="flex gap-2 ml-auto">
          {/* Custom date range picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "justify-start text-left font-normal min-w-[200px]",
                  !value.dateRange?.from && !value.dateRange?.to && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {value.dateRange?.from ? (
                  value.dateRange.to ? (
                    <>
                      {format(value.dateRange.from, "MMM dd")} -{" "}
                      {format(value.dateRange.to, "MMM dd, yyyy")}
                    </>
                  ) : (
                    format(value.dateRange.from, "MMM dd, yyyy")
                  )
                ) : (
                  "Custom date range"
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={value.dateRange?.from}
                selected={{
                  from: value.dateRange?.from,
                  to: value.dateRange?.to
                }}
                onSelect={(range) => {
                  updateFilter({
                    dateRange: range ? {
                      from: range.from,
                      to: range.to
                    } : undefined
                  })
                }}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
          
          {(value.dateRange?.from || value.dateRange?.to) && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearDateRange}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Admin Override Toggle */}
      <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <input
          type="checkbox"
          id="showAllDonations"
          checked={value.showAllDonations || false}
          onChange={(e) => updateFilter({ showAllDonations: e.target.checked })}
          className="rounded border-gray-300"
        />
        <label htmlFor="showAllDonations" className="text-sm font-medium text-blue-900">
          Admin Override: Show all donations (including unverified and incomplete payments)
        </label>
        {!value.showAllDonations && (
          <Badge variant="secondary" className="ml-2">
            Showing verified & completed only
          </Badge>
        )}
      </div>

      {/* Active filters summary */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Active filters:</span>
          {value.searchTerm && (
            <Badge variant="secondary">
              Search: {value.searchTerm}
              <X 
                className="h-3 w-3 ml-1 cursor-pointer" 
                onClick={() => updateFilter({ searchTerm: undefined })}
              />
            </Badge>
          )}
          {value.statusFilter && value.statusFilter !== 'all' && (
            <Badge variant="secondary">
              Status: {value.statusFilter}
              <X 
                className="h-3 w-3 ml-1 cursor-pointer" 
                onClick={() => updateFilter({ statusFilter: undefined })}
              />
            </Badge>
          )}
          {value.paymentVerified && value.paymentVerified !== 'all' && (
            <Badge variant="secondary">
              Payment: {value.paymentVerified}
              <X 
                className="h-3 w-3 ml-1 cursor-pointer" 
                onClick={() => updateFilter({ paymentVerified: undefined })}
              />
            </Badge>
          )}
          {value.panProvided && value.panProvided !== 'all' && (
            <Badge variant="secondary">
              PAN: {value.panProvided === 'provided' ? 'Provided' : 'Not Provided'}
              <X 
                className="h-3 w-3 ml-1 cursor-pointer" 
                onClick={() => updateFilter({ panProvided: undefined })}
              />
            </Badge>
          )}
          {(value.dateRange?.from || value.dateRange?.to) && (
            <Badge variant="secondary">
              Date range
              <X 
                className="h-3 w-3 ml-1 cursor-pointer" 
                onClick={clearDateRange}
              />
            </Badge>
          )}
          {onClear && (
            <Button variant="ghost" size="sm" onClick={onClear}>
              Clear all
            </Button>
          )}
        </div>
      )}

      {/* Export info */}
      <div className="text-xs text-muted-foreground bg-gray-50 p-2 rounded">
        <strong>Export includes:</strong> PAN numbers, payment verification status, and all audit fields. 
        Current filter settings will be applied to the export.
      </div>
    </div>
  )
}