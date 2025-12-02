import { Metadata } from 'next'
import PlanComparison from '../components/PlanComparison'

export const metadata: Metadata = {
  title: 'Subscription Plans - Khadim-e-Millat Welfare Foundation',
  description: 'Compare our Sadqa subscription plans and choose the frequency that works best for your charitable giving.',
}

export default function SubscriptionPlansPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Choose Your Giving Plan
          </h1>
          <p className="text-muted-foreground text-lg max-w-3xl mx-auto">
            Select the subscription frequency that fits your lifestyle and budget. 
            All plans support the same welfare programs with flexible amounts.
          </p>
        </div>

        <PlanComparison />
      </div>
    </div>
  )
}