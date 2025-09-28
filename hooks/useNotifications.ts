"use client";

import { useContext } from 'react'
import NotificationContext, { NotificationContextType } from '@/contexts/NotificationContext'

export function useNotifications(): NotificationContextType {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotifications must be used within a NotificationProvider')
  return ctx
}

export function useUnreadCount() {
  const { unreadCount } = useNotifications()
  return unreadCount
}

export function useNotificationActions() {
  const { markAsRead, markAllAsRead, refreshNotifications, fetchNotifications } = useNotifications()
  return { markAsRead, markAllAsRead, refreshNotifications, fetchNotifications }
}
