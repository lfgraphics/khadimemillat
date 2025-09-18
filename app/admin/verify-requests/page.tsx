"use client"
import React, { useEffect, useState, useCallback } from 'react'
import { useUser } from '@clerk/nextjs'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import ScrapperAssignmentModal from '@/components/ScrapperAssignmentModal'
import { Loader2, Phone, MapPin, Calendar, User } from 'lucide-react'

interface RequestItem { _id: string; donor?: any; phone: string; address: string; requestedPickupTime: string; status: string; notes?: string }

export default function VerifyRequestsPage() {
  const [items, setItems] = useState<RequestItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [verifyingId, setVerifyingId] = useState<string | null>(null)
  const [assignDialogId, setAssignDialogId] = useState<string | null>(null)
  const [autoAssigningId, setAutoAssigningId] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{address: string; phone: string; requestedPickupTime: string; notes: string}>({ address: '', phone: '', requestedPickupTime: '', notes: '' })

  const { user } = useUser()
  const role = (user?.publicMetadata as any)?.role
  const canAccess = ['admin','moderator'].includes(role)
  const [statusFilter, setStatusFilter] = useState<string>('pending')

  const load = useCallback(async () => {
    if (!canAccess) return;
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      const res = await fetch(`/api/protected/collection-requests?${params.toString()}`, { cache: 'no-store' })
      if(!res.ok){
        const txt = await res.text()
        throw new Error(`Fetch failed (${res.status}) ${txt}`)
      }
      const json = await res.json()
      const incoming = json.items || []
      if (incoming.length === 0) {
        console.debug('[VERIFY_REQUESTS] No items returned for filter', statusFilter)
      }
      setItems(incoming)
    } catch(e:any){
      console.error('[VERIFY_REQUESTS_LOAD_ERROR]', e)
      setError(e.message || 'Failed to load')
    } finally { setLoading(false) }
  }, [statusFilter, canAccess])

  useEffect(()=>{ load() },[load])

  const verifyRequest = async (id: string) => {
    setProcessing(true)
    try {
      const res = await fetch(`/api/protected/collection-requests/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'verify' }) })
      if (!res.ok) throw new Error('Verification failed')
      setItems(prev => prev.filter(p => p._id !== id))
    } catch(e){ console.error(e); } finally { setProcessing(false); setVerifyingId(null) }
  }

  const autoAssign = async (id: string) => {
    setAutoAssigningId(id)
    try {
      const res = await fetch(`/api/protected/collection-requests/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'assign', scrapperIds: [] }) })
      if (!res.ok) throw new Error('Auto-assign failed')
      // remove from list after assignment attempt (or refresh list)
      setItems(prev => prev.filter(p => p._id !== id))
    } catch(e){ console.error(e) } finally { setAutoAssigningId(null) }
  }

  const openEdit = (r: any) => {
    setEditingId(r._id)
    setEditForm({
      address: r.address || '',
      phone: r.phone || '',
      requestedPickupTime: r.requestedPickupTime ? new Date(r.requestedPickupTime).toISOString().slice(0,16) : '',
      notes: r.notes || ''
    })
  }

  const submitEdit = async () => {
    if(!editingId) return
    setProcessing(true)
    try {
      const body: any = {
        address: editForm.address,
        phone: editForm.phone,
        notes: editForm.notes,
        requestedPickupTime: editForm.requestedPickupTime
      }
      const res = await fetch(`/api/protected/collection-requests/${editingId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if(!res.ok) throw new Error('Update failed')
      const json = await res.json()
      setItems(prev => prev.map(it => it._id === editingId ? { ...it, ...json.request } : it))
      setEditingId(null)
    } catch(e){ console.error(e) } finally { setProcessing(false) }
  }

  if (!canAccess) {
    return (
      <div className='p-6'>
        <h1 className='text-xl font-semibold mb-2'>Access Denied</h1>
        <p className='text-sm text-muted-foreground'>You don't have permission to view this page.</p>
      </div>
    )
  }

  return (
    <div className='p-6 space-y-6'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-semibold'>Pending Collection Requests</h1>
        <div className='flex items-center gap-2'>
          <select className='border rounded px-2 py-1 text-sm bg-background' value={statusFilter} onChange={e=> setStatusFilter(e.target.value)}>
            {['pending','verified','collected','completed'].map(s=> <option key={s} value={s}>{s}</option>)}
          </select>
          <Button variant='outline' size='sm' onClick={load} disabled={loading}>{loading ? <Loader2 className='h-4 w-4 animate-spin' /> : 'Refresh'}</Button>
        </div>
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
              <p className='flex items-center gap-1'><User className='h-3 w-3' /> {(r as any).donorDetails?.name || r.donor?.name || '—'}</p>
              <p className='flex items-center gap-1'><Phone className='h-3 w-3' /> <a href={`tel:${r.phone}`} className='text-blue-600'>{r.phone}</a></p>
              <p className='flex items-center gap-1'><MapPin className='h-3 w-3' /> {r.address}</p>
              <p className='flex items-center gap-1'><Calendar className='h-3 w-3' /> {new Date(r.requestedPickupTime).toLocaleString()}</p>
              {r.notes && <p className='italic text-[11px]'>{r.notes}</p>}
            </div>
            <div className='mt-auto pt-2 flex gap-2 flex-wrap'>
              <Dialog open={verifyingId === r._id} onOpenChange={(o)=> setVerifyingId(o ? r._id : null)}>
                <DialogTrigger asChild>
                  <Button size='sm' className='flex-1' variant='default'>Verify</Button>
                </DialogTrigger>
                <DialogContent className='max-w-sm'>
                  <DialogHeader>
                    <DialogTitle>Verify Request</DialogTitle>
                  </DialogHeader>
                  <p className='text-xs text-muted-foreground'>Confirm verification for donor <span className='font-medium'>{(r as any).donorDetails?.name || '—'}</span>? This will move the request to the verified queue for assignment.</p>
                  <DialogFooter className='pt-2'>
                    <Button variant='outline' size='sm' onClick={()=> setVerifyingId(null)} disabled={processing}>Cancel</Button>
                    <Button size='sm' onClick={()=> verifyRequest(r._id)} disabled={processing}>{processing ? <Loader2 className='h-3 w-3 animate-spin' /> : 'Confirm'}</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button size='sm' variant='outline' className='flex-1' onClick={()=> openEdit(r)}>Edit</Button>
              <Button size='sm' variant='outline' className='flex-1' onClick={()=> setAssignDialogId(r._id)}>Assign</Button>
              <Button size='sm' variant='ghost' className='flex-1' onClick={()=> autoAssign(r._id)} disabled={autoAssigningId === r._id}>
                {autoAssigningId === r._id ? <Loader2 className='h-3 w-3 animate-spin' /> : 'Auto'}
              </Button>
            </div>
          </Card>
        ))}
      </div>
      <Dialog open={!!editingId} onOpenChange={(o)=> { if(!o) setEditingId(null) }}>
        <DialogContent className='max-w-sm'>
          <DialogHeader>
            <DialogTitle>Edit Request</DialogTitle>
          </DialogHeader>
          <div className='space-y-3 text-xs'>
            <div>
              <label className='block mb-1 font-medium'>Address</label>
              <input className='w-full border rounded px-2 py-1 bg-background' value={editForm.address} onChange={e=> setEditForm(f=> ({...f, address: e.target.value}))} />
            </div>
            <div>
              <label className='block mb-1 font-medium'>Phone</label>
              <input className='w-full border rounded px-2 py-1 bg-background' value={editForm.phone} onChange={e=> setEditForm(f=> ({...f, phone: e.target.value}))} />
            </div>
            <div>
              <label className='block mb-1 font-medium'>Requested Pickup</label>
              <input type='datetime-local' className='w-full border rounded px-2 py-1 bg-background' value={editForm.requestedPickupTime} onChange={e=> setEditForm(f=> ({...f, requestedPickupTime: e.target.value}))} />
            </div>
            <div>
              <label className='block mb-1 font-medium'>Notes</label>
              <textarea className='w-full border rounded px-2 py-1 bg-background' rows={3} value={editForm.notes} onChange={e=> setEditForm(f=> ({...f, notes: e.target.value}))} />
            </div>
          </div>
          <DialogFooter className='pt-2'>
            <Button variant='outline' size='sm' onClick={()=> setEditingId(null)} disabled={processing}>Cancel</Button>
            <Button size='sm' onClick={submitEdit} disabled={processing}>{processing ? <Loader2 className='h-3 w-3 animate-spin' /> : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ScrapperAssignmentModal
        open={!!assignDialogId}
        onOpenChange={(o)=> { if(!o) setAssignDialogId(null) }}
        requestId={assignDialogId}
        onAssigned={()=> load()}
      />
      {!loading && items.length === 0 && !error && (
        <p className='text-sm text-muted-foreground'>No pending requests.</p>
      )}
    </div>
  )
}
