import { Metadata } from 'next'
import { checkRole } from '@/utils/roles'
import { redirect } from 'next/navigation'
import AdminSadqaSubscriptionClient from './components/AdminSadqaSubscriptionClient'

export const metadata: Metadata = {
  title: 'Sadqa Subscriptions Management - Admin',
  description: 'Manage and monitor all sadqa subscriptions, view analytics, and handle subscription issues.',
}

export default async function AdminSadqaSubscriptionPage() {
  const isAdmin = await checkRole('admin')
  const isModerator = await checkRole('moderator')
  
  if (!isAdmin && !isModerator) {
    redirect('/unauthorized')
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Sadqa Subscriptions Management</h1>
          <p className="text-muted-foreground">
            Monitor and manage all sadqa subscriptions, view analytics, and resolve issues.
          </p>
        </div>

        <AdminSadqaSubscriptionClient />
      </div>
    </div>
  )
}