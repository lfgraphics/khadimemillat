'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, Plus, BarChart3 } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import SubscriptionCard from './SubscriptionCard'
import SubscriptionStats from './SubscriptionStats'
import PaymentHistory from './PaymentHistory'

interface Subscription {
  _id: string
  planType: string
  amount: number
  status: string
  startDate: string
  nextPaymentDate: string
  totalPaid: number
  paymentCount: number
  failedPaymentCount: number
}

interface SubscriptionStats {
  total: number
  active: number
  paused: number
  cancelled: number
  expired: number
  pending_payment?: number
  totalDonated: number
}

export default function ManageSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [stats, setStats] = useState<SubscriptionStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    fetchSubscriptions()
  }, [])

  const fetchSubscriptions = async () => {
    try {
      const response = await fetch('/api/sadqa-subscription/my-subscriptions')
      const data = await response.json()

      if (data.success) {
        console.log('Subscriptions loaded:', data.subscriptions)
        console.log('Stats:', data.stats)
        setSubscriptions(data.subscriptions)
        setStats(data.stats)
      } else {
        console.error('Failed to load subscriptions:', data.error)
        toast.error('Failed to load subscriptions')
      }
    } catch (error) {
      console.error('Error fetching subscriptions:', error)
      toast.error('Failed to load subscriptions')
    } finally {
      setLoading(false)
    }
  }



  const handleSubscriptionUpdate = (updatedSubscription: Subscription) => {
    setSubscriptions(prev => 
      prev.map(sub => 
        sub._id === updatedSubscription._id ? updatedSubscription : sub
      )
    )
    // Refresh stats
    fetchSubscriptions()
  }



  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading your subscriptions...</span>
      </div>
    )
  }

  if (subscriptions.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <div className="mb-6">
            <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center mb-4">
              <BarChart3 className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No Subscriptions Yet</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Start your journey of continuous giving by creating your first Sadqa subscription.
            </p>
          </div>
          <Button asChild>
            <Link href="/sadqa-subscription">
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Subscription
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Statistics Overview */}
      {stats && <SubscriptionStats stats={stats} />}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="active">Active ({stats?.active || 0})</TabsTrigger>
            <TabsTrigger value="history">Payment History</TabsTrigger>
          </TabsList>
          
          <Button asChild variant="outline">
            <Link href="/sadqa-subscription">
              <Plus className="w-4 h-4 mr-2" />
              New Subscription
            </Link>
          </Button>
        </div>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4">
            {subscriptions.map((subscription) => (
              <SubscriptionCard
                key={subscription._id}
                subscription={subscription}
                onUpdate={handleSubscriptionUpdate}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          <div className="grid gap-4">
            {subscriptions
              .filter(sub => sub.status === 'active')
              .map((subscription) => (
                <SubscriptionCard
                  key={subscription._id}
                  subscription={subscription}
                  onUpdate={handleSubscriptionUpdate}
                />
              ))}
          </div>
          
          {subscriptions.filter(sub => sub.status === 'active').length === 0 && (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">No active subscriptions</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history">
          <PaymentHistory subscriptions={subscriptions} />
        </TabsContent>
      </Tabs>
    </div>
  )
}