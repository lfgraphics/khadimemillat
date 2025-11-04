'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  Send, 
  AlertTriangle, 
  FileText, 
  BarChart3,
  Plus,
  Zap,
  Eye,
  TrendingUp
} from 'lucide-react'
import { useRouter } from 'next/navigation'

interface QuickActionsProps {
  onNewNotification: () => void
  onEmergencyNotification: () => void
  onViewTemplates: () => void
  onViewAnalytics: () => void
}

export default function QuickActions({
  onNewNotification,
  onEmergencyNotification,
  onViewTemplates,
  onViewAnalytics
}: QuickActionsProps) {
  const router = useRouter()
  const [emergencyDialogOpen, setEmergencyDialogOpen] = useState(false)

  const handleEmergencyConfirm = () => {
    setEmergencyDialogOpen(false)
    onEmergencyNotification()
  }

  const quickActionItems = [
    {
      id: 'new-notification',
      title: 'New Notification',
      description: 'Create and send a new notification',
      icon: Send,
      color: 'bg-blue-500 hoact:bg-blue-600',
      textColor: 'text-white',
      onClick: onNewNotification,
      shortcut: 'Ctrl+N'
    },
    {
      id: 'emergency-alert',
      title: 'Emergency Alert',
      description: 'Send urgent notification to all users',
      icon: AlertTriangle,
      color: 'bg-red-500 hoact:bg-red-600',
      textColor: 'text-white',
      onClick: () => setEmergencyDialogOpen(true),
      shortcut: 'Ctrl+E',
      requiresConfirmation: true
    },
    {
      id: 'view-templates',
      title: 'View Templates',
      description: 'Manage notification templates',
      icon: FileText,
      color: 'bg-purple-500 hoact:bg-purple-600',
      textColor: 'text-white',
      onClick: onViewTemplates,
      shortcut: 'Ctrl+T'
    },
    {
      id: 'analytics',
      title: 'Analytics',
      description: 'View detailed performance analytics',
      icon: BarChart3,
      color: 'bg-green-500 hoact:bg-green-600',
      textColor: 'text-white',
      onClick: onViewAnalytics,
      shortcut: 'Ctrl+A'
    }
  ]

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5" />
            <span>Quick Actions</span>
          </CardTitle>
          <CardDescription>
            Common notification management tasks with keyboard shortcuts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {quickActionItems.map((action) => (
              <Button
                key={action.id}
                onClick={action.onClick}
                className={`h-24 flex-col space-y-2 ${action.color} ${action.textColor} relative group`}
                size="lg"
              >
                <action.icon className="h-6 w-6" />
                <div className="text-center">
                  <div className="font-medium">{action.title}</div>
                  <div className="text-xs opacity-90 hidden group-hoact:block">
                    {action.shortcut}
                  </div>
                </div>
              </Button>
            ))}
          </div>

          {/* Additional Quick Actions */}
          <div className="mt-6 pt-6 border-t">
            <h4 className="text-sm font-medium mb-3">Additional Actions</h4>
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/admin/notifications/campaigns')}
                className="justify-start"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Campaign
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/admin/notifications/scheduled')}
                className="justify-start"
              >
                <Eye className="h-4 w-4 mr-2" />
                View Scheduled
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/admin/notifications/history')}
                className="justify-start"
              >
                <FileText className="h-4 w-4 mr-2" />
                History
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/admin/notifications/settings')}
                className="justify-start"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Emergency Alert Confirmation Dialog */}
      <Dialog open={emergencyDialogOpen} onOpenChange={setEmergencyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              <span>Emergency Alert Confirmation</span>
            </DialogTitle>
            <DialogDescription className="space-y-2">
              <p>
                You are about to send an emergency notification that will be delivered 
                immediately to all users across all available channels.
              </p>
              <p className="font-medium text-red-600">
                This action cannot be undone and will bypass user preferences.
              </p>
              <p>
                Are you sure you want to proceed?
              </p>
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setEmergencyDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleEmergencyConfirm}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Send Emergency Alert
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}