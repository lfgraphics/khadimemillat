'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Bell,
  Send,
  AlertTriangle,
  FileText,
  BarChart3,
  RefreshCw,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp
} from 'lucide-react'
import { useUser } from '@clerk/nextjs'
import RoleGuard from '@/components/role-guard'
import MetricsOverview from './MetricsOverview'
import QuickActions from './QuickActions'

interface DashboardMetrics {
  todayStats: {
    sent: number
    failed: number
    successRate: number
  }
  channelStats: {
    [key: string]: {
      sent: number
      failed: number
      successRate: number
    }
  }
  recentActivity: NotificationActivity[]
  activeTemplates: number
  scheduledNotifications: number
  trends: {
    date: string
    sent: number
    failed: number
    successRate: number
  }[]
  channelPerformance: {
    channel: string
    sent: number
    failed: number
    successRate: number
  }[]
}

interface NotificationActivity {
  id: string
  type: string
  message: string
  timestamp: Date
  status: 'success' | 'failed' | 'pending'
  channel: string
}

interface NotificationDashboardProps {
  userRole: 'admin' | 'moderator'
  initialMetrics?: DashboardMetrics
}

export default function NotificationDashboard({ initialMetrics }: NotificationDashboardProps) {
  // const { user } = useUser()
  const [metrics, setMetrics] = useState<DashboardMetrics>(initialMetrics || {
    todayStats: { sent: 0, failed: 0, successRate: 0 },
    channelStats: {},
    recentActivity: [],
    activeTemplates: 0,
    scheduledNotifications: 0,
    trends: [],
    channelPerformance: []
  })
  const [loading, setLoading] = useState(!initialMetrics)
  const [refreshing, setRefreshing] = useState(false)
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h')

  useEffect(() => {
    if (!initialMetrics) {
      fetchMetrics()
    }

    // Listen for refresh events from MetricsOverview
    const handleRefreshMetrics = () => {
      fetchMetrics()
    }

    // Keyboard shortcuts
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key.toLowerCase()) {
          case 'n':
            event.preventDefault()
            handleQuickAction('new-notification')
            break
          case 'e':
            event.preventDefault()
            handleQuickAction('emergency-alert')
            break
          case 't':
            event.preventDefault()
            handleQuickAction('view-templates')
            break
          case 'a':
            event.preventDefault()
            handleQuickAction('analytics')
            break
        }
      }
    }

    window.addEventListener('refreshMetrics', handleRefreshMetrics)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('refreshMetrics', handleRefreshMetrics)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [initialMetrics])

  const fetchMetrics = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/notifications/dashboard/metrics?timeRange=${timeRange}`)
      if (response.ok) {
        const data = await response.json()
        setMetrics(data)
      }
    } catch (error) {
      console.error('Failed to fetch dashboard metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchMetrics()
    setRefreshing(false)
  }

  useEffect(()=>{
    fetchMetrics()
  },[timeRange])

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'new-notification':
        // Navigate to notification composer
        window.location.href = '/admin/notifications/compose'
        break
      case 'emergency-alert':
        // Navigate to emergency notification
        window.location.href = '/admin/notifications/emergency'
        break
      case 'view-templates':
        // Navigate to template manager
        window.location.href = '/admin/notifications/templates'
        break
      case 'analytics':
        // Navigate to analytics dashboard
        window.location.href = '/admin/notifications/analytics'
        break
    }
  }

  return (
    <RoleGuard allowedRoles={['admin', 'moderator']}>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Notification Management</h1>
            <p className="text-muted-foreground">
              Comprehensive dashboard for managing notifications across all channels
            </p>
          </div>
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Main Dashboard Content */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
            <TabsTrigger value="channels">Channels</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Quick Stats */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Today's Sent</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {loading ? '...' : metrics.todayStats.sent.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Successful notifications today
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {loading ? '...' : `${metrics.todayStats.successRate.toFixed(1)}%`}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Overall delivery success rate
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Templates</CardTitle>
                  <FileText className="h-4 w-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">
                    {loading ? '...' : metrics.activeTemplates}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Available notification templates
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
                  <Clock className="h-4 w-4 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">
                    {loading ? '...' : metrics.scheduledNotifications}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Pending scheduled notifications
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions Panel */}
            <QuickActions
              onNewNotification={() => handleQuickAction('new-notification')}
              onEmergencyNotification={() => handleQuickAction('emergency-alert')}
              onViewTemplates={() => handleQuickAction('view-templates')}
              onViewAnalytics={() => handleQuickAction('analytics')}
            />
          </TabsContent>

          <TabsContent value="metrics">
            <MetricsOverview
              metrics={metrics}
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
            />
          </TabsContent>

          <TabsContent value="channels" className="space-y-6">

            {/* Channel Performance Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Cel Per Performance</CardTitle>
                <CardDescription>
                  Today's performance across all notification channels
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(metrics.channelStats).map(([channel, stats]) => (
                    <div key={channel} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                          <Bell className="h-4 w-4" />
                          <span className="font-medium capitalize">
                            {channel.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-sm text-muted-foreground">
                          {stats.sent} sent
                        </div>
                        <Badge
                          variant={stats.successRate > 90 ? 'default' : stats.successRate > 70 ? 'secondary' : 'destructive'}
                        >
                          {stats.successRate.toFixed(1)}% success
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {Object.keys(metrics.channelStats).length === 0 && !loading && (
                    <div className="text-center text-muted-foreground py-8">
                      No channel activity today
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Laerfication activities and status updates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metrics.recentActivity.slice(0, 10).map((activity, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`h-2 w-2 rounded-full ${activity.status === 'success' ? 'bg-green-500' :
                            activity.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500'
                          }`} />
                        <div>
                          <p className="text-sm font-medium">{activity.message}</p>
                          <p className="text-xs text-muted-foreground">
                            {activity.channel} • {new Date(activity.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <Badge variant={
                        activity.status === 'success' ? 'default' :
                          activity.status === 'failed' ? 'destructive' : 'secondary'
                      }>
                        {activity.status}
                      </Badge>
                    </div>
                  ))}
                  {metrics.recentActivity.length === 0 && !loading && (
                    <div className="text-center text-muted-foreground py-8">
                      No recent activity
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </RoleGuard>
  )
}