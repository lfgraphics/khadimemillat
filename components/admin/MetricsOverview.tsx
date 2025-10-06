'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Mail,
  MessageSquare,
  Smartphone,
  Globe,
  RefreshCw
} from 'lucide-react'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface MetricsOverviewProps {
  metrics: DashboardMetrics
  timeRange: '1h' | '24h' | '7d' | '30d'
  onTimeRangeChange: (range: '1h' | '24h' | '7d' | '30d') => void
}

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

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

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
      return <Globe className="h-4 w-4" />
  }
}

export default function MetricsOverview({ metrics, timeRange, onTimeRangeChange }: MetricsOverviewProps) {
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(new Date())

  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      setLastUpdated(new Date())
      // Trigger refresh of parent component
      window.dispatchEvent(new CustomEvent('refreshMetrics'))
    }, 30000) // Refresh every 30 seconds

    return () => clearInterval(interval)
  }, [autoRefresh])

  const totalNotifications = metrics.todayStats.sent + metrics.todayStats.failed
  const previousDayComparison = metrics.trends.length > 1 ?
    metrics.trends[metrics.trends.length - 1].sent - metrics.trends[metrics.trends.length - 2].sent : 0

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Performance Overview</h2>
          <p className="text-muted-foreground">
            Real-time statistics and trends for {timeRange}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={timeRange} onValueChange={onTimeRangeChange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last 1h</SelectItem>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'Auto' : 'Manual'}
          </Button>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {metrics.todayStats.sent.toLocaleString()}
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              {previousDayComparison > 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
              )}
              {Math.abs(previousDayComparison)} vs yesterday
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {metrics.todayStats.successRate.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground">
              {totalNotifications} total notifications
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {metrics.todayStats.failed.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">
              {totalNotifications > 0 ? ((metrics.todayStats.failed / totalNotifications) * 100).toFixed(1) : 0}% failure rate
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Channels</CardTitle>
            <Clock className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {Object.keys(metrics.channelStats).length}
            </div>
            <div className="text-xs text-muted-foreground">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Delivery Trends</CardTitle>
            <CardDescription>
              Success and failure rates over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={metrics.trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="sent"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Sent"
                />
                <Line
                  type="monotone"
                  dataKey="failed"
                  stroke="#ef4444"
                  strokeWidth={2}
                  name="Failed"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Channel Performance Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Channel Performance</CardTitle>
            <CardDescription>
              Success rates by notification channel
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metrics.channelPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="channel" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="sent" fill="#10b981" name="Sent" />
                <Bar dataKey="failed" fill="#ef4444" name="Failed" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Channel Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Channel Statistics</CardTitle>
          <CardDescription>
            Detailed performance metrics for each notification channel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(metrics.channelStats).map(([channel, stats]) => (
              <div key={channel} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  {getChannelIcon(channel)}
                  <div>
                    <h4 className="font-medium capitalize">
                      {channel.replace('_', ' ')}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {stats.sent + stats.failed} total notifications
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="text-sm font-medium text-green-600">
                      {stats.sent} sent
                    </div>
                    <div className="text-sm text-red-600">
                      {stats.failed} failed
                    </div>
                  </div>
                  <Badge
                    variant={
                      stats.successRate >= 95 ? 'default' :
                        stats.successRate >= 85 ? 'secondary' : 'destructive'
                    }
                  >
                    {stats.successRate.toFixed(1)}%
                  </Badge>
                </div>
              </div>
            ))}
            {Object.keys(metrics.channelStats).length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                No channel activity in the selected time range
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Success Rate Distribution */}
      {metrics.channelPerformance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Success Rate Distribution</CardTitle>
            <CardDescription>
              Visual breakdown of success rates across channels
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={metrics.channelPerformance}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ channel, successRate }) => `${channel}: ${successRate.toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="sent"
                >
                  {metrics.channelPerformance.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  )
}