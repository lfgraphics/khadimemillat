import { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import NotificationDashboard from '@/components/admin/NotificationDashboard'

export const metadata: Metadata = {
  title: 'Notification Management - Admin',
  description: 'Comprehensive notification management dashboard',
}

export default async function AdminNotificationsPage() {
  const { userId } = await auth()
  
  if (!userId) {
    redirect('/sign-in')
  }

  // In a real implementation, you would check user role from Clerk metadata
  // For now, we'll assume admin role since this is in the admin section
  const userRole = 'admin' as const

  return <NotificationDashboard userRole={userRole} />
}