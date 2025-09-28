"use client";

import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { safeJson } from '@/lib/utils'

export type Notification = {
  _id: string
  title: string
  body?: string
  url?: string
  read: boolean
  type?: string
  createdAt: string
}

type FilterTab = 'all' | 'unread' | 'read'

export interface NotificationContextType {
  items: Notification[]
  unreadCount: number
  loading: boolean
  error: string | null
  // Basic list metadata for pages that need it
  page: number
  limit: number
  total: number
  filter: FilterTab
  // Fetch and actions
  fetchNotifications: (options?: { force?: boolean; page?: number; limit?: number; filter?: FilterTab }) => Promise<void>
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  refreshNotifications: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextType | null>(null)

const SESSION_KEY = 'kmwf.notificationsFetched.session'
const STALE_MS = 60_000 // 1 minute

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // List metadata (used by /notifications page, but safe for bell too)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [total, setTotal] = useState(0)
  const [filter, setFilter] = useState<FilterTab>('all')

  // request throttling
  const inFlightRef = useRef<Promise<void> | null>(null)
  const lastFetchRef = useRef(0)

  const doFetch = useCallback(async (opts?: { page?: number; limit?: number; filter?: FilterTab }) => {
    setLoading(true)
    setError(null)
    try {
      const nextPage = opts?.page ?? page
      const nextLimit = opts?.limit ?? limit
      const nextFilter = opts?.filter ?? filter
      const qs = new URLSearchParams({ page: String(nextPage), limit: String(nextLimit) })
      if (nextFilter === 'unread') qs.set('unread', 'true')
      if (nextFilter === 'read') qs.set('read', 'true')
  const res = await fetch(`/api/protected/notifications?${qs.toString()}`, { cache: 'no-store' })
  const data = await safeJson<any>(res)
      setItems(data.items || [])
      setTotal(typeof data.total === 'number' ? data.total : data.items?.length || 0)
      setUnreadCount(typeof data.unreadCount === 'number' ? data.unreadCount : 0)
      // persist params in state for later refresh
      setPage(nextPage)
      setLimit(nextLimit)
      setFilter(nextFilter)
      lastFetchRef.current = Date.now()
    } catch (e: any) {
      setError(e?.message || 'Failed to fetch')
    } finally {
      setLoading(false)
    }
  }, [page, limit, filter])

  const fetchNotifications: NotificationContextType['fetchNotifications'] = useCallback(async (options) => {
    const now = Date.now()
    const isStale = now - lastFetchRef.current >= STALE_MS
    const shouldForce = !!options?.force
    if (!shouldForce && !isStale && inFlightRef.current === null) {
      // Nothing to do; within freshness window
      return
    }
    if (inFlightRef.current) {
      // Deduplicate: wait for the pending one
      try { await inFlightRef.current } catch { /* ignore */ }
      return
    }
    const promise = doFetch({ page: options?.page, limit: options?.limit, filter: options?.filter })
    inFlightRef.current = promise
    try { await promise } finally { inFlightRef.current = null }
  }, [doFetch])

  const refreshNotifications = useCallback(async () => {
    await fetchNotifications({ force: true, page, limit, filter })
  }, [fetchNotifications, page, limit, filter])

  const markAsRead: NotificationContextType['markAsRead'] = useCallback(async (id) => {
    try {
      const res = await fetch(`/api/protected/notifications/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ read: true })
      })
      if (!res.ok) throw new Error('Failed to mark read')
      setItems(prev => prev.map(n => n._id === id ? { ...n, read: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (e) {
      console.error(e)
    }
  }, [])

  const markAllAsRead: NotificationContextType['markAllAsRead'] = useCallback(async () => {
    // Optimistic
    setItems(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
    try {
      await fetch('/api/protected/notifications/mark-all-read', { method: 'POST' })
    } catch { /* ignore */ }
    // Refresh to ensure consistency
    await refreshNotifications()
  }, [refreshNotifications])

  // initial session fetch
  useEffect(() => {
    try {
      const already = sessionStorage.getItem(SESSION_KEY)
      if (!already) {
        sessionStorage.setItem(SESSION_KEY, '1')
        // Use default page/limit for bell (10)
        fetchNotifications({ force: true, page: 1, limit: 10, filter: 'all' })
      }
    } catch {
      fetchNotifications({ force: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const value: NotificationContextType = useMemo(() => ({
    items,
    unreadCount,
    loading,
    error,
    page,
    limit,
    total,
    filter,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    refreshNotifications,
  }), [items, unreadCount, loading, error, page, limit, total, filter, fetchNotifications, markAsRead, markAllAsRead, refreshNotifications])

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

export default NotificationContext
