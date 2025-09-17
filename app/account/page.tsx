"use client"
import React, { useEffect, useState } from 'react'
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

  useEffect(() => {
    if (!isLoaded || !user) return
    // Fetch mongo user via protected users endpoint search by clerk id (assuming existing endpoint)
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/protected/users?self=1')
        const json = await res.json()
        if (json.users && json.users.length) {
          const u = json.users[0]
          setState({ phone: u.phone || '', address: u.address || '', id: u._id || u.id })
        } else {
          setState(s => ({ ...s }))
        }
      } catch (e) { console.error(e) } finally { setLoading(false) }
    }
    load()
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
    <div className='p-6 max-w-xl space-y-6'>
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
    </div>
  )
}
