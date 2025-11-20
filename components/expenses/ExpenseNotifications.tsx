'use client'

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { toast } from 'sonner'
import { CheckCircle, XCircle, AlertCircle, Info, Loader2 } from 'lucide-react'

// Notification types for expense operations
export type ExpenseNotificationType = 'success' | 'error' | 'warning' | 'info' | 'loading'

export interface ExpenseNotification {
  id: string
  type: ExpenseNotificationType
  title: string
  message?: string
  duration?: number
  actions?: Array<{
    label: string
    action: () => void
    variant?: 'default' | 'destructive' | 'outline'
  }>
  persistent?: boolean
}

interface ExpenseNotificationContextType {
  notifications: ExpenseNotification[]
  showNotification: (notification: Omit<ExpenseNotification, 'id'>) => string
  dismissNotification: (id: string) => void
  clearAllNotifications: () => void
  
  // Convenience methods for common expense operations
  showSuccess: (title: string, message?: string, actions?: ExpenseNotification['actions']) => string
  showError: (title: string, message?: string, actions?: ExpenseNotification['actions']) => string
  showWarning: (title: string, message?: string, actions?: ExpenseNotification['actions']) => string
  showInfo: (title: string, message?: string, actions?: ExpenseNotification['actions']) => string
  showLoading: (title: string, message?: string) => string
  
  // Operation-specific notifications
  showExpenseCreated: (expenseId?: string) => string
  showExpenseUpdated: (expenseId?: string) => string
  showExpenseDeleted: (expenseId?: string) => string
  showReceiptUploaded: (fileName?: string) => string
  showValidationError: (errors: string[]) => string
  showNetworkError: (retryAction?: () => void) => string
  showPermissionError: () => string
}

const ExpenseNotificationContext = createContext<ExpenseNotificationContextType | undefined>(undefined)

export function ExpenseNotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<ExpenseNotification[]>([])

  const generateId = () => Math.random().toString(36).substr(2, 9)

  const showNotification = useCallback((notification: Omit<ExpenseNotification, 'id'>) => {
    const id = generateId()
    const newNotification: ExpenseNotification = {
      ...notification,
      id,
      duration: notification.duration ?? (notification.type === 'loading' ? Infinity : 5000)
    }

    setNotifications(prev => [...prev, newNotification])

    // Show toast notification
    const toastOptions = {
      id,
      duration: newNotification.duration,
      action: newNotification.actions?.[0] ? {
        label: newNotification.actions[0].label,
        onClick: newNotification.actions[0].action
      } : undefined
    }

    switch (notification.type) {
      case 'success':
        toast.success(notification.title, {
          description: notification.message,
          ...toastOptions
        })
        break
      case 'error':
        toast.error(notification.title, {
          description: notification.message,
          ...toastOptions
        })
        break
      case 'warning':
        toast.warning(notification.title, {
          description: notification.message,
          ...toastOptions
        })
        break
      case 'info':
        toast.info(notification.title, {
          description: notification.message,
          ...toastOptions
        })
        break
      case 'loading':
        toast.loading(notification.title, {
          description: notification.message,
          ...toastOptions
        })
        break
    }

    // Auto-dismiss non-persistent notifications
    if (!notification.persistent && notification.duration !== Infinity) {
      setTimeout(() => {
        dismissNotification(id)
      }, notification.duration || 5000)
    }

    return id
  }, [])

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
    toast.dismiss(id)
  }, [])

  const clearAllNotifications = useCallback(() => {
    setNotifications([])
    toast.dismiss()
  }, [])

  // Convenience methods
  const showSuccess = useCallback((title: string, message?: string, actions?: ExpenseNotification['actions']) => {
    return showNotification({ type: 'success', title, message, actions })
  }, [showNotification])

  const showError = useCallback((title: string, message?: string, actions?: ExpenseNotification['actions']) => {
    return showNotification({ type: 'error', title, message, actions, duration: 8000 })
  }, [showNotification])

  const showWarning = useCallback((title: string, message?: string, actions?: ExpenseNotification['actions']) => {
    return showNotification({ type: 'warning', title, message, actions, duration: 6000 })
  }, [showNotification])

  const showInfo = useCallback((title: string, message?: string, actions?: ExpenseNotification['actions']) => {
    return showNotification({ type: 'info', title, message, actions })
  }, [showNotification])

  const showLoading = useCallback((title: string, message?: string) => {
    return showNotification({ type: 'loading', title, message, duration: Infinity })
  }, [showNotification])

  // Operation-specific notifications
  const showExpenseCreated = useCallback((expenseId?: string) => {
    return showSuccess(
      'Expense Created',
      expenseId ? `Expense ${expenseId.slice(-6)} has been created successfully.` : 'Your expense has been created successfully.',
      expenseId ? [{
        label: 'View Expense',
        action: () => {
          // Navigate to expense details
          window.location.href = `/admin/expenses/${expenseId}`
        }
      }] : undefined
    )
  }, [showSuccess])

  const showExpenseUpdated = useCallback((expenseId?: string) => {
    return showSuccess(
      'Expense Updated',
      expenseId ? `Expense ${expenseId.slice(-6)} has been updated successfully.` : 'Your expense has been updated successfully.',
      expenseId ? [{
        label: 'View Expense',
        action: () => {
          window.location.href = `/admin/expenses/${expenseId}`
        }
      }] : undefined
    )
  }, [showSuccess])

  const showExpenseDeleted = useCallback((expenseId?: string) => {
    return showSuccess(
      'Expense Deleted',
      expenseId ? `Expense ${expenseId.slice(-6)} has been deleted.` : 'The expense has been deleted.',
      [{
        label: 'Undo',
        action: () => {
          showInfo('Undo Not Available', 'Please contact an administrator to restore deleted expenses.')
        }
      }]
    )
  }, [showSuccess, showInfo])

  const showReceiptUploaded = useCallback((fileName?: string) => {
    return showSuccess(
      'Receipt Uploaded',
      fileName ? `${fileName} has been uploaded successfully.` : 'Receipt has been uploaded successfully.'
    )
  }, [showSuccess])

  const showValidationError = useCallback((errors: string[]) => {
    const title = 'Validation Error'
    const message = errors.length === 1 
      ? errors[0]
      : `${errors.length} validation errors found: ${errors[0]}`
    
    return showError(title, message)
  }, [showError])

  const showNetworkError = useCallback((retryAction?: () => void) => {
    return showError(
      'Network Error',
      'Unable to connect to the server. Please check your internet connection.',
      retryAction ? [{
        label: 'Retry',
        action: retryAction
      }] : undefined
    )
  }, [showError])

  const showPermissionError = useCallback(() => {
    return showError(
      'Access Denied',
      'You do not have permission to perform this action. Please contact an administrator.',
      [{
        label: 'Contact Support',
        action: () => {
          // Open support contact
          window.location.href = '/contact'
        }
      }]
    )
  }, [showError])

  const contextValue: ExpenseNotificationContextType = {
    notifications,
    showNotification,
    dismissNotification,
    clearAllNotifications,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showLoading,
    showExpenseCreated,
    showExpenseUpdated,
    showExpenseDeleted,
    showReceiptUploaded,
    showValidationError,
    showNetworkError,
    showPermissionError
  }

  return (
    <ExpenseNotificationContext.Provider value={contextValue}>
      {children}
    </ExpenseNotificationContext.Provider>
  )
}

