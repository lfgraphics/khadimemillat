"use client"

import React from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react'
import { ValidationStatus } from '@/types/dashboard'
import { formatValidationErrors, formatValidationWarnings } from '@/lib/utils/validation'

interface ValidationStatusTooltipProps {
  validation: ValidationStatus
  children: React.ReactNode
  showIcon?: boolean
  compact?: boolean
}

export default function ValidationStatusTooltip({
  validation,
  children,
  showIcon = true,
  compact = false
}: ValidationStatusTooltipProps) {
  const hasErrors = validation.errors.length > 0
  const hasWarnings = validation.warnings.length > 0
  const isValid = validation.canList && !hasErrors

  // Don't show tooltip if no validation issues
  if (!hasErrors && !hasWarnings) {
    return <>{children}</>
  }

  const getIcon = () => {
    if (hasErrors) return <AlertCircle className="h-3 w-3 text-red-500" />
    if (hasWarnings) return <AlertTriangle className="h-3 w-3 text-yellow-500" />
    return <CheckCircle className="h-3 w-3 text-green-500" />
  }

  const getBadgeVariant = () => {
    if (hasErrors) return 'destructive'
    if (hasWarnings) return 'secondary'
    return 'default'
  }

  const getTooltipContent = () => {
    const content = []
    
    if (hasErrors) {
      content.push(
        <div key="errors" className="space-y-1">
          <div className="font-medium text-red-600 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Validation Errors
          </div>
          <ul className="text-xs space-y-0.5 ml-4">
            {validation.errors.map((error, index) => (
              <li key={index} className="text-red-600">• {error}</li>
            ))}
          </ul>
        </div>
      )
    }
    
    if (hasWarnings) {
      content.push(
        <div key="warnings" className="space-y-1">
          <div className="font-medium text-yellow-600 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Suggestions
          </div>
          <ul className="text-xs space-y-0.5 ml-4">
            {validation.warnings.map((warning, index) => (
              <li key={index} className="text-yellow-600">• {warning}</li>
            ))}
          </ul>
        </div>
      )
    }
    
    return (
      <div className="space-y-2 max-w-xs">
        {content}
        {hasErrors && (
          <div className="text-xs text-muted-foreground border-t pt-2">
            This item cannot be listed until errors are resolved.
          </div>
        )}
      </div>
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1 cursor-help">
          {children}
          {showIcon && !compact && getIcon()}
          {compact && (hasErrors || hasWarnings) && (
            <Badge variant={getBadgeVariant()} className="text-xs px-1 py-0">
              {hasErrors ? '!' : '?'}
            </Badge>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="p-3">
        {getTooltipContent()}
      </TooltipContent>
    </Tooltip>
  )
}

// Standalone validation indicator component
export function ValidationIndicator({ 
  validation, 
  size = 'sm' 
}: { 
  validation: ValidationStatus
  size?: 'xs' | 'sm' | 'md'
}) {
  const hasErrors = validation.errors.length > 0
  const hasWarnings = validation.warnings.length > 0
  
  if (!hasErrors && !hasWarnings) {
    return (
      <Badge variant="outline" className={`text-green-600 bg-green-50 dark:bg-green-900/20 ${
        size === 'xs' ? 'text-xs px-1 py-0' : 
        size === 'sm' ? 'text-xs' : 'text-sm'
      }`}>
        <CheckCircle className={`${
          size === 'xs' ? 'h-2 w-2' : 
          size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'
        } mr-1`} />
        Valid
      </Badge>
    )
  }
  
  if (hasErrors) {
    return (
      <ValidationStatusTooltip validation={validation} showIcon={false}>
        <Badge variant="destructive" className={
          size === 'xs' ? 'text-xs px-1 py-0' : 
          size === 'sm' ? 'text-xs' : 'text-sm'
        }>
          <AlertCircle className={`${
            size === 'xs' ? 'h-2 w-2' : 
            size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'
          } mr-1`} />
          {validation.errors.length} Error{validation.errors.length > 1 ? 's' : ''}
        </Badge>
      </ValidationStatusTooltip>
    )
  }
  
  return (
    <ValidationStatusTooltip validation={validation} showIcon={false}>
      <Badge variant="secondary" className={`text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 ${
        size === 'xs' ? 'text-xs px-1 py-0' : 
        size === 'sm' ? 'text-xs' : 'text-sm'
      }`}>
        <AlertTriangle className={`${
          size === 'xs' ? 'h-2 w-2' : 
          size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'
        } mr-1`} />
        {validation.warnings.length} Warning{validation.warnings.length > 1 ? 's' : ''}
      </Badge>
    </ValidationStatusTooltip>
  )
}