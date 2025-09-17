"use client"
import React, { useEffect, useState, useCallback } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

interface NotificationItem { _id: string; title: string; body?: string; createdAt: string; read: boolean; type?: string; url?: string }

type FilterTab = 'all' | 'unread' | 'read'

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<FilterTab>('all')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 12

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (tab === 'unread') params.set('unread','true')
      if (tab === 'read') params.set('read','true')
      const res = await fetch(`/api/protected/notifications?${params.toString()}`, { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to load')
      const json = await res.json()
      setItems(json.items || [])
      setTotal(json.total || (json.items?.length || 0))
    } catch(e:any) { setError(e.message || 'Error'); } finally { setLoading(false) }
  }, [page, tab])

  useEffect(()=> { load() }, [load])

  const markRead = async (id: string) => {
    try { await fetch(`/api/protected/notifications/${id}`, { method: 'PATCH', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ read: true }) }); load() } catch(e){ console.error(e) }
  }

  const markAllCurrentPage = async () => {
    const unread = items.filter(i=> !i.read)
    if (unread.length === 0) return
    await Promise.all(unread.map(u => fetch(`/api/protected/notifications/${u._id}`, { method: 'PATCH', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ read: true }) })))
    load()
  }

  const totalPages = Math.max(1, Math.ceil(total / limit))

  return (
    <div className='p-6 space-y-6'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-semibold'>Notifications</h1>
        <div className='flex items-center gap-2'>
          <Button variant='outline' size='sm' onClick={()=> load()} disabled={loading}>{loading ? <Loader2 className='h-4 w-4 animate-spin' /> : 'Refresh'}</Button>
          <Button variant='secondary' size='sm' onClick={markAllCurrentPage} disabled={items.every(i=> i.read)}>Mark Page Read</Button>
        </div>
      </div>
      <Tabs value={tab} onValueChange={(v)=> { setTab(v as FilterTab); setPage(1); }}>
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
          {Array.from({ length: 6 }).map((_,i)=>(<Card key={i} className='p-4 animate-pulse h-40' />))}
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
                  {!n.read && <Button size='sm' variant='ghost' className='h-6 px-2 text-[10px]' onClick={()=> markRead(n._id)}>Mark</Button>}
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
            <Button size='sm' variant='outline' disabled={page===1} onClick={()=> setPage(p=> Math.max(1,p-1))}>Prev</Button>
            <Button size='sm' variant='outline' disabled={page===totalPages} onClick={()=> setPage(p=> Math.min(totalPages,p+1))}>Next</Button>
          </div>
        </div>
      )}
    </div>
  )
}