// Hook to use expense notifications
export function useExpenseNotifications() {
  const context = useContext(ExpenseNotificationContext)
  if (context === undefined) {
    throw new Error('useExpenseNotifications must be used within an ExpenseNotificationProvider')
  }
  return context
}

// Higher-order component to wrap components with notification provider
export function withExpenseNotifications<P extends object>(
  Component: React.ComponentType<P>
) {
  return function WrappedComponent(props: P) {
    return (
      <ExpenseNotificationProvider>
        <Component {...props} />
      </ExpenseNotificationProvider>
    )
  }
}

// Notification display component for custom UI (optional)
export function ExpenseNotificationDisplay() {
  const { notifications, dismissNotification } = useExpenseNotifications()

  if (notifications.length === 0) {
    return null
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`
            p-4 rounded-lg shadow-lg border backdrop-blur-sm
            ${notification.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : ''}
            ${notification.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : ''}
            ${notification.type === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' : ''}
            ${notification.type === 'info' ? 'bg-blue-50 border-blue-200 text-blue-800' : ''}
            ${notification.type === 'loading' ? 'bg-gray-50 border-gray-200 text-gray-800' : ''}
          `}
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              {notification.type === 'success' && <CheckCircle className="h-5 w-5" />}
              {notification.type === 'error' && <XCircle className="h-5 w-5" />}
              {notification.type === 'warning' && <AlertCircle className="h-5 w-5" />}
              {notification.type === 'info' && <Info className="h-5 w-5" />}
              {notification.type === 'loading' && <Loader2 className="h-5 w-5 animate-spin" />}
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{notification.title}</p>
              {notification.message && (
                <p className="text-sm opacity-90 mt-1">{notification.message}</p>
              )}
              
              {notification.actions && notification.actions.length > 0 && (
                <div className="flex gap-2 mt-3">
                  {notification.actions.map((action, index) => (
                    <button
                      key={index}
                      onClick={action.action}
                      className="text-xs px-2 py-1 rounded border bg-white/50 hover:bg-white/80 transition-colors"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {!notification.persistent && (
              <button
                onClick={() => dismissNotification(notification.id)}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600"
              >
                <XCircle className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}