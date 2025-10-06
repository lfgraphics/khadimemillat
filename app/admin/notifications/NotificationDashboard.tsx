'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Bell, 
  Send, 
  History, 
  BarChart3, 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock,
  Mail,
  MessageSquare,
  Smartphone,
  Globe
} from 'lucide-react'
import NotificationForm from './NotificationForm'
import NotificationHistory from './NotificationHistory'
import NotificationAnalytics from './NotificationAnalytics'

interface DashboardStats {
  totalSent: number
  totalFailed: number
  recentNotifications: number
  activeChannels: string[]
}

export default function NotificationDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalSent: 0,
    totalFailed: 0,
    recentNotifications: 0,
    activeChannels: []
  })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch('/api/admin/notifications/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error)
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
        return <Bell className="h-4 w-4" />
    }
  }

  const refreshStats = () => {
    fetchDashboardStats()
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notification Management</h1>
          <p className="text-muted-foreground">
            Send and manage notifications across multiple channels
          </p>
        </div>
        <Button onClick={refreshStats} variant="outline" size="sm">
          <BarChart3 className="h-4 w-4 mr-2" />
          Refresh Stats
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {loading ? '...' : stats.totalSent.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Successful notifications
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {loading ? '...' : stats.totalFailed.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Failed notifications
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {loading ? '...' : stats.recentNotifications}
            </div>
            <p className="text-xs text-muted-foreground">
              Last 24 hours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Channels</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1 mt-1">
              {loading ? (
                <div className="text-sm text-muted-foreground">Loading...</div>
              ) : stats.activeChannels.length > 0 ? (
                stats.activeChannels.map((channel) => (
                  <Badge key={channel} variant="secondary" className="text-xs">
                    <span className="mr-1">{getChannelIcon(channel)}</span>
                    {channel.replace('_', ' ')}
                  </Badge>
                ))
              ) : (
                <div className="text-sm text-muted-foreground">None configured</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">
            <Bell className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="send">
            <Send className="h-4 w-4 mr-2" />
            Send Notification
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-2" />
            History
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common notification management tasks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Button 
                  onClick={() => setActiveTab('send')} 
                  className="h-20 flex-col space-y-2"
                >
                  <Send className="h-6 w-6" />
                  <span>Send New Notification</span>
                </Button>
                <Button 
                  onClick={() => setActiveTab('history')} 
                  variant="outline" 
                  className="h-20 flex-col space-y-2"
                >
                  <History className="h-6 w-6" />
                  <span>View History</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Status</CardTitle>
              <CardDescription>
                Current status of notification channels
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {['web_push', 'email', 'whatsapp', 'sms'].map((channel) => (
                  <div key={channel} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getChannelIcon(channel)}
                      <span className="capitalize">{channel.replace('_', ' ')}</span>
                    </div>
                    <Badge 
                      variant={stats.activeChannels.includes(channel) ? 'default' : 'secondary'}
                    >
                      {stats.activeChannels.includes(channel) ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="send">
          <NotificationForm onNotificationSent={refreshStats} />
        </TabsContent>

        <TabsContent value="history">
          <NotificationHistory />
        </TabsContent>

        <TabsContent value="analytics">
          <NotificationAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  )
}