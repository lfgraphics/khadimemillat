"use client"

import React from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Loader2, RefreshCw, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

// Dashboard header loading skeleton
export function DashboardHeaderSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-20" />
      </div>
      
      {/* Stats skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-5 w-12" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// Item card loading skeleton
export function ItemCardSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <Card>
      <CardContent className={`p-4 ${compact ? 'space-y-2' : 'space-y-3'}`}>
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <Skeleton className={`${compact ? 'h-4 w-32' : 'h-5 w-40'}`} />
            {!compact && <Skeleton className="h-3 w-full" />}
          </div>
          <Skeleton className="h-8 w-8" />
        </div>
        
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-20" />
        </div>
        
        {!compact && (
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
        )}
        
        <div className="flex items-center gap-2 pt-2 border-t">
          <Skeleton className="h-8 flex-1" />
          <Skeleton className="h-8 flex-1" />
        </div>
      </CardContent>
    </Card>
  )
}

// Item grid loading skeleton
export function ItemGridSkeleton({ 
  count = 6, 
  compact = false 
}: { 
  count?: number
  compact?: boolean 
}) {
  const getGridClasses = () => {
    if (compact) {
      return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
    }
    return 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
  }

  return (
    <div className={`grid gap-4 ${getGridClasses()}`}>
      {Array.from({ length: count }).map((_, index) => (
        <ItemCardSkeleton key={index} compact={compact} />
      ))}
    </div>
  )
}

// Table loading skeleton
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: rows }).map((_, index) => (
            <div key={index} className="flex items-center justify-between p-3 border rounded">
              <div className="flex items-center space-x-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-12" />
                <Skeleton className="h-8 w-16" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Filters loading skeleton
export function FiltersSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-24" />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Pagination loading skeleton
export function PaginationSkeleton() {
  return (
    <div className="flex items-center justify-between">
      <Skeleton className="h-4 w-32" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-8" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-8 w-16" />
      </div>
    </div>
  )
}

// Full dashboard loading state
export function DashboardSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <DashboardHeaderSkeleton />
      <FiltersSkeleton />
      <TableSkeleton />
      <PaginationSkeleton />
    </div>
  )
}

// Progress indicators for long-running operations
export interface ProgressIndicatorProps {
  progress: number
  message?: string
  showPercentage?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'success' | 'warning' | 'error'
}

export function ProgressIndicator({ 
  progress, 
  message, 
  showPercentage = true,
  size = 'md',
  variant = 'default'
}: ProgressIndicatorProps) {
  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  }

  const variantClasses = {
    default: 'bg-primary',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500'
  }

  return (
    <div className="space-y-2">
      {message && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">{message}</span>
          {showPercentage && (
            <span className="text-gray-500 dark:text-gray-500 font-mono">
              {Math.round(progress)}%
            </span>
          )}
        </div>
      )}
      <div className={cn("relative overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700", sizeClasses[size])}>
        <div 
          className={cn("h-full transition-all duration-300 ease-out", variantClasses[variant])}
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    </div>
  )
}

// Spinner with message for indeterminate operations
export interface SpinnerProps {
  message?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Spinner({ message, size = 'md', className }: SpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Loader2 className={cn("animate-spin text-primary", sizeClasses[size])} />
      {message && (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {message}
        </span>
      )}
    </div>
  )
}

// Loading overlay for components
export interface LoadingOverlayProps {
  loading: boolean
  message?: string
  progress?: number
  children: React.ReactNode
  className?: string
}

export function LoadingOverlay({ 
  loading, 
  message, 
  progress, 
  children, 
  className 
}: LoadingOverlayProps) {
  return (
    <div className={cn("relative", className)}>
      {children}
      {loading && (
        <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
          <Card className="p-6 min-w-[200px]">
            <CardContent className="p-0 space-y-4">
              <div className="flex items-center justify-center">
                <Spinner size="lg" />
              </div>
              {message && (
                <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                  {message}
                </p>
              )}
              {progress !== undefined && (
                <ProgressIndicator 
                  progress={progress} 
                  showPercentage={true}
                  size="md"
                />
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

// Button loading states
export interface LoadingButtonProps extends React.ComponentProps<typeof Button> {
  loading?: boolean
  loadingText?: string
}

export function LoadingButton({ 
  loading = false, 
  loadingText, 
  children, 
  disabled,
  ...props 
}: LoadingButtonProps) {
  return (
    <Button 
      {...props} 
      disabled={disabled || loading}
      className={cn(props.className)}
    >
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {loading ? (loadingText || 'Loading...') : children}
    </Button>
  )
}

// Smooth loading transitions
export interface LoadingTransitionProps {
  loading: boolean
  children: React.ReactNode
  fallback?: React.ReactNode
  delay?: number
  className?: string
}

export function LoadingTransition({ 
  loading, 
  children, 
  fallback,
  delay = 200,
  className 
}: LoadingTransitionProps) {
  const [showLoading, setShowLoading] = React.useState(false)
  const [showContent, setShowContent] = React.useState(!loading)

  React.useEffect(() => {
    if (loading) {
      // Delay showing loading state to prevent flashing
      const timer = setTimeout(() => setShowLoading(true), delay)
      setShowContent(false)
      return () => clearTimeout(timer)
    } else {
      setShowLoading(false)
      // Small delay before showing content for smooth transition
      const timer = setTimeout(() => setShowContent(true), 50)
      return () => clearTimeout(timer)
    }
  }, [loading, delay])

  return (
    <div className={cn("transition-opacity duration-200", className)}>
      {showLoading && (fallback || <Spinner message="Loading..." />)}
      {showContent && (
        <div className="animate-in fade-in duration-200">
          {children}
        </div>
      )}
    </div>
  )
}

// Multi-step operation progress
export interface MultiStepProgressProps {
  steps: Array<{
    id: string
    label: string
    status: 'pending' | 'active' | 'completed' | 'error'
  }>
  className?: string
}

export function MultiStepProgress({ steps, className }: MultiStepProgressProps) {
  const completedSteps = steps.filter(step => step.status === 'completed').length
  const totalSteps = steps.length
  const progress = (completedSteps / totalSteps) * 100

  return (
    <div className={cn("space-y-4", className)}>
      <ProgressIndicator 
        progress={progress}
        message={`Step ${completedSteps + 1} of ${totalSteps}`}
        showPercentage={false}
      />
      
      <div className="space-y-2">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center gap-3">
            <div className={cn(
              "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
              step.status === 'completed' && "bg-green-500 text-white",
              step.status === 'active' && "bg-primary text-white",
              step.status === 'error' && "bg-red-500 text-white",
              step.status === 'pending' && "bg-gray-200 dark:bg-gray-700 text-gray-500"
            )}>
              {step.status === 'completed' ? '✓' : 
               step.status === 'error' ? '✗' : 
               index + 1}
            </div>
            <span className={cn(
              "text-sm",
              step.status === 'active' && "font-medium text-primary",
              step.status === 'completed' && "text-green-600 dark:text-green-400",
              step.status === 'error' && "text-red-600 dark:text-red-400",
              step.status === 'pending' && "text-gray-500"
            )}>
              {step.label}
            </span>
            {step.status === 'active' && (
              <Loader2 className="h-4 w-4 animate-spin text-primary ml-auto" />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// Animated loading dots
export function LoadingDots({ className }: { className?: string }) {
  return (
    <div className={cn("flex space-x-1", className)}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-2 h-2 bg-primary rounded-full animate-pulse"
          style={{
            animationDelay: `${i * 0.2}s`,
            animationDuration: '1s'
          }}
        />
      ))}
    </div>
  )
}

// Loading state for data tables
export function TableLoadingRow({ columns }: { columns: number }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: columns }).map((_, index) => (
        <td key={index} className="px-4 py-3">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  )
}

export function TableLoadingRows({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, index) => (
        <TableLoadingRow key={index} columns={columns} />
      ))}
    </>
  )
}

export default {
  DashboardHeaderSkeleton,
  ItemCardSkeleton,
  ItemGridSkeleton,
  TableSkeleton,
  FiltersSkeleton,
  PaginationSkeleton,
  DashboardSkeleton,
  ProgressIndicator,
  Spinner,
  LoadingOverlay,
  LoadingButton,
  LoadingTransition,
  MultiStepProgress,
  LoadingDots,
  TableLoadingRow,
  TableLoadingRows
}