'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Clock, 
  User, 
  FileText, 
  Eye, 
  EyeOff, 
  ChevronDown, 
  ChevronUp,
  History,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { IAuditEntry } from '@/models/ExpenseEntry'

interface AuditTrailProps {
  auditTrail: IAuditEntry[]
  className?: string
  showHeader?: boolean
  maxHeight?: string
  defaultExpanded?: boolean
  showChangesDetails?: boolean
}

export function AuditTrail({
  auditTrail,
  className,
  showHeader = true,
  maxHeight = '400px',
  defaultExpanded = false,
  showChangesDetails = true
}: AuditTrailProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const [showDetails, setShowDetails] = useState<{ [key: number]: boolean }>({})

  // Sort audit trail by date (newest first)
  const sortedAuditTrail = [...auditTrail].sort(
    (a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime()
  )

  // Get audit action color and icon
  const getAuditActionStyle = (action: string) => {
    switch (action) {
      case 'created':
        return {
          color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
          icon: '✓'
        }
      case 'updated':
        return {
          color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
          icon: '✏️'
        }
      case 'deleted':
        return {
          color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
          icon: '🗑️'
        }
      default:
        return {
          color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
          icon: '•'
        }
    }
  }

  // Format changes for display
  const formatChanges = (changes: Record<string, any>) => {
    if (!changes || Object.keys(changes).length === 0) return null

    return Object.entries(changes).map(([field, change]) => {
      if (typeof change === 'object' && change.from !== undefined && change.to !== undefined) {
        return {
          field,
          from: change.from,
          to: change.to
        }
      }
      return {
        field,
        from: null,
        to: change
      }
    })
  }

  // Toggle details for a specific entry
  const toggleDetails = (index: number) => {
    setShowDetails(prev => ({
      ...prev,
      [index]: !prev[index]
    }))
  }

  if (!auditTrail || auditTrail.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No audit trail available for this expense.
        </AlertDescription>
      </Alert>
    )
  }

  const content = (
    <div 
      className="space-y-3"
      style={{ maxHeight: isExpanded ? maxHeight : 'none', overflowY: 'auto' }}
    >
      {sortedAuditTrail.map((entry, index) => {
        const actionStyle = getAuditActionStyle(entry.action)
        const changes = formatChanges(entry.changes || {})
        const hasDetails = entry.reason || (changes && changes.length > 0)

        return (
          <div key={index} className="relative">
            {/* Timeline line */}
            {index < sortedAuditTrail.length - 1 && (
              <div className="absolute left-6 top-12 w-0.5 h-8 bg-border" />
            )}

            <div className="flex items-start gap-3 p-3 border rounded-lg bg-card">
              {/* Action badge */}
              <div className="flex-shrink-0 flex items-center justify-center w-12 h-8">
                <Badge className={cn('text-xs px-2 py-1', actionStyle.color)}>
                  <span className="mr-1">{actionStyle.icon}</span>
                  {entry.action}
                </Badge>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium flex items-center gap-2">
                      <User className="h-3 w-3" />
                      {entry.performedBy}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(entry.performedAt), 'PPP p')}
                    </p>
                  </div>

                  {/* Details toggle */}
                  {hasDetails && showChangesDetails && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleDetails(index)}
                      className="h-6 w-6 p-0"
                    >
                      {showDetails[index] ? (
                        <EyeOff className="h-3 w-3" />
                      ) : (
                        <Eye className="h-3 w-3" />
                      )}
                    </Button>
                  )}
                </div>

                {/* Reason */}
                {entry.reason && (
                  <div className="mt-2">
                    <p className="text-xs text-muted-foreground flex items-start gap-1">
                      <FileText className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      <span className="italic">"{entry.reason}"</span>
                    </p>
                  </div>
                )}

                {/* Changes details */}
                {showDetails[index] && changes && changes.length > 0 && showChangesDetails && (
                  <div className="mt-3 p-2 bg-muted rounded-md">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Changes:</p>
                    <div className="space-y-2">
                      {changes.map((change, changeIndex) => (
                        <div key={changeIndex} className="text-xs">
                          <span className="font-medium capitalize">{change.field}:</span>
                          {change.from !== null ? (
                            <div className="ml-2 space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-red-600 dark:text-red-400">From:</span>
                                <code className="bg-red-50 dark:bg-red-900/20 px-1 rounded text-xs">
                                  {typeof change.from === 'object' 
                                    ? JSON.stringify(change.from) 
                                    : String(change.from || 'empty')
                                  }
                                </code>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-green-600 dark:text-green-400">To:</span>
                                <code className="bg-green-50 dark:bg-green-900/20 px-1 rounded text-xs">
                                  {typeof change.to === 'object' 
                                    ? JSON.stringify(change.to) 
                                    : String(change.to || 'empty')
                                  }
                                </code>
                              </div>
                            </div>
                          ) : (
                            <div className="ml-2">
                              <code className="bg-muted px-1 rounded text-xs">
                                {typeof change.to === 'object' 
                                  ? JSON.stringify(change.to) 
                                  : String(change.to || 'empty')
                                }
                              </code>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )

  if (!showHeader) {
    return <div className={className}>{content}</div>
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Audit Trail
            <Badge variant="secondary" className="text-xs">
              {auditTrail.length} {auditTrail.length === 1 ? 'entry' : 'entries'}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-6 px-2"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-3 w-3 mr-1" />
                Collapse
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3 mr-1" />
                Expand
              </>
            )}
          </Button>
        </CardTitle>
      </CardHeader>
      {isExpanded && (
        <CardContent className="pt-0">
          <Separator className="mb-4" />
          {content}
        </CardContent>
      )}
    </Card>
  )
}

export default AuditTrail