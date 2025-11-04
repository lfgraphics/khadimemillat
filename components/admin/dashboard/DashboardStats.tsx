"use client"

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Package, 
  ShoppingCart, 
  DollarSign, 
  AlertCircle,
  Archive
} from 'lucide-react'
import { DashboardStats } from '@/types/dashboard'
import { formatCurrency, formatNumber } from '@/lib/utils/dashboard'
import { generateAriaLabel } from '@/lib/utils/accessibility'

interface DashboardStatsProps {
  stats: DashboardStats
  loading: boolean
}

// Skeleton loader component for individual stat cards
function StatCardSkeleton() {
  return (
    <Card className="skeleton-shimmer animate-fade-in-up">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <Skeleton className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg flex-shrink-0 skeleton-shimmer" />
          <div className="space-y-1 sm:space-y-2 flex-1 min-w-0">
            <Skeleton className="h-3 sm:h-4 w-12 sm:w-16 skeleton-shimmer" />
            <Skeleton className="h-4 sm:h-6 w-8 sm:w-12 skeleton-shimmer" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function DashboardStatsComponent({ stats, loading }: DashboardStatsProps) {
  const statItems = [
    {
      label: 'Total Donations',
      value: stats.totalDonations,
      icon: Archive,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      format: formatNumber,
      description: 'Total donation requests'
    },
    {
      label: 'Pending Items',
      value: stats.pendingItems,
      icon: AlertCircle,
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
      format: formatNumber,
      description: 'Items awaiting processing'
    },
    {
      label: 'Listed Items',
      value: stats.listedItems,
      icon: ShoppingCart,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      format: formatNumber,
      description: 'Items available for sale'
    },
    {
      label: 'Sold Items',
      value: stats.soldItems,
      icon: Package,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      format: formatNumber,
      description: 'Successfully sold items'
    },
    {
      label: 'Without Price',
      value: stats.itemsWithoutPrice,
      icon: AlertCircle,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      format: formatNumber,
      description: 'Items missing price information'
    },
    {
      label: 'Total Revenue',
      value: stats.totalRevenue,
      icon: DollarSign,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
      format: formatCurrency,
      description: 'Revenue from sold items'
    }
  ]

  // Loading state with improved skeleton loaders
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 stagger-children">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} style={{ '--stagger-delay': index } as React.CSSProperties}>
            <StatCardSkeleton />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div 
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 stagger-children"
      role="group"
      aria-label="Dashboard statistics"
    >
      {statItems.map((item, index) => {
        const Icon = item.icon
        const formattedValue = item.format(item.value)
        return (
          <div 
            key={index}
            style={{ '--stagger-delay': index } as React.CSSProperties}
            className="animate-fade-in-up"
          >
            <Card 
              className="group hover-lift hover-glow transition-all duration-300 cursor-default border-0 shadow-sm hoact:shadow-lg focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2"
              role="article"
              aria-label={generateAriaLabel(item.label, 'dashboard statistics', formattedValue, item.description)}
              tabIndex={0}
            >
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  {/* Icon with responsive sizing and enhanced animations */}
                  <div 
                    className={`
                      p-1.5 sm:p-2 rounded-lg transition-all duration-300 ${item.bgColor} 
                      group-hoact:scale-110 group-hoact:rotate-3
                    `}
                    aria-hidden="true"
                  >
                    <Icon className={`
                      h-4 w-4 sm:h-5 sm:w-5 ${item.color} 
                      transition-all duration-300 group-hoact:scale-110
                    `} />
                  </div>
                  
                  {/* Content with responsive text sizing and animations */}
                  <div className="flex-1 min-w-0">
                    <p 
                      className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 truncate leading-tight transition-colors duration-200"
                      id={`stat-${index}-label`}
                    >
                      {item.label}
                    </p>
                    <p 
                      className="text-sm sm:text-lg font-semibold text-gray-900 dark:text-gray-100 leading-tight mt-0.5 transition-all duration-200 group-hoact:scale-105"
                      aria-labelledby={`stat-${index}-label`}
                      aria-describedby={`stat-${index}-description`}
                    >
                      {formattedValue}
                    </p>
                    <span 
                      id={`stat-${index}-description`} 
                      className="sr-only"
                    >
                      {item.description}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )
      })}
    </div>
  )
}