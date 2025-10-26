import { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import { redirectToSignIn } from '@/lib/auth-redirect'
import NotificationHistory from '@/app/admin/notifications/NotificationHistory'

export const metadata: Metadata = {
  title: 'Notification History - Admin',
  description: 'Browse sent notifications and delivery details',
}

export default async function NotificationHistoryPage() {
  const { userId } = await auth()
  if (!userId) redirectToSignIn('/admin/notifications/history')

  return (
    <div className="container mx-auto p-6">
      <NotificationHistory />
    </div>
  )
}
