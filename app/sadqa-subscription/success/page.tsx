import { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import SubscriptionSuccess from '../components/SubscriptionSuccess'

export const metadata: Metadata = {
  title: 'Subscription Created Successfully - Khadim-e-Millat Welfare Foundation',
  description: 'Your Sadqa subscription has been created successfully. Thank you for your continuous support.',
}

export default async function SubscriptionSuccessPage({
  searchParams
}: {
  searchParams: { id?: string }
}) {
  const { userId } = await auth()
  
  if (!userId) {
    redirect('/sign-in')
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Suspense fallback={<div>Loading...</div>}>
          <SubscriptionSuccess subscriptionId={(await searchParams).id} />
        </Suspense>
      </div>
    </div>
  )
}