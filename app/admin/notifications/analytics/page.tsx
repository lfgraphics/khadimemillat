import { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import { redirectToSignIn } from '@/lib/auth-redirect'
import NotificationAnalytics from '@/app/admin/notifications/NotificationAnalytics'

export const metadata: Metadata = {
  title: 'Notification Analytics - Admin',
  description: 'Analyze notification performance and trends',
}

export default async function NotificationAnalyticsPage() {
  const { userId } = await auth()
  if (!userId) redirectToSignIn('/admin/notifications/analytics')

  return (
    <div className="container mx-auto p-6">
      <NotificationAnalytics />
    </div>
  )
}
