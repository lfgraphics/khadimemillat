'use client'

import React from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Shield, 
  Lock, 
  Clock, 
  User, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Calendar
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, differenceInDays } from 'date-fns'
import { IExpenseEntry } from '@/models/ExpenseEntry'

interface EditRestrictionsProps {
  expense: IExpenseEntry
  currentUserId: string
  currentUserRole: string
  className?: string
  showDetails?: boolean
}

interface FieldRestriction {
  field: string
  label: string
  isProtected: boolean
  reason: string
  icon: React.ReactNode
}

export function EditRestrictions({
  expense,
  currentUserId,
  currentUserRole,
  className,
  showDetails = true
}: EditRestrictionsProps) {
  // Calculate days since creation
  const daysSinceCreation = differenceInDays(new Date(), new Date(expense.createdAt))
  const isOlderThan30Days = daysSinceCreation > 30
  const isOwner = expense.clerkUserId === currentUserId
  const isAdmin = currentUserRole === 'admin'
  const isDeleted = expense.isDeleted

  // Determine overall edit permission
  const canEdit = !isDeleted && (isAdmin || (isOwner && (!isOlderThan30Days || isAdmin)))

  // Define field restrictions
  const fieldRestrictions: FieldRestriction[] = [
    {
      field: 'createdAt',
      label: 'Creation Date',
      isProtected: true,
      reason: 'System-generated timestamp cannot be modified',
      icon: <Calendar className="h-3 w-3" />
    },
    {
      field: 'clerkUserId',
      label: 'Creator',
      isProtected: true,
      reason: 'Original creator cannot be changed',
      icon: <User className="h-3 w-3" />
    },
    {
      field: 'auditTrail',
      label: 'Audit Trail',
      isProtected: true,
      reason: 'Audit history is immutable for compliance',
      icon: <Shield className="h-3 w-3" />
    },
    {
      field: 'amount',
      label: 'Amount',
      isProtected: isDeleted || (!isAdmin && !isOwner),
      reason: isDeleted 
        ? 'Cannot modify deleted expenses' 
        : !isOwner 
          ? 'Only the creator or admin can modify amount'
          : 'Editable',
      icon: <Lock className="h-3 w-3" />
    },
    {
      field: 'expenseDate',
      label: 'Expense Date',
      isProtected: isDeleted || (!isAdmin && !isOwner),
      reason: isDeleted 
        ? 'Cannot modify deleted expenses' 
        : !isOwner 
          ? 'Only the creator or admin can modify date'
          : 'Editable',
      icon: <Calendar className="h-3 w-3" />
    }
  ]

  // Get restriction status
  const getRestrictionStatus = () => {
    if (isDeleted) {
      return {
        status: 'deleted',
        message: 'This expense has been deleted and cannot be modified',
        variant: 'destructive' as const,
        icon: <XCircle className="h-4 w-4" />
      }
    }

    if (!isOwner && !isAdmin) {
      return {
        status: 'no-permission',
        message: 'You can only edit your own expenses',
        variant: 'destructive' as const,
        icon: <XCircle className="h-4 w-4" />
      }
    }

    if (isOlderThan30Days && !isAdmin) {
      return {
        status: 'time-restricted',
        message: `This expense is ${daysSinceCreation} days old. Expenses older than 30 days require admin approval to edit.`,
        variant: 'destructive' as const,
        icon: <Clock className="h-4 w-4" />
      }
    }

    if (canEdit) {
      return {
        status: 'editable',
        message: isAdmin 
          ? 'You have full admin privileges to edit this expense'
          : 'You can edit this expense',
        variant: 'default' as const,
        icon: <CheckCircle className="h-4 w-4" />
      }
    }

    return {
      status: 'restricted',
      message: 'This expense cannot be edited',
      variant: 'destructive' as const,
      icon: <XCircle className="h-4 w-4" />
    }
  }

  const restrictionStatus = getRestrictionStatus()

  return (
    <div className={cn('space-y-4', className)}>
      {/* Overall Status */}
      <Alert variant={restrictionStatus.variant}>
        <div className="flex items-center gap-2">
          {restrictionStatus.icon}
          <AlertDescription className="flex-1">
            {restrictionStatus.message}
          </AlertDescription>
          <Badge 
            variant={canEdit ? 'default' : 'destructive'}
            className="ml-2"
          >
            {canEdit ? 'Editable' : 'Restricted'}
          </Badge>
        </div>
      </Alert>

      {/* Time-based restrictions info */}
      {!isDeleted && (
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>Created {daysSinceCreation} days ago</span>
          </div>
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            <span>{isOwner ? 'Your expense' : 'Created by another user'}</span>
          </div>
          <div className="flex items-center gap-1">
            <Shield className="h-3 w-3" />
            <span>Role: {currentUserRole}</span>
          </div>
        </div>
      )}

      {/* Detailed field restrictions */}
      {showDetails && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Field Protection Rules
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {fieldRestrictions.map((restriction) => (
                <div
                  key={restriction.field}
                  className="flex items-center justify-between p-2 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-2">
                    {restriction.icon}
                    <span className="text-sm font-medium">{restriction.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground max-w-xs truncate">
                      {restriction.reason}
                    </span>
                    <Badge 
                      variant={restriction.isProtected ? 'destructive' : 'default'}
                      className="text-xs"
                    >
                      {restriction.isProtected ? 'Protected' : 'Editable'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Admin override notice */}
      {isAdmin && isOlderThan30Days && (
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <strong>Admin Override:</strong> You can edit this expense despite the 30-day restriction due to your admin privileges.
          </AlertDescription>
        </Alert>
      )}

      {/* Deletion info */}
      {isDeleted && expense.deletedAt && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This expense was deleted on {format(new Date(expense.deletedAt), 'PPP')}
            {expense.deletedBy && ` by ${expense.deletedBy}`}.
            All data is preserved in the audit trail for compliance purposes.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

export default EditRestrictions