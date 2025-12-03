import { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import ManageSubscriptions from '../components/ManageSubscriptions'

export const metadata: Metadata = {
  title: 'Manage Subscriptions - Khadim-e-Millat Welfare Foundation',
  description: 'Manage your recurring Sadqa subscriptions, view payment history, and update your giving preferences.',
}

export default async function ManageSubscriptionsPage() {
  const { userId } = await auth()
  
  if (!userId) {
    redirect('/sign-in?redirect_url=/sadqa-subscription/manage')
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Manage Your Subscriptions
          </h1>
          <p className="text-muted-foreground text-lg">
            View and manage your recurring Sadqa donations, payment history, and subscription settings.
          </p>
        </div>

        <ManageSubscriptions />
      </div>
    </div>
  )
}