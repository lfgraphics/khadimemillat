"use client"

import React from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { QuickAction } from '@/types/dashboard'

interface ConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  action: QuickAction | null
  itemName: string
  onConfirm: () => void
  loading?: boolean
}

const ACTION_CONFIG = {
  list: {
    title: 'List Item on Marketplace',
    description: 'This will make the item visible to buyers on the marketplace.',
    confirmText: 'List Item',
    variant: 'default' as const
  },
  unlist: {
    title: 'Remove Item from Marketplace',
    description: 'This will hide the item from buyers and remove it from the marketplace.',
    confirmText: 'Unlist Item',
    variant: 'destructive' as const
  },
  sold: {
    title: 'Mark Item as Sold',
    description: 'This will mark the item as sold and remove it from the marketplace. This action cannot be undone.',
    confirmText: 'Mark as Sold',
    variant: 'destructive' as const
  },
  print: {
    title: 'Print Item Label',
    description: 'This will generate and print a label for this item.',
    confirmText: 'Print Label',
    variant: 'default' as const
  }
}

export default function ConfirmationDialog({
  open,
  onOpenChange,
  action,
  itemName,
  onConfirm,
  loading = false
}: ConfirmationDialogProps) {
  if (!action) return null

  const config = ACTION_CONFIG[action]
  const isDestructive = config.variant === 'destructive'

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{config.title}</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="font-medium">{itemName}</span>
            <br />
            <br />
            {config.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={loading}
            className={isDestructive ? 'bg-red-600 hover:bg-red-700' : ''}
          >
            {loading ? 'Processing...' : config.confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}