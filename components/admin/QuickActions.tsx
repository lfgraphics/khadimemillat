'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Send, BarChart3 } from 'lucide-react'

interface QuickActionsProps {
  onNewNotification: () => void
  onViewAnalytics: () => void
  onEmergencyNotification?: () => void
  onViewTemplates?: () => void
}

export default function QuickActions({
  onNewNotification,
  onViewAnalytics
}: QuickActionsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>
          Common notification management tasks
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          <Button
            variant="default"
            className="h-24 flex-col space-y-2"
            onClick={onNewNotification}
          >
            <Send className="h-6 w-6" />
            <div className="text-center">
              <div className="font-semibold">Send New Notification</div>
              <div className="text-xs opacity-90">Create and send</div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="h-24 flex-col space-y-2"
            onClick={onViewAnalytics}
          >
            <BarChart3 className="h-6 w-6" />
            <div className="text-center">
              <div className="font-semibold">View Analytics</div>
              <div className="text-xs">Performance metrics</div>
            </div>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}