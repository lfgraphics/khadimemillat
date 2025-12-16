import { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import { redirectToSignIn } from '@/lib/auth-redirect'
import NotificationForm from '@/app/admin/notifications/NotificationForm'

export const metadata: Metadata = {
  title: 'Compose Notification - Admin',
  description: 'Create and send a new notification to targeted users',
}

export default async function ComposeNotificationPage() {
  const { userId } = await auth()
  if (!userId) redirectToSignIn('/admin/notifications/compose')

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Compose Notification</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Choose channels and target roles, then send.
        </p>
        <NotificationForm />
      </div>
    </div>
  )
}
