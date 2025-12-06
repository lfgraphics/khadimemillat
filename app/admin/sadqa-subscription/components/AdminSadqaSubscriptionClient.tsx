'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { 
  Loader2, 
  Users, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle,
  RefreshCw,
  Search,
  Download,
  Calendar,
  CreditCard,
  Heart
} from 'lucide-react'
import { toast } from 'sonner'

interface SubscriptionStats {
  total: number
  active: number
  paused: number
  cancelled: number
  expired: number
  pending_payment: number
  totalRevenue: number
  monthlyRevenue: number
  averageAmount: number
}

interface Subscription {
  _id: string
  planType: string
  amount: number
  status: string
  startDate: string
  nextPaymentDate?: string
  totalPaid: number
  paymentCount: number
  failedPaymentCount: number
  userName: string
  userEmail: string
  userPhone?: string
  razorpaySubscriptionId?: string
}

export default function AdminSadqaSubscriptionClient() {
  const [stats, setStats] = useState<SubscriptionStats | null>(null)
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [filteredSubscriptions, setFilteredSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    filterSubscriptions()
  }, [subscriptions, searchTerm, statusFilter])

  const fetchData = async () => {
    try {
      const response = await fetch('/api/admin/sadqa-subscription/overview')
      const data = await response.json()

      if (data.success) {
        setStats(data.stats)
        setSubscriptions(data.subscriptions)
      } else {
        toast.error('Failed to load subscription data')
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load subscription data')
    } finally {
      setLoading(false)
    }
  }

  const filterSubscriptions = () => {
    let filtered = subscriptions

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(sub => 
        sub.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub._id.includes(searchTerm)
      )
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(sub => sub.status === statusFilter)
    }

    setFilteredSubscriptions(filtered)
  }

  const handleSyncAll = async () => {
    setSyncing(true)
    
    try {
      const response = await fetch('/api/admin/sadqa-subscription/sync-all', {
        method: 'POST'
      })
      const data = await response.json()

      if (data.success) {
        toast.success(`Synced ${data.syncedCount} subscriptions successfully`)
        fetchData() // Refresh data
      } else {
        toast.error(data.error || 'Failed to sync subscriptions')
      }
    } catch (error) {
      console.error('Error syncing subscriptions:', error)
      toast.error('Failed to sync subscriptions')
    } finally {
      setSyncing(false)
    }
  }

  const handleExportData = async () => {
    try {
      const response = await fetch('/api/admin/sadqa-subscription/export')
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `sadqa-subscriptions-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        toast.success('Data exported successfully')
      } else {
        toast.error('Failed to export data')
      }
    } catch (error) {
      console.error('Error exporting data:', error)
      toast.error('Failed to export data')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'paused': return 'bg-yellow-100 text-yellow-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      case 'expired': return 'bg-gray-100 text-gray-800'
      case 'pending_payment': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading subscription data...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Subscriptions</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Users className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Subscriptions</p>
                  <p className="text-2xl font-bold text-green-600">{stats.active}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Monthly Revenue</p>
                  <p className="text-2xl font-bold text-primary">{formatCurrency(stats.monthlyRevenue)}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Issues</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.pending_payment}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-2">
          <Button onClick={handleSyncAll} disabled={syncing} variant="outline">
            {syncing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Sync All
              </>
            )}
          </Button>
          <Button onClick={handleExportData} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </Button>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search subscriptions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="active">Active ({stats?.active || 0})</TabsTrigger>
          <TabsTrigger value="issues">Issues ({stats?.pending_payment || 0})</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <SubscriptionsList 
            subscriptions={filteredSubscriptions}
            getStatusColor={getStatusColor}
            formatCurrency={formatCurrency}
          />
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          <SubscriptionsList 
            subscriptions={filteredSubscriptions.filter(sub => sub.status === 'active')}
            getStatusColor={getStatusColor}
            formatCurrency={formatCurrency}
          />
        </TabsContent>

        <TabsContent value="issues" className="space-y-4">
          <SubscriptionsList 
            subscriptions={filteredSubscriptions.filter(sub => sub.status === 'pending_payment')}
            getStatusColor={getStatusColor}
            formatCurrency={formatCurrency}
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <AnalyticsView stats={stats} formatCurrency={formatCurrency} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function SubscriptionsList({ 
  subscriptions, 
  getStatusColor, 
  formatCurrency 
}: { 
  subscriptions: Subscription[]
  getStatusColor: (status: string) => string
  formatCurrency: (amount: number) => string
}) {
  if (subscriptions.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No Subscriptions Found</h3>
          <p className="text-muted-foreground">No subscriptions match your current filters.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {subscriptions.map((subscription) => (
        <Card key={subscription._id}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-lg">{subscription.userName}</h3>
                <p className="text-muted-foreground">{subscription.userEmail}</p>
                {subscription.userPhone && (
                  <p className="text-sm text-muted-foreground">{subscription.userPhone}</p>
                )}
              </div>
              <Badge className={getStatusColor(subscription.status)}>
                {subscription.status.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Plan Type</span>
                <p className="font-medium capitalize">{subscription.planType}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Amount</span>
                <p className="font-medium">{formatCurrency(subscription.amount)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Total Paid</span>
                <p className="font-medium">{formatCurrency(subscription.totalPaid)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Payments</span>
                <p className="font-medium">{subscription.paymentCount}</p>
              </div>
            </div>

            {subscription.nextPaymentDate && subscription.status === 'active' && (
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4" />
                  <span>Next payment: {new Date(subscription.nextPaymentDate).toLocaleDateString()}</span>
                </div>
              </div>
            )}

            {subscription.failedPaymentCount > 0 && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-red-800">
                  <AlertCircle className="w-4 h-4" />
                  <span>{subscription.failedPaymentCount} failed payments</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function AnalyticsView({ 
  stats, 
  formatCurrency 
}: { 
  stats: SubscriptionStats | null
  formatCurrency: (amount: number) => string
}) {
  if (!stats) return null

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Revenue Analytics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Revenue</span>
            <span className="font-bold">{formatCurrency(stats.totalRevenue)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Monthly Revenue</span>
            <span className="font-bold">{formatCurrency(stats.monthlyRevenue)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Average Amount</span>
            <span className="font-bold">{formatCurrency(stats.averageAmount)}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Subscription Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Active</span>
            <span className="font-bold text-green-600">{stats.active}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Paused</span>
            <span className="font-bold text-yellow-600">{stats.paused}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Cancelled</span>
            <span className="font-bold text-red-600">{stats.cancelled}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Issues</span>
            <span className="font-bold text-orange-600">{stats.pending_payment}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}