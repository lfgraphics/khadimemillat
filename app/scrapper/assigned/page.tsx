"use client"
import React, { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { safeJson } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Loader2, Phone, MapPin, Calendar, User, Navigation } from 'lucide-react'

interface RequestItem { 
  _id: string; 
  donor?: any; 
  donorDetails?: { name?: string; phone?: string }; 
  phone: string; 
  address: string; 
  requestedPickupTime: string; 
  status: string;
  location?: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  }
}

export default function ScrapperAssignedPage() {
  const [items, setItems] = useState<RequestItem[]>([])
  const [loading, setLoading] = useState(false)
  const [collectingId, setCollectingId] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/protected/collection-requests?status=verified&assignedTo=self', { cache: 'no-store' })
      let data: any = null
      if (res.headers.get('content-type')?.includes('application/json')) {
        data = await safeJson<any>(res).catch(() => null)
      } else {
        const text = await res.text()
        data = { error: text }
      }
      if (!res.ok) {
        console.warn('[ASSIGNED_LOAD_ERROR]', data?.error)
        setItems([])
        return
      }
      setItems(data.items || [])
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const markCollected = async (id: string) => {
    setProcessing(true)
    try {
      const res = await fetch(`/api/protected/collection-requests/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'collect' }) })
      let data: any = null
      if (res.headers.get('content-type')?.includes('application/json')) {
        data = await safeJson<any>(res).catch(() => null)
      } else {
        const text = await res.text()
        data = { error: text }
      }
      if (res.ok && data?.request?.donationEntryId) {
        window.location.href = `/list-donation?collectionRequest=${id}`
        return
      }
      if (!res.ok) {
        console.warn('[COLLECT_ERROR]', data?.error)
      }
      load()
    } catch (e) { console.error(e) } finally { setProcessing(false); setCollectingId(null) }
  }

  const openMapsRoute = (request: RequestItem) => {
    const destination = request.location?.coordinates 
      ? `${request.location.coordinates[1]},${request.location.coordinates[0]}` // lat,lng format for Google Maps
      : encodeURIComponent(request.address)
    
    const url = `https://maps.google.com/maps?q=${destination}&navigation=1`
    window.open(url, '_blank')
  }

  return (
    <div className='p-6 space-y-6'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-semibold'>Assigned Collections</h1>
        <Button variant='outline' size='sm' onClick={load} disabled={loading}>{loading ? <Loader2 className='h-4 w-4 animate-spin' /> : 'Refresh'}</Button>
      </div>
      {loading && items.length === 0 && (
        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
          {Array.from({ length: 6 }).map((_, i) => (<Card key={i} className='p-4 animate-pulse h-48' />))}
        </div>
      )}
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
        {items.map(r => (
          <Card key={r._id} className='p-4 space-y-3 flex flex-col'>
            <div className='flex items-start justify-between'>
              <Badge variant='secondary' className='uppercase tracking-wide'>{r.status}</Badge>
              <span className='text-[10px] text-muted-foreground'>{new Date(r.requestedPickupTime).toLocaleDateString()}</span>
            </div>
            <div className='space-y-1 text-xs'>
              <p className='flex items-center gap-1'><User className='h-3 w-3' /> {r.donorDetails?.name || '—'}</p>
              <p className='flex items-center gap-1'><Phone className='h-3 w-3' /> <a href={`tel:${r.phone}`} className='text-blue-600'>{r.phone}</a></p>
              <p className='flex items-center gap-1'><MapPin className='h-3 w-3' /> {r.address}</p>
              <p className='flex items-center gap-1'><Calendar className='h-3 w-3' /> {new Date(r.requestedPickupTime).toLocaleString()}</p>
              {r.location && (
                <p className='flex items-center gap-1 text-green-600'>
                  <Navigation className='h-3 w-3' /> Location available
                </p>
              )}
            </div>
            <div className='mt-auto pt-2 space-y-2'>
              <Button 
                size='sm' 
                variant='outline' 
                className='w-full' 
                onClick={() => openMapsRoute(r)}
              >
                <Navigation className='h-3 w-3 mr-1' />
                Navigate
              </Button>
              <Dialog open={collectingId === r._id} onOpenChange={(o) => setCollectingId(o ? r._id : null)}>
                <DialogTrigger asChild>
                  <Button size='sm' className='w-full' variant='default'>Mark Collected</Button>
                </DialogTrigger>
                <DialogContent className='max-w-sm'>
                  <DialogHeader>
                    <DialogTitle>Confirm Collection</DialogTitle>
                  </DialogHeader>
                  <p className='text-xs text-muted-foreground'>Confirm you have collected items from <span className='font-medium'>{r.donorDetails?.name || '—'}</span>. A donation entry will be created and you will proceed to item listing.</p>
                  <DialogFooter className='pt-2'>
                    <Button variant='outline' size='sm' onClick={() => setCollectingId(null)} disabled={processing}>Cancel</Button>
                    <Button size='sm' onClick={() => markCollected(r._id)} disabled={processing}>{processing ? <Loader2 className='h-3 w-3 animate-spin' /> : 'Confirm & Continue'}</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </Card>
        ))}
      </div>
      {!loading && items.length === 0 && (
        <p className='text-sm text-muted-foreground'>No assignments.</p>
      )}
    </div>
  )
}
