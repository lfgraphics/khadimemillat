'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  BarChart3, 
  TrendingUp, 
  Heart, 
  Calendar,
  DollarSign,
  Activity
} from 'lucide-react'

interface SubscriptionStatsProps {
  stats: {
    total: number
    active: number
    paused: number
    cancelled: number
    expired: number
    pending_payment?: number
    totalDonated: number
  }
}

export default function SubscriptionStats({ stats }: SubscriptionStatsProps) {
  const statCards = [
    {
      title: 'Total Donated',
      value: `₹${stats.totalDonated.toLocaleString()}`,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900/20'
    },
    {
      title: 'Active Subscriptions',
      value: stats.active.toString(),
      icon: Activity,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/20'
    },
    {
      title: 'Total Subscriptions',
      value: stats.total.toString(),
      icon: BarChart3,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-900/20'
    },
    {
      title: 'Continuous Impact',
      value: stats.active > 0 ? 'Active' : 'Paused',
      icon: Heart,
      color: stats.active > 0 ? 'text-red-600' : 'text-gray-600',
      bgColor: stats.active > 0 ? 'bg-red-100 dark:bg-red-900/20' : 'bg-gray-100 dark:bg-gray-900/20'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {statCards.map((stat, index) => (
        <Card key={index}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-full ${stat.bgColor} flex items-center justify-center`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Status Breakdown */}
      {stats.total > 0 && (
        <Card className="md:col-span-2 lg:col-span-4">
          <CardHeader>
            <CardTitle className="text-lg">Subscription Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {stats.active > 0 && (
                <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                  Active: {stats.active}
                </Badge>
              )}
              {stats.paused > 0 && (
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
                  Paused: {stats.paused}
                </Badge>
              )}
              {stats.cancelled > 0 && (
                <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                  Cancelled: {stats.cancelled}
                </Badge>
              )}
              {stats.expired > 0 && (
                <Badge variant="secondary" className="bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400">
                  Expired: {stats.expired}
                </Badge>
              )}
              {(stats.pending_payment || 0) > 0 && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                  Processing: {stats.pending_payment}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}