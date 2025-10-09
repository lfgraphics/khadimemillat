"use client"
import React, { useEffect, useState } from 'react'
import { safeJson } from '@/lib/utils'
import { useUser } from '@clerk/nextjs'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ProfileState { phone: string; address: string; id?: string }

export default function AccountPage() {
  const { user, isLoaded } = useUser()
  const [state, setState] = useState<ProfileState>({ phone: '', address: '' })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [purchases, setPurchases] = useState<any[]>([])
  const [loadingPurchases, setLoadingPurchases] = useState(false)

  useEffect(() => {
    if (!isLoaded || !user) return
    const load = async () => {
      setLoading(true)
      try {
  // Server now sources phone/address from Clerk privateMetadata; this endpoint only runs server-side
  const res = await fetch('/api/protected/users?self=1')
        const json = await safeJson<any>(res)
        if (json.users && json.users.length) {
          const u = json.users[0]
          setState({ phone: u.phone || '', address: u.address || '', id: u.mongoUserId || u._id || u.id })
        }
      } catch (e) { console.error(e) } finally { setLoading(false) }
    }
    load()
    const loadPurchases = async () => {
      setLoadingPurchases(true)
      try {
        const res = await fetch('/api/protected/purchases', { cache: 'no-store' })
        const data = await safeJson<any>(res)
        setPurchases(Array.isArray(data?.purchases) ? data.purchases : [])
      } catch (e) { console.error(e) } finally { setLoadingPurchases(false) }
    }
    loadPurchases()
  }, [isLoaded, user])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!state.id) return
    setSaving(true); setError(null); setSuccess(false)
    try {
      const res = await fetch(`/api/protected/users/${state.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: state.phone, address: state.address }) })
      if (!res.ok) throw new Error(await res.text())
      setSuccess(true)
      toast.success('Profile updated')
    } catch (e: any) {
      const msg = e.message || 'Failed to save'
      setError(msg)
      toast.error(msg)
    } finally { setSaving(false) }
  }

  return (
    <div className='p-6 max-w-3xl space-y-6'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-semibold'>My Profile</h1>
        <p className='text-xs text-muted-foreground'>Personal contact & address</p>
      </div>
      {!isLoaded || loading ? (
        <div className='flex items-center gap-2 text-sm text-muted-foreground'><Loader2 className='h-4 w-4 animate-spin' /> Loading profile...</div>
      ) : (
        <Card>
          <CardHeader className='pb-3'>
            <CardTitle className='text-base'>Contact Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className='space-y-5'>
              <div className='space-y-1'>
                <label className='text-xs font-medium'>Phone</label>
                <Input value={state.phone} onChange={e => setState(s => ({ ...s, phone: e.target.value }))} placeholder='+15551234567' />
              </div>
              <div className='space-y-1'>
                <label className='text-xs font-medium'>Address</label>
                <Textarea value={state.address} onChange={e => setState(s => ({ ...s, address: e.target.value }))} className='min-h-28' placeholder='Street, City, ...' />
              </div>
              <div className='flex items-center gap-3'>
                <Button type='submit' disabled={saving}>{saving ? <><Loader2 className='h-4 w-4 animate-spin mr-2' /> Saving</> : 'Save Changes'}</Button>
                {error && (
                  <Alert variant='destructive' className='py-2 px-3'>
                    <AlertDescription className='text-xs'>{error}</AlertDescription>
                  </Alert>
                )}
                {success && !error && (
                  <Alert variant='default' className='py-2 px-3'>
                    <AlertDescription className='text-xs'>Profile updated.</AlertDescription>
                  </Alert>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      )}
      <div className='text-xs text-muted-foreground'>These details auto-fill collection requests. Keep them accurate.</div>

      <div className='pt-6'>
        <div className='flex items-center justify-between mb-3'>
          <h2 className='text-xl font-semibold'>My Purchases</h2>
          <Button variant='outline' size='sm' onClick={() => {
            setLoadingPurchases(true)
            fetch('/api/protected/purchases', { cache: 'no-store' }).then(r => r.json()).then(d => setPurchases(d?.purchases || [])).finally(() => setLoadingPurchases(false))
          }}>Refresh</Button>
        </div>
        {loadingPurchases ? (
          <div className='flex items-center gap-2 text-sm text-muted-foreground'><Loader2 className='h-4 w-4 animate-spin'/> Loading purchases…</div>
        ) : purchases.length === 0 ? (
          <div className='text-sm text-muted-foreground'>No purchases yet.</div>
        ) : (
          <div className='grid gap-3 md:grid-cols-2'>
            {purchases.map((p) => {
              const item = p.scrapItemId || {}
              const thumb = Array.isArray(item?.photos?.after) && item.photos.after[0]
                ? item.photos.after[0]
                : (Array.isArray(item?.photos?.before) ? item.photos.before[0] : null)
              // Non-staff users should not see moderator routes; link to public marketplace if available
              const itemLink = item?._id ? `/marketplace?highlight=${item._id}` : undefined
              return (
                <Card key={p._id} className='overflow-hidden'>
                  <div className='flex'>
                    {thumb ? (
                      <a href={itemLink} className='block w-28 h-28 flex-shrink-0 bg-muted'>
                        <img src={thumb} alt={item?.name || 'Item'} className='w-full h-full object-cover' />
                      </a>
                    ) : (
                      <div className='w-28 h-28 flex-shrink-0 bg-muted' />
                    )}
                    <div className='flex-1'>
                      <CardHeader className='pb-2'>
                        <CardTitle className='text-base'>
                          {itemLink ? <a href={itemLink} className='hover:underline'>{item?.name || 'Item'}</a> : (item?.name || 'Item')}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className='text-sm grid grid-cols-2 gap-1'>
                        <div>Status: <span className='font-medium'>{p.status}</span></div>
                        <div>{p.salePrice ? `Amount: ₹${p.salePrice}` : ''}</div>
                        <div>{p.paymentMethod ? `Payment: ${p.paymentMethod}` : ''}</div>
                        <div>{p.completedAt ? `Completed: ${new Date(p.completedAt).toLocaleString()}` : ''}</div>
                      </CardContent>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
