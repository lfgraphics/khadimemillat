'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Clock, Play, Settings } from 'lucide-react'
import { toast } from 'sonner'

interface AvailableJob {
  name: string
  schedule: string
  description: string
}

interface ActiveJob {
  name: string
  schedule: string
  enabled: boolean
  nextRun: string
}

interface SchedulerStatus {
  available: AvailableJob[]
  active: ActiveJob[]
  summary: {
    totalAvailable: number
    totalActive: number
  }
}

export default function SchedulerManager() {
  const [status, setStatus] = useState<SchedulerStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/admin/scheduler')
      if (!response.ok) throw new Error('Failed to fetch scheduler status')
      
      const result = await response.json()
      if (result.success) {
        setStatus(result.data)
      }
    } catch (error) {
      toast.error('Failed to load scheduler status')
    } finally {
      setLoading(false)
    }
  }

  const toggleJob = async (jobName: string, enabled: boolean) => {
    setActionLoading(jobName)
    try {
      const response = await fetch('/api/admin/scheduler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle',
          jobName,
          enabled
        })
      })

      const result = await response.json()
      if (result.success) {
        toast.success(result.message)
        await fetchStatus()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      toast.error(`Failed to ${enabled ? 'enable' : 'disable'} job`)
    } finally {
      setActionLoading(null)
    }
  }

  const runJob = async (jobName: string) => {
    setActionLoading(jobName)
    try {
      const response = await fetch('/api/admin/scheduler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'run',
          jobName
        })
      })

      const result = await response.json()
      if (result.success) {
        toast.success(result.message)
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      toast.error('Failed to run job')
    } finally {
      setActionLoading(null)
    }
  }

  const isJobActive = (jobName: string): boolean => {
    return status?.active.some(job => job.name === jobName) || false
  }

  const formatJobName = (name: string): string => {
    return name.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  useEffect(() => {
    fetchStatus()
  }, [])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Scheduled Jobs Manager
          </CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Scheduled Jobs Manager
        </CardTitle>
        <CardDescription>
          Manage automated tasks - no jobs run automatically
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status?.available.map((job) => {
          const isActive = isJobActive(job.name)
          const isLoading = actionLoading === job.name

          return (
            <div key={job.name} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-medium">{formatJobName(job.name)}</h3>
                  <Badge variant={isActive ? 'default' : 'secondary'}>
                    {isActive ? 'Scheduled' : 'Manual Only'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  {job.description}
                </p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Schedule: {job.schedule}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => runJob(job.name)}
                  disabled={isLoading}
                  className="flex items-center gap-1"
                >
                  <Play className="h-3 w-3" />
                  Run Now
                </Button>
                <Switch
                  checked={isActive}
                  onCheckedChange={(enabled) => toggleJob(job.name, enabled)}
                  disabled={isLoading}
                />
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}