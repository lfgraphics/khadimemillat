'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  History, 
  Search, 
  Filter, 
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  MessageSquare,
  Smartphone,
  Globe,
  Eye,
  ChevronDown,
  ChevronUp,
  Users,
  RefreshCw
} from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface NotificationHistoryItem {
  _id: string
  title: string
  message: string
  channels: string[]
  targetRoles: string[]
  totalSent: number
  totalFailed: number
  sentBy: string
  createdAt: string
  sentTo?: Array<{
    userId: string
    email?: string
    phone?: string
    channels: Array<{
      channel: string
      status: 'sent' | 'failed' | 'pending'
      sentAt?: string
      error?: string
    }>
  }>
}

export default function NotificationHistory() {
  const [notifications, setNotifications] = useState<NotificationHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedNotification, setSelectedNotification] = useState<NotificationHistoryItem | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [channelFilter, setChannelFilter] = useState<string>('all')
  const [expandedNotifications, setExpandedNotifications] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchNotificationHistory()
  }, [])

  const fetchNotificationHistory = async () => {
    try {
      const response = await fetch('/api/admin/notifications/history')
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications || [])
      }
    } catch (error) {
      console.error('Failed to fetch notification history:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchDetailedNotification = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/admin/notifications/history/${notificationId}`)
      if (response.ok) {
        const data = await response.json()
        setSelectedNotification(data)
      }
    } catch (error) {
      console.error('Failed to fetch detailed notification:', error)
    }
  }

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email':
        return <Mail className="h-3 w-3" />
      case 'whatsapp':
        return <MessageSquare className="h-3 w-3" />
      case 'sms':
        return <Smartphone className="h-3 w-3" />
      case 'web_push':
        return <Globe className="h-3 w-3" />
      default:
        return <Clock className="h-3 w-3" />
    }
  }

  const getStatusColor = (sent: number, failed: number) => {
    if (failed === 0) return 'text-green-600'
    if (sent === 0) return 'text-red-600'
    return 'text-yellow-600'
  }

  const getStatusBadge = (sent: number, failed: number) => {
    if (failed === 0) return <Badge className="bg-green-100 text-green-800">Success</Badge>
    if (sent === 0) return <Badge className="bg-red-100 text-red-800">Failed</Badge>
    return <Badge className="bg-yellow-100 text-yellow-800">Partial</Badge>
  }

  const toggleExpanded = (notificationId: string) => {
    const newExpanded = new Set(expandedNotifications)
    if (newExpanded.has(notificationId)) {
      newExpanded.delete(notificationId)
    } else {
      newExpanded.add(notificationId)
    }
    setExpandedNotifications(newExpanded)
  }

  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         notification.message.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'success' && notification.totalFailed === 0) ||
                         (statusFilter === 'failed' && notification.totalSent === 0) ||
                         (statusFilter === 'partial' && notification.totalSent > 0 && notification.totalFailed > 0)
    
    const matchesChannel = channelFilter === 'all' || notification.channels.includes(channelFilter)
    
    return matchesSearch && matchesStatus && matchesChannel
  })

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Notification History
          </CardTitle>
          <CardDescription>
            View and manage past notifications with detailed delivery status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search notifications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Channels</SelectItem>
                <SelectItem value="web_push">Web Push</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" onClick={fetchNotificationHistory}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Notifications List */}
          {loading ? (
            <div className="text-center py-8">
              <div className="text-muted-foreground">Loading notification history...</div>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-8">
              <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <div className="text-muted-foreground">
                {searchTerm || statusFilter !== 'all' || channelFilter !== 'all' 
                  ? 'No notifications match your filters' 
                  : 'No notifications sent yet'}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredNotifications.map((notification) => (
                <Card key={notification._id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium">{notification.title}</h3>
                          {getStatusBadge(notification.totalSent, notification.totalFailed)}
                          <div className="flex gap-1">
                            {notification.channels.map((channel) => (
                              <Badge key={channel} variant="secondary" className="text-xs">
                                {getChannelIcon(channel)}
                                <span className="ml-1">{channel.replace('_', ' ')}</span>
                              </Badge>
                            ))}
                          </div>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {notification.message}
                        </p>
                        
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3 text-green-600" />
                            <span className="text-green-600">{notification.totalSent} sent</span>
                          </div>
                          {notification.totalFailed > 0 && (
                            <div className="flex items-center gap-1">
                              <XCircle className="h-3 w-3 text-red-600" />
                              <span className="text-red-600">{notification.totalFailed} failed</span>
                            </div>
                          )}
                          <div className="text-muted-foreground">
                            {new Date(notification.createdAt).toLocaleDateString()} at{' '}
                            {new Date(notification.createdAt).toLocaleTimeString()}
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-1 mt-2">
                          {notification.targetRoles.map((role) => (
                            <Badge key={role} variant="outline" className="text-xs">
                              <Users className="h-3 w-3 mr-1" />
                              {role}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleExpanded(notification._id)}
                        >
                          {expandedNotifications.has(notification._id) ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => fetchDetailedNotification(notification._id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {expandedNotifications.has(notification._id) && (
                      <div className="mt-4 pt-4 border-t">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <h4 className="font-medium mb-2">Channel Breakdown</h4>
                            <div className="space-y-1">
                              {notification.channels.map((channel) => (
                                <div key={channel} className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    {getChannelIcon(channel)}
                                    <span className="capitalize">{channel.replace('_', ' ')}</span>
                                  </div>
                                  <div className="text-muted-foreground">
                                    {/* This would show per-channel stats if available */}
                                    Active
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div>
                            <h4 className="font-medium mb-2">Target Audience</h4>
                            <div className="space-y-1">
                              {notification.targetRoles.map((role) => (
                                <div key={role} className="flex items-center gap-2">
                                  <Users className="h-3 w-3" />
                                  <span className="capitalize">{role}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed View Modal/Panel */}
      {selectedNotification && (
        <Card>
          <CardHeader>
            <CardTitle>Notification Details</CardTitle>
            <CardDescription>
              Detailed delivery information for the selected notification
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-2">Basic Information</h4>
                  <div className="space-y-2 text-sm">
                    <div><strong>Title:</strong> {selectedNotification.title}</div>
                    <div><strong>Message:</strong> {selectedNotification.message}</div>
                    <div><strong>Sent:</strong> {new Date(selectedNotification.createdAt).toLocaleString()}</div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Delivery Summary</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>{selectedNotification.totalSent} successfully sent</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-600" />
                      <span>{selectedNotification.totalFailed} failed</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Individual User Delivery Status */}
              {selectedNotification.sentTo && selectedNotification.sentTo.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">Individual Delivery Status</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {selectedNotification.sentTo.map((recipient, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Users className="h-4 w-4" />
                          <div>
                            <div className="text-sm font-medium">
                              {recipient.email || recipient.phone || recipient.userId}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {recipient.userId}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          {recipient.channels.map((channelLog, channelIndex) => (
                            <Badge
                              key={channelIndex}
                              variant={channelLog.status === 'sent' ? 'default' : 'destructive'}
                              className="text-xs"
                            >
                              {getChannelIcon(channelLog.channel)}
                              <span className="ml-1">{channelLog.status}</span>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button 
                variant="outline" 
                onClick={() => setSelectedNotification(null)}
              >
                Close Details
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}