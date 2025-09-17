"use client";
import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type Tab = 'money' | 'scrap'

export default function DonationPage() {
  const [tab, setTab] = useState<Tab>('scrap')
  // Money donation legacy states omitted for brevity (can be re-added)
  const { user } = useUser()
  const [profile, setProfile] = useState<{ phone: string; address: string; donorId?: string }>({ phone: '', address: '' })
  const [pickupTime, setPickupTime] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Load current user mongo profile (simplified assumption existing endpoint self)
    const load = async () => {
      try {
        const res = await fetch('/api/protected/users?self=1')
        const json = await res.json()
        if (json.users && json.users.length) {
          const u = json.users[0]
          setProfile({ phone: u.phone || '', address: u.address || '', donorId: u._id || u.id })
        }
      } catch (e) { console.error(e) }
    }
    load()
  }, [])

  const missingInfo = !profile.phone || !profile.address

  const updateProfileIfMissing = async () => {
    if (!profile.donorId) return
    if (!missingInfo) return
    try {
      await fetch(`/api/protected/users/${profile.donorId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: profile.phone, address: profile.address }) })
    } catch (e) { console.error(e) }
  }

  const submitScrapRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile.donorId) { setError('Profile not loaded'); return }
    if (!pickupTime) { setError('Pickup time required'); return }
    setSubmitting(true); setError(null); setSuccess(false)
    try {
      await updateProfileIfMissing()
      const res = await fetch('/api/protected/collection-requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ donor: profile.donorId, requestedPickupTime: pickupTime, address: profile.address, phone: profile.phone, notes }) })
      if (!res.ok) throw new Error(await res.text())
      setSuccess(true); setNotes('');
    } catch (e: any) { setError(e.message || 'Failed'); } finally { setSubmitting(false) }
  }

  return (
    <div className='p-6 max-w-3xl mx-auto space-y-8'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-semibold'>Donate</h1>
        <p className='text-xs text-muted-foreground'>Contribute via scrap pickup or (soon) monetary support.</p>
      </div>
      <Tabs value={tab} onValueChange={(v)=> setTab(v as Tab)}>
        <TabsList>
          <TabsTrigger value='scrap'>Scrap</TabsTrigger>
          <TabsTrigger value='money'>Money</TabsTrigger>
        </TabsList>
        <TabsContent value='scrap'>
          <Card>
            <CardHeader className='pb-3'>
              <CardTitle className='text-base'>Scrap Collection Request</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={submitScrapRequest} className='space-y-5'>
                <div className='grid md:grid-cols-2 gap-4'>
                  <div className='space-y-1'>
                    <label className='text-xs font-semibold'>Name</label>
                    <Input disabled value={user?.fullName || user?.username || ''} className='bg-muted/40' />
                  </div>
                  <div className='space-y-1'>
                    <label className='text-xs font-semibold'>Phone {!profile.phone && <span className='text-red-600'>(required)</span>}</label>
                    <Input value={profile.phone} onChange={e=>setProfile(p=>({...p,phone:e.target.value}))} placeholder='+15551234567' />
                  </div>
                  <div className='md:col-span-2 space-y-1'>
                    <label className='text-xs font-semibold'>Address {!profile.address && <span className='text-red-600'>(required)</span>}</label>
                    <Textarea value={profile.address} onChange={e=>setProfile(p=>({...p,address:e.target.value}))} placeholder='Street, City, ...' className='min-h-24' />
                  </div>
                  <div className='space-y-1'>
                    <label className='text-xs font-semibold'>Preferred Pickup Time</label>
                    <Input type='datetime-local' value={pickupTime} onChange={e=>setPickupTime(e.target.value)} />
                  </div>
                  <div className='md:col-span-2 space-y-1'>
                    <label className='text-xs font-semibold'>Notes</label>
                    <Textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder='Any additional info...' className='min-h-20' />
                  </div>
                </div>
                <div className='flex items-center gap-3 pt-2'>
                  <Button type='submit' disabled={submitting || !pickupTime}>{submitting ? <><Loader2 className='h-4 w-4 animate-spin mr-2' /> Submitting</> : 'Submit Request'}</Button>
                  {missingInfo && (
                    <Alert variant='default' className='py-2 px-3 text-[11px]'>
                      <AlertDescription>Provide phone and address; we'll save it to your profile.</AlertDescription>
                    </Alert>
                  )}
                </div>
                {error && <p className='text-xs text-red-600'>{error}</p>}
                {success && <p className='text-xs text-green-600'>Request submitted. We will verify soon.</p>}
              </form>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value='money'>
          <Card>
            <CardHeader className='pb-3'>
              <CardTitle className='text-base'>Monetary Donation (Coming Soon)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className='text-sm text-muted-foreground'>We are preparing secure payment integration for monetary contributions. Stay tuned!</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
