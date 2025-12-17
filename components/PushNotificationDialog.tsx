"use client"

import { useState, useEffect } from 'react'
import { Bell, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const STORAGE_KEY = 'kmwf.pushNotification.askLater'
const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000 // 2 days in milliseconds

interface PushNotificationDialogProps {
  onEnableClick: () => Promise<void>
}

export function PushNotificationDialog({ onEnableClick }: PushNotificationDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Check if browser supports notifications
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      return
    }

    // Check if notification permission is already granted or denied
    if (Notification.permission !== 'default') {
      return
    }

    // Check localStorage for "Ask Later" timestamp
    try {
      const askLaterTimestamp = localStorage.getItem(STORAGE_KEY)
      if (askLaterTimestamp) {
        const timestamp = parseInt(askLaterTimestamp, 10)
        const now = Date.now()
        
        // If less than 2 days have passed, don't show dialog
        if (now - timestamp < TWO_DAYS_MS) {
          return
        }
        
        // More than 2 days have passed, clear the storage and show dialog
        localStorage.removeItem(STORAGE_KEY)
      }
    } catch (e) {
      console.error('Error accessing localStorage:', e)
    }

    // Show the dialog after a small delay to avoid overwhelming the user on page load
    const timer = setTimeout(() => {
      setOpen(true)
    }, 2000) // Show after 2 seconds

    return () => clearTimeout(timer)
  }, [])

  const handleEnable = async () => {
    setLoading(true)
    try {
      await onEnableClick()
      setOpen(false)
    } catch (error) {
      console.error('Failed to enable notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAskLater = () => {
    try {
      // Store current timestamp in localStorage
      localStorage.setItem(STORAGE_KEY, Date.now().toString())
    } catch (e) {
      console.error('Error saving to localStorage:', e)
    }
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Bell className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Stay Updated!</DialogTitle>
          <DialogDescription className="text-center">
            Enable push notifications to receive important updates about:
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-2 py-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              ✓
            </div>
            <p className="text-sm text-muted-foreground">
              New donation opportunities and programs
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              ✓
            </div>
            <p className="text-sm text-muted-foreground">
              Important announcements and updates
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              ✓
            </div>
            <p className="text-sm text-muted-foreground">
              Status updates for your contributions
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button 
            onClick={handleEnable} 
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Enabling...' : 'Enable Notifications'}
          </Button>
          <Button 
            variant="ghost" 
            onClick={handleAskLater}
            disabled={loading}
            className="w-full"
          >
            Ask Me Later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
