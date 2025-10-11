"use client"
import React, { useEffect } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useNotifications } from '@/hooks/useNotifications'

interface NotificationItem { _id: string; title: string; body?: string; createdAt: string; read: boolean; type?: string; url?: string }

export default function NotificationsPage() {
  const { items, loading, error, page, limit, total, filter, fetchNotifications, markAsRead, refreshNotifications } = useNotifications()

  // Initialize the notifications page with a page size of 12 for grid layout
  useEffect(() => { fetchNotifications({ force: true, page: 1, limit: 12, filter }) }, [])

  const totalPages = Math.max(1, Math.ceil(total / (limit || 12)))

  return (
    <div className='p-6 space-y-6'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-semibold'>Notifications</h1>
        <div className='flex items-center gap-2'>
          <Button variant='outline' size='sm' onClick={() => refreshNotifications()} disabled={loading}>{loading ? <Loader2 className='h-4 w-4 animate-spin' /> : 'Refresh'}</Button>
          <Button variant='secondary' size='sm' onClick={async () => { const unread = items.filter(i => !i.read); if (unread.length === 0) return; for (const n of unread) await markAsRead(n._id); await refreshNotifications() }} disabled={items.every(i => i.read)}>Mark Page Read</Button>
        </div>
      </div>
      <Tabs value={filter} onValueChange={(v) => { fetchNotifications({ force: true, page: 1, limit: limit || 12, filter: v as any }) }}>
        <TabsList>
          <TabsTrigger value='all'>All</TabsTrigger>
          <TabsTrigger value='unread'>Unread</TabsTrigger>
          <TabsTrigger value='read'>Read</TabsTrigger>
        </TabsList>
        <TabsContent value='all' className='pt-4' />
        <TabsContent value='unread' className='pt-4' />
        <TabsContent value='read' className='pt-4' />
      </Tabs>
      {error && (
        <Alert variant='destructive'>
          <AlertDescription className='text-xs'>{error}</AlertDescription>
        </Alert>
      )}
      {loading && items.length === 0 && (
        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
          {Array.from({ length: 6 }).map((_, i) => (<Card key={i} className='p-4 animate-pulse h-40' />))}
        </div>
      )}
      {!loading && items.length === 0 && !error && (
        <p className='text-sm text-muted-foreground'>No notifications.</p>
      )}
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
        {items.map(n => (
          <Card key={n._id} className='flex flex-col'>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm flex items-start justify-between gap-2'>
                <span className='font-medium line-clamp-2'>{n.title}</span>
                <div className='flex items-center gap-1'>
                  {!n.read && <Badge variant='secondary' className='text-[10px]'>New</Badge>}
                  {n.type && <Badge variant='outline' className='text-[10px]'>{n.type}</Badge>}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className='flex flex-col gap-2 text-xs pt-0'>
              {n.body && <p className='text-muted-foreground line-clamp-4'>{n.body}</p>}
              <div className='mt-auto flex items-center justify-between pt-1'>
                <span className='text-[10px] text-muted-foreground'>{new Date(n.createdAt).toLocaleString()}</span>
                <div className='flex items-center gap-2'>
                  {!n.read && <Button size='sm' variant='ghost' className='h-6 px-2 text-[10px]' onClick={() => markAsRead(n._id)}>Mark</Button>}
                  {n.url && <Button asChild size='sm' variant='link' className='h-6 px-0 text-[10px]'><Link href={n.url}>Open →</Link></Button>}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {totalPages > 1 && (
        <div className='flex items-center justify-between pt-2'>
          <p className='text-[11px] text-muted-foreground'>Page {page} of {totalPages}</p>
          <div className='flex items-center gap-2'>
            <Button size='sm' variant='outline' disabled={page === 1} onClick={() => fetchNotifications({ force: true, page: Math.max(1, page - 1), limit: limit || 12, filter })}>Prev</Button>
            <Button size='sm' variant='outline' disabled={page === totalPages} onClick={() => fetchNotifications({ force: true, page: Math.min(totalPages, page + 1), limit: limit || 12, filter })}>Next</Button>
          </div>
        </div>
      )}
    </div>
  )
}
