"use client"
import { useEffect, useState } from 'react'

// Lightweight manager to register service worker and ensure push subscription is sent to backend.
// Assumptions:
// - Service worker file at /sw.js
// - API endpoints: POST /api/protected/web-push/subscribe, DELETE for unsubscribe
// - VAPID public key exposed via NEXT_PUBLIC_VAPID_PUBLIC_KEY

async function subscribeUser(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false
  const reg = await navigator.serviceWorker.ready
  const existing = await reg.pushManager.getSubscription()
  if (existing) {
    // send existing to server just to ensure persistence
    await fetch('/api/protected/web-push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: existing })
    })
    return true
  }
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!vapidKey) return false
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey)
  })
  await fetch('/api/protected/web-push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription: sub })
  })
  return true
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

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        if (!('serviceWorker' in navigator)) return
        await navigator.serviceWorker.register('/sw.js')
        const ok = await subscribeUser()
        if (!cancelled) setReady(ok)
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Push init failed')
      }
    }
    run()
    return () => { cancelled = true }
  }, [])

  // Non-visual manager, but we can expose simple status for debugging
  if (error) return <span style={{ display: 'none' }} data-push-error={error} />
  return <span style={{ display: 'none' }} data-push-ready={ready ? 'true' : 'false'} />
}

export default WebPushManager
