'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  CheckCircle, 
  Heart, 
  Calendar, 
  CreditCard, 
  ArrowRight,
  Loader2,
  Share2,
  Download
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface SubscriptionSuccessProps {
  subscriptionId?: string
}

interface Subscription {
  _id: string
  planType: string
  amount: number
  status: string
  startDate: string
  nextPaymentDate: string
  userName: string
  userEmail: string
}

export default function SubscriptionSuccess({ subscriptionId }: SubscriptionSuccessProps) {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (subscriptionId) {
      fetchSubscription()
    } else {
      setLoading(false)
    }
  }, [subscriptionId])

  const fetchSubscription = async () => {
    try {
      const response = await fetch(`/api/sadqa-subscription/${subscriptionId}`)
      const data = await response.json()

      if (data.success) {
        setSubscription(data.subscription)
      } else {
        toast.error('Failed to load subscription details')
      }
    } catch (error) {
      console.error('Error fetching subscription:', error)
      toast.error('Failed to load subscription details')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const handleShare = async () => {
    const shareData = {
      title: 'I just set up a recurring Sadqa donation!',
      text: `I'm now contributing ₹${subscription?.amount} ${subscription?.planType} to support welfare programs. Join me in making a continuous impact!`,
      url: window.location.origin + '/sadqa-subscription'
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch (error) {
        // User cancelled sharing
      }
    } else {
      // Fallback to copying to clipboard
      navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`)
      toast.success('Shared text copied to clipboard!')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading subscription details...</span>
      </div>
    )
  }

  if (!subscription) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4">Subscription Created Successfully!</h1>
          <p className="text-muted-foreground mb-6">
            Your Sadqa subscription has been set up. You should receive a confirmation email shortly.
          </p>
          <div className="flex gap-3 justify-center">
            <Button asChild>
              <Link href="/sadqa-subscription/manage">
                View My Subscriptions
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/">
                Back to Home
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Success Header */}
      <Card className="text-center">
        <CardContent className="py-8">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold mb-4">
            Subscription Created Successfully!
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Thank you for setting up your recurring Sadqa donation. Your continuous support will make a lasting impact on our welfare programs.
          </p>
        </CardContent>
      </Card>

      {/* Subscription Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-primary" />
            Your Subscription Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Plan Type:</span>
                <Badge variant="secondary" className="capitalize">
                  {subscription.planType} Sadqa
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Amount:</span>
                <span className="text-xl font-bold">₹{subscription.amount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Status:</span>
                <Badge className="bg-green-500 text-white">
                  {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                </Badge>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Started:</span>
                <span className="font-medium">{formatDate(subscription.startDate)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Next Payment:</span>
                <span className="font-medium">{formatDate(subscription.nextPaymentDate)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Frequency:</span>
                <span className="font-medium capitalize">{subscription.planType}</span>
              </div>
            </div>
          </div>

          {/* Impact Message */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 p-6 rounded-lg border border-green-200 dark:border-green-800">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-500" />
              Your Continuous Impact
            </h3>
            <p className="text-sm text-muted-foreground">
              Your {subscription.planType} contribution of ₹{subscription.amount} will help us provide consistent support to families in need, 
              fund educational programs, and maintain our welfare initiatives throughout the year.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* What Happens Next */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            What Happens Next?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 mt-0.5">
                1
              </div>
              <div>
                <h4 className="font-medium">Automatic Payments</h4>
                <p className="text-sm text-muted-foreground">
                  Your {subscription.planType} payments will be processed automatically. You'll receive receipts via email and SMS.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 mt-0.5">
                2
              </div>
              <div>
                <h4 className="font-medium">Impact Updates</h4>
                <p className="text-sm text-muted-foreground">
                  We'll send you regular updates about how your donations are making a difference in the community.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 mt-0.5">
                3
              </div>
              <div>
                <h4 className="font-medium">Easy Management</h4>
                <p className="text-sm text-muted-foreground">
                  You can pause, modify, or cancel your subscription anytime from your dashboard.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button asChild className="flex-1">
          <Link href="/sadqa-subscription/manage">
            <CreditCard className="w-4 h-4 mr-2" />
            Manage Subscriptions
          </Link>
        </Button>
        
        <Button variant="outline" onClick={handleShare}>
          <Share2 className="w-4 h-4 mr-2" />
          Share Your Impact
        </Button>
        
        <Button variant="outline" asChild>
          <Link href="/">
            Back to Home
          </Link>
        </Button>
      </div>

      {/* Additional Information */}
      <Card>
        <CardContent className="py-6">
          <div className="text-center space-y-2">
            <h3 className="font-semibold">Need Help?</h3>
            <p className="text-sm text-muted-foreground">
              If you have any questions about your subscription, please contact our support team.
            </p>
            <div className="flex justify-center gap-4 text-sm">
              <span>📧 support@khadimemillat.org</span>
              <span>📞 +91 80817 47259</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}