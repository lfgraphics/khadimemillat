"use client"

import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import ScrapItemCard, { ScrapItem } from './ScrapItemCard'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'

export type DonationDetails = {
  id: string
  donor?: { id: string; name?: string; email?: string; phone?: string }
  collectedBy?: { id: string; name?: string; email?: string }
  createdAt?: string
  status?: string
  items: ScrapItem[]
}

export default function DonationDetailsModal({ open, onOpenChange, donation, onItemChange, onItemAction, savingItems, pendingActions }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  donation?: DonationDetails
  onItemChange?: (itemId: string, patch: Partial<ScrapItem> | { beforePhotos?: string[]; afterPhotos?: string[] }) => void
  onItemAction?: (itemId: string, action: 'list' | 'unlist' | 'sold' | 'print') => void
  savingItems?: Record<string, boolean>
  pendingActions?: Record<string, 'list' | 'unlist' | 'sold' | undefined>
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Donation Details</DialogTitle>
        </DialogHeader>
        {!donation ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : (
          <div className="space-y-4">
            <div className="grid md:grid-cols-3 gap-3 text-sm">
              <div>
                <div className="text-muted-foreground">Donor</div>
                <div>{donation.donor?.name || donation.donor?.id}</div>
                <div className="text-muted-foreground">{donation.donor?.email}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Status</div>
                <div className="capitalize">{donation.status || '—'}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Created</div>
                <div>{donation.createdAt ? new Date(donation.createdAt).toLocaleString() : '—'}</div>
              </div>
            </div>
            <Separator />
            <div className="grid gap-5">
              {donation.items?.length ? donation.items.map(it => (
                <ScrapItemCard
                  key={it.id}
                  item={it}
                  onChange={p => onItemChange?.(it.id, p)}
                  onAction={a => onItemAction?.(it.id, a)}
                  saving={!!savingItems?.[it.id]}
                  pendingAction={pendingActions?.[it.id]}
                />
              )) : (
                <div className="text-sm text-muted-foreground">No items found.</div>
              )}
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
