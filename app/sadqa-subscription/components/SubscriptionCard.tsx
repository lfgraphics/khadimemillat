'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { 
  Clock, 
  Calendar, 
  CreditCard, 
  Award, 
  MoreVertical, 
  Pause, 
  Play, 
  X, 
  Loader2,
  AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'

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

interface SubscriptionCardProps {
  subscription: Subscription
  onUpdate: (updatedSubscription: Subscription) => void
}

const planIcons = {
  daily: Clock,
  weekly: Calendar,
  monthly: CreditCard,
  yearly: Award
}

const statusColors = {
  active: 'bg-green-500',
  paused: 'bg-yellow-500',
  cancelled: 'bg-red-500',
  expired: 'bg-gray-500',
  pending_payment: 'bg-orange-500'
}

const statusLabels = {
  active: 'Active',
  paused: 'Paused',
  cancelled: 'Cancelled',
  expired: 'Expired',
  pending_payment: 'Payment Processing'
}

export default function SubscriptionCard({ subscription, onUpdate }: SubscriptionCardProps) {
  const [loading, setLoading] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [showPauseDialog, setShowPauseDialog] = useState(false)

  console.log('SubscriptionCard received:', subscription)

  const Icon = planIcons[subscription.planType as keyof typeof planIcons] || CreditCard

  const handleStatusChange = async (newStatus: string, reason?: string) => {
    setLoading(true)
    
    try {
      const response = await fetch(`/api/sadqa-subscription/${subscription._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: newStatus,
          pausedReason: newStatus === 'paused' ? reason : undefined,
          cancelledReason: newStatus === 'cancelled' ? reason : undefined
        })
      })

      const result = await response.json()

      if (result.success) {
        toast.success(result.message)
        onUpdate(result.subscription)
      } else {
        toast.error(result.error || 'Failed to update subscription')
      }
    } catch (error) {
      console.error('Error updating subscription:', error)
      toast.error('Failed to update subscription')
    } finally {
      setLoading(false)
      setShowCancelDialog(false)
      setShowPauseDialog(false)
    }
  }

  const handleCancel = () => {
    handleStatusChange('cancelled', 'Cancelled by user')
  }

  const handlePause = () => {
    handleStatusChange('paused', 'Paused by user')
  }

  const handleResume = () => {
    handleStatusChange('active')
  }



  const handleRemoveSubscription = async () => {
    setLoading(true)
    
    try {
      const response = await fetch(`/api/sadqa-subscription/${subscription._id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          cancelReason: 'Removed from list by user'
        })
      })

      const result = await response.json()

      if (result.success) {
        toast.success('Subscription removed from list')
        // Trigger a refresh of the subscription list
        window.location.reload()
      } else {
        toast.error(result.error || 'Failed to remove subscription')
      }
    } catch (error) {
      console.error('Error removing subscription:', error)
      toast.error('Failed to remove subscription')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const getNextPaymentText = () => {
    if (subscription.status !== 'active') return null
    
    const nextDate = new Date(subscription.nextPaymentDate)
    const today = new Date()
    const diffTime = nextDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) return 'Overdue'
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Tomorrow'
    return `In ${diffDays} days`
  }

  return (
    <>
      <Card className="relative">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg capitalize">
                {subscription.planType} Sadqa
              </CardTitle>
              <div className="flex items-center space-x-2">
                <Badge 
                  variant="secondary" 
                  className={`${statusColors[subscription.status as keyof typeof statusColors]} text-white`}
                >
                  {statusLabels[subscription.status as keyof typeof statusLabels]}
                </Badge>
                {subscription.failedPaymentCount > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    {subscription.failedPaymentCount} failed
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" disabled={loading}>
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <MoreVertical className="w-4 h-4" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {subscription.status === 'active' && (
                <>
                  <DropdownMenuItem onClick={() => setShowPauseDialog(true)}>
                    <Pause className="w-4 h-4 mr-2" />
                    Pause Subscription
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setShowCancelDialog(true)}
                    className="text-destructive"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel Subscription
                  </DropdownMenuItem>
                </>
              )}
              {subscription.status === 'paused' && (
                <DropdownMenuItem onClick={handleResume}>
                  <Play className="w-4 h-4 mr-2" />
                  Resume Subscription
                </DropdownMenuItem>
              )}

              {(subscription.status === 'expired' || subscription.status === 'cancelled') && (
                <DropdownMenuItem 
                  onClick={() => handleRemoveSubscription()}
                  className="text-destructive"
                >
                  <X className="w-4 h-4 mr-2" />
                  Remove from List
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Amount</p>
              <p className="font-semibold text-lg">₹{subscription.amount}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Total Paid</p>
              <p className="font-semibold">₹{subscription.totalPaid}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Payments</p>
              <p className="font-semibold">{subscription.paymentCount}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Started</p>
              <p className="font-semibold">{formatDate(subscription.startDate)}</p>
            </div>
          </div>

          {subscription.status === 'active' && (
            <div className="bg-muted/50 p-3 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Next Payment</span>
                <div className="text-right">
                  <p className="font-medium">{formatDate(subscription.nextPaymentDate)}</p>
                  <p className="text-xs text-muted-foreground">{getNextPaymentText()}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this subscription? This action cannot be undone, 
              but you can create a new subscription anytime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Cancel Subscription
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Pause Confirmation Dialog */}
      <AlertDialog open={showPauseDialog} onOpenChange={setShowPauseDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pause Subscription</AlertDialogTitle>
            <AlertDialogDescription>
              Your subscription will be paused and no payments will be processed. 
              You can resume it anytime from your dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Active</AlertDialogCancel>
            <AlertDialogAction onClick={handlePause}>
              Pause Subscription
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}