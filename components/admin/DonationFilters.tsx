"use client"

import React from 'react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { Calendar as CalendarIcon, X } from 'lucide-react'

export type DonationFiltersState = {
  status?: string
  itemStatus?: string
  q?: string
  from?: Date
  to?: Date
}

export function DonationFilters({ value, onChange, onClear }: {
  value: DonationFiltersState,
  onChange: (v: DonationFiltersState) => void,
  onClear?: () => void
}) {
  const set = (patch: Partial<DonationFiltersState>) => onChange({ ...value, ...patch })

  return (
    <div className="flex flex-col md:flex-row gap-2 md:items-end w-full">
      <div className="flex-1">
        <label className="text-xs text-muted-foreground">Search donor</label>
        <Input placeholder="Name or email" value={value.q || ''} onChange={e => set({ q: e.target.value })} />
      </div>
      <div>
        <label className="text-xs text-muted-foreground">Donation status</label>
        <Select value={value.status ?? 'any'} onValueChange={v => set({ status: v === 'any' ? undefined : v })}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Any" /></SelectTrigger>
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
      <div>
        <label className="text-xs text-muted-foreground">Item status</label>
        <Select value={value.itemStatus ?? 'any'} onValueChange={v => set({ itemStatus: v === 'any' ? undefined : v })}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Any" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any</SelectItem>
            <SelectItem value="listed">Listed</SelectItem>
            <SelectItem value="unlisted">Unlisted</SelectItem>
            <SelectItem value="sold">Sold</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <DatePicker label="From" value={value.from} onChange={d => set({ from: d })} />
        <DatePicker label="To" value={value.to} onChange={d => set({ to: d })} />
      </div>
      <div className="ml-auto flex gap-2">
        {onClear && <Button variant="outline" onClick={onClear}><X className="h-4 w-4 mr-1"/>Clear</Button>}
      </div>
    </div>
  )
}

function DatePicker({ label, value, onChange }: { label: string, value?: Date, onChange: (d?: Date) => void }) {
  const [open, setOpen] = React.useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant={"outline"} className={cn("w-[160px] justify-start text-left font-normal", !value && "text-muted-foreground")}> 
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? value.toLocaleDateString() : label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0" align="start">
        <Calendar mode="single" selected={value} onSelect={onChange} initialFocus />
      </PopoverContent>
    </Popover>
  )
}

export default DonationFilters
