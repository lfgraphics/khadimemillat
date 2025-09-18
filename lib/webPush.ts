import webpush from 'web-push'

// Expect these to be configured in environment variables
if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(
      'mailto:admin@khadimemillat.org',
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    )
  } catch (e) {
    console.warn('[webPush] Failed to set VAPID details', e)
  }
} else {
  console.warn('[webPush] VAPID keys missing in environment variables')
}

export interface PushPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  url?: string
  actions?: Array<{ action: string; title: string }>
}

export async function sendWebPushNotification(subscription: PushSubscription, payload: PushPayload) {
  try {
    await webpush.sendNotification(subscription as any, JSON.stringify(payload), {
      TTL: 60 * 60 * 24,
      urgency: 'normal'
    })
    return { success: true }
  } catch (error: any) {
    console.error('[webPush] send error', error?.statusCode, error?.body || error)
    return { success: false, error }
  }
}

export { webpush }
