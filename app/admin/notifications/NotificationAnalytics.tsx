'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  Mail,
  MessageSquare,
  Smartphone,
  Globe,
  Users,
  CheckCircle,
  XCircle
} from 'lucide-react'

interface AnalyticsData {
  totalNotifications: number
  totalSent: number
  totalFailed: number
  successRate: number
  channelStats: {
    [key: string]: {
      sent: number
      failed: number
      successRate: number
    }
  }
  roleStats: {
    [key: string]: {
      sent: number
      failed: number
    }
  }
  dailyStats: Array<{
    date: string
    sent: number
    failed: number
  }>
}

export default function NotificationAnalytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('7d') // 7d, 30d, 90d

  useEffect(() => {
    fetchAnalytics()
  }, [timeRange])

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`/api/admin/notifications/analytics?range=${timeRange}`)
      if (response.ok) {
        const data = await response.json()
        setAnalytics(data)
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email':
        return <Mail className="h-4 w-4" />
      case 'whatsapp':
        return <MessageSquare className="h-4 w-4" />
      case 'sms':
        return <Smartphone className="h-4 w-4" />
      case 'web_push':
        return <Globe className="h-4 w-4" />
      default:
        return <BarChart3 className="h-4 w-4" />
    }
  }

  const formatPercentage = (value: number) => {
    return `${Math.round(value * 100)}%`
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <div className="text-muted-foreground">Loading analytics...</div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <div className="text-muted-foreground">No analytics data available</div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Notification Analytics
          </CardTitle>
          <CardDescription>
            Performance metrics and insights for notification delivery
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {[
              { value: '7d', label: 'Last 7 days' },
              { value: '30d', label: 'Last 30 days' },
              { value: '90d', label: 'Last 90 days' }
            ].map((range) => (
              <Button
                key={range.value}
                variant={timeRange === range.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeRange(range.value)}
              >
                <Calendar className="h-4 w-4 mr-2" />
                {range.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Notifications</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalNotifications}</div>
            <p className="text-xs text-muted-foreground">
              Notifications sent in selected period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatPercentage(analytics.successRate)}
            </div>
            <p className="text-xs text-muted-foreground">
              Overall delivery success rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {analytics.totalSent.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Successfully delivered
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Failed</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {analytics.totalFailed.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Failed deliveries
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Channel Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Channel Performance</CardTitle>
          <CardDescription>
            Success rates and delivery statistics by channel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(analytics.channelStats).map(([channel, stats]) => (
              <div key={channel} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getChannelIcon(channel)}
                  <div>
                    <div className="font-medium capitalize">{channel.replace('_', ' ')}</div>
                    <div className="text-sm text-muted-foreground">
                      {stats.sent + stats.failed} total attempts
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">
                    {formatPercentage(stats.successRate)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {stats.sent} sent, {stats.failed} failed
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Role Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Role Distribution</CardTitle>
          <CardDescription>
            Notification delivery by user role
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(analytics.roleStats).map(([role, stats]) => (
              <div key={role} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Users className="h-4 w-4" />
                  <div>
                    <div className="font-medium capitalize">{role}</div>
                    <div className="text-sm text-muted-foreground">
                      {stats.sent + stats.failed} notifications
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex gap-4 text-sm">
                    <span className="text-green-600">{stats.sent} sent</span>
                    <span className="text-red-600">{stats.failed} failed</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Daily Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Trends</CardTitle>
          <CardDescription>
            Notification volume over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {analytics.dailyStats.slice(-7).map((day) => (
              <div key={day.date} className="flex items-center justify-between p-2 border rounded">
                <div className="text-sm font-medium">
                  {new Date(day.date).toLocaleDateString()}
                </div>
                <div className="flex gap-4 text-sm">
                  <span className="text-green-600">{day.sent} sent</span>
                  <span className="text-red-600">{day.failed} failed</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}