"use client"
import { useEffect, useState } from 'react'
import { PushNotificationDialog } from './PushNotificationDialog'
import { useUser } from '@clerk/nextjs'

// Lightweight manager to register service worker and manage push subscription dialog.
// Assumptions:
// - Service worker file at /sw.js
// - API endpoint: POST /api/protected/web-push/subscribe (now publicly accessible)
// - VAPID public key exposed via NEXT_PUBLIC_VAPID_PUBLIC_KEY

async function subscribeUser(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false

  const reg = await navigator.serviceWorker.ready
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!vapidKey) return false

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey)
  })

  // Send subscription to server
  await fetch('/api/protected/web-push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription: sub })
  })

  return true
}

async function migratePushSubscription(): Promise<void> {
  // Check if user has an existing push subscription and try to migrate it
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

  try {
    const reg = await navigator.serviceWorker.ready
    const existing = await reg.pushManager.getSubscription()

    if (existing) {
      // Re-send the subscription to the server with the current user's auth
      // The server will update the subscription with the userId if not already set
      await fetch('/api/protected/web-push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: existing })
      })
    }
  } catch (e) {
    console.error('Failed to migrate push subscription:', e)
  }
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

export function WebPushManager() {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { isSignedIn } = useUser()

  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        if (!('serviceWorker' in navigator)) return

        // Register service worker
        await navigator.serviceWorker.register('/sw.js')

        if (!cancelled) setReady(true)
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Push init failed')
      }
    }

    init()
    return () => { cancelled = true }
  }, [])

  // When user logs in, migrate their existing subscription if any
  useEffect(() => {
    if (isSignedIn && ready) {
      migratePushSubscription()
    }
  }, [isSignedIn, ready])

  const handleEnableNotifications = async () => {
    // Request native browser permission
    const permission = await Notification.requestPermission()

    if (permission === 'granted') {
      // Subscribe user to push notifications
      await subscribeUser()
    } else if (permission === 'denied') {
      throw new Error('Notification permission denied')
    }
  }

  // Non-visual manager, but we render the dialog
  if (error) return <span style={{ display: 'none' }} data-push-error={error} />

  return (
    <>
      <span style={{ display: 'none' }} data-push-ready={ready ? 'true' : 'false'} />
      {ready && <PushNotificationDialog onEnableClick={handleEnableNotifications} />}
    </>
  )
}

export default WebPushManager
