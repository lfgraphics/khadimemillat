import { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import SubscriptionSetup from './components/SubscriptionSetup'

export const metadata: Metadata = {
  title: 'Sadqa Subscription - Khadim-e-Millat Welfare Foundation',
  description: 'Set up your recurring Sadqa donations with flexible daily, weekly, monthly, or yearly plans. Make charity a habit with automated giving.',
}

export default async function SadqaSubscriptionPage({
  searchParams
}: {
  searchParams: Promise<{ amount?: string; redirect?: string }>
}) {
  const { userId } = await auth()
  
  if (!userId) {
    redirect('/sign-in?redirect_url=/sadqa-subscription')
  }

  const params = await searchParams

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Set Up Your Sadqa Subscription
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Make charity a habit with automated recurring donations. Choose your frequency and amount to start your continuous giving journey.
          </p>
        </div>

        <SubscriptionSetup 
          prefilledAmount={params.amount ? parseInt(params.amount) : undefined}
          redirectSource={params.redirect}
        />
      </div>
    </div>
  )
}