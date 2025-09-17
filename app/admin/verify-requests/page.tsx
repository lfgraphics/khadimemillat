"use client"
import React, { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Loader2, Phone, MapPin, Calendar, User } from 'lucide-react'

interface RequestItem { _id: string; donor?: any; phone: string; address: string; requestedPickupTime: string; status: string; notes?: string }

export default function VerifyRequestsPage() {
  const [items, setItems] = useState<RequestItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [verifyingId, setVerifyingId] = useState<string | null>(null)
  const [assignDialogId, setAssignDialogId] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/protected/collection-requests?status=pending')
      const json = await res.json()
      setItems(json.items || [])
    } catch(e:any){ setError(e.message || 'Failed to load') } finally { setLoading(false) }
  }
  useEffect(()=>{ load() },[])

  const verifyRequest = async (id: string) => {
    setProcessing(true)
    try {
      const res = await fetch(`/api/protected/collection-requests/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'verified' }) })
      if (!res.ok) throw new Error('Verification failed')
      const json = await res.json()
      setItems(prev => prev.filter(p => p._id !== id))
    } catch(e){ console.error(e); } finally { setProcessing(false); setVerifyingId(null) }
  }

  return (
    <div className='p-6 space-y-6'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-semibold'>Pending Collection Requests</h1>
        <Button variant='outline' size='sm' onClick={load} disabled={loading}>{loading ? <Loader2 className='h-4 w-4 animate-spin' /> : 'Refresh'}</Button>
      </div>
      {error && (
        <Alert variant='destructive'>
          <AlertDescription className='text-xs'>{error}</AlertDescription>
        </Alert>
      )}
      {loading && items.length === 0 && (
        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
          {Array.from({ length: 6 }).map((_,i)=>(<Card key={i} className='p-4 animate-pulse h-48' />))}
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
              <p className='flex items-center gap-1'><User className='h-3 w-3' /> {r.donor?.name || '—'}</p>
              <p className='flex items-center gap-1'><Phone className='h-3 w-3' /> <a href={`tel:${r.phone}`} className='text-blue-600'>{r.phone}</a></p>
              <p className='flex items-center gap-1'><MapPin className='h-3 w-3' /> {r.address}</p>
              <p className='flex items-center gap-1'><Calendar className='h-3 w-3' /> {new Date(r.requestedPickupTime).toLocaleString()}</p>
              {r.notes && <p className='italic text-[11px]'>{r.notes}</p>}
            </div>
            <div className='mt-auto pt-2 flex gap-2'>
              <Dialog open={verifyingId === r._id} onOpenChange={(o)=> setVerifyingId(o ? r._id : null)}>
                <DialogTrigger asChild>
                  <Button size='sm' className='flex-1' variant='default'>Verify</Button>
                </DialogTrigger>
                <DialogContent className='max-w-sm'>
                  <DialogHeader>
                    <DialogTitle>Verify Request</DialogTitle>
                  </DialogHeader>
                  <p className='text-xs text-muted-foreground'>Confirm verification for donor <span className='font-medium'>{r.donor?.name || '—'}</span>? This will move the request to the verified queue for assignment.</p>
                  <DialogFooter className='pt-2'>
                    <Button variant='outline' size='sm' onClick={()=> setVerifyingId(null)} disabled={processing}>Cancel</Button>
                    <Button size='sm' onClick={()=> verifyRequest(r._id)} disabled={processing}>{processing ? <Loader2 className='h-3 w-3 animate-spin' /> : 'Confirm'}</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button size='sm' variant='outline' className='flex-1' disabled>Assign</Button>
            </div>
          </Card>
        ))}
      </div>
      {!loading && items.length === 0 && !error && (
        <p className='text-sm text-muted-foreground'>No pending requests.</p>
      )}
    </div>
  )
}
