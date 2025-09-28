"use client";
import React, { useState, useEffect } from 'react';
import { safeJson } from '@/lib/utils';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
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
  const [tab, setTab] = useState<Tab>('money')
  const { user, isSignedIn } = useUser()
  const router = useRouter()
  const [profile, setProfile] = useState<{ phone: string; address: string; donorId?: string }>({ phone: '', address: '' })
  const [pickupTime, setPickupTime] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Money donation states
  const [donationAmount, setDonationAmount] = useState('')
  const [donorName, setDonorName] = useState('')
  const [donorEmail, setDonorEmail] = useState('')
  const [selectedCause, setSelectedCause] = useState('education')
  const [moneySubmitting, setMoneySubmitting] = useState(false)
  const [moneySuccess, setMoneySuccess] = useState(false)

  useEffect(() => {
    // Load current user profile; server reads phone/address from Clerk privateMetadata
    // Guard: only attempt when signed in, and only parse JSON when content-type is JSON.
    const load = async () => {
      if (!isSignedIn) {
        // Not signed in; skip profile fetch to avoid HTML redirects masquerading as JSON
        return;
      }
      try {
        const res = await fetch('/api/protected/users?self=1', { cache: 'no-store' })
        const ct = res.headers.get('content-type') || ''
        if (!res.ok || !ct.includes('application/json')) {
          // Likely an auth redirect (HTML) or server error; do not attempt to parse JSON
          if (res.status === 401 || res.status === 403) {
            console.warn('[DONATE_PROFILE_FETCH_AUTH]', res.status)
          } else {
            const text = await res.text().catch(()=>'')
            console.warn('[DONATE_PROFILE_FETCH_NON_JSON]', res.status, ct, text?.slice(0,120))
          }
          return
        }
  const json = await safeJson<any>(res)
        if (json.users && json.users.length) {
          const u = json.users[0]
          // Prioritize Clerk user ID; fallback to mongo mapping only if needed
          setProfile({ phone: u.phone || '', address: u.address || '', donorId: u.id || u.mongoUserId || u._id })
        }
      } catch (e) { console.error(e) }
    }
    load()
  }, [isSignedIn])

  const missingInfo = !profile.phone || !profile.address

  const updateProfileIfMissing = async () => {
    if (!missingInfo) return
    // PATCH endpoint accepts Clerk ID or Mongo ID; when missing, prefer skipping instead of failing
    if (!profile.donorId) return
    try {
      await fetch(`/api/protected/users/${encodeURIComponent(profile.donorId)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: profile.phone, address: profile.address }) })
    } catch (e) { console.error(e) }
  }

  const submitScrapRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isSignedIn) { setError('Please sign in to submit a collection request.'); return }
    if (!pickupTime) { setError('Pickup time required'); return }
    setSubmitting(true); setError(null); setSuccess(false)
    try {
      await updateProfileIfMissing()
      // Omit donor to default to current Clerk user on server; aligns with Clerk-first priority
      const res = await fetch('/api/protected/collection-requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requestedPickupTime: pickupTime, address: profile.address, phone: profile.phone, notes }) })
      if (!res.ok) throw new Error(await res.text())
      setSuccess(true); setNotes('');
    } catch (e: any) { setError(e.message || 'Failed'); } finally { setSubmitting(false) }
  }

  const submitMoneyDonation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!donationAmount || parseFloat(donationAmount) <= 0) {
      toast.error('Please enter a valid donation amount')
      return
    }
    if (!donorName.trim()) {
      toast.error('Please enter your name')
      return
    }
    if (!donorEmail.trim() || !donorEmail.includes('@')) {
      toast.error('Please enter a valid email address')
      return
    }

    setMoneySubmitting(true)
    setMoneySuccess(false)
    
    try {
      // Simulate API call with dummy data
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Create dummy cause data for navigation
      const dummyCause = {
        cause: selectedCause,
        slug: 'dummy-campaign',
        id: 'dummy-' + Date.now()
      }
      
      // Navigate to the dynamic donation page
      router.push(`/donate/${dummyCause.cause}/${dummyCause.slug}/${dummyCause.id}?amount=${donationAmount}&donor=${encodeURIComponent(donorName)}&email=${encodeURIComponent(donorEmail)}`)
      
      setMoneySuccess(true)
      toast.success('Redirecting to donation page...')
    } catch (error) {
      toast.error('Failed to process donation. Please try again.')
    } finally {
      setMoneySubmitting(false)
    }
  }

  const dummyCauses = [
    { value: 'sadqa', label: 'Sadqa' },
    { value: 'education', label: 'Education Support' },
    { value: 'healthcare', label: 'Healthcare Initiatives' },
    { value: 'environment', label: 'Environmental Projects' },
    { value: 'community', label: 'Community Development' },
    { value: 'emergency', label: 'Emergency Relief' }
  ]

  return (
    <div className='p-6 max-w-3xl mx-auto space-y-8'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-semibold'>Donate</h1>
        <p className='text-xs text-muted-foreground'>Contribute via scrap pickup or monetary support.</p>
      </div>
      <Tabs value={tab} onValueChange={(v)=> setTab(v as Tab)}>
        <TabsList>
          <TabsTrigger value='money'>Money</TabsTrigger>
          <TabsTrigger value='scrap'>Scrap</TabsTrigger>
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
              <CardTitle className='text-base'>Monetary Donation</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={submitMoneyDonation} className='space-y-5'>
                <div className='grid md:grid-cols-2 gap-4'>
                  <div className='space-y-1'>
                    <label className='text-xs font-semibold'>Donation Amount ()</label>
                    <Input 
                      type='number' 
                      value={donationAmount} 
                      onChange={e=>setDonationAmount(e.target.value)} 
                      placeholder='25' 
                      min='1'
                      step='0.01'
                    />
                  </div>
                  <div className='space-y-1'>
                    <label className='text-xs font-semibold'>Select Cause</label>
                    <select 
                      value={selectedCause} 
                      onChange={e=>setSelectedCause(e.target.value)}
                      className='w-full px-3 py-2 border border-input bg-background rounded-md text-sm'
                    >
                      {dummyCauses.map(cause => (
                        <option key={cause.value} value={cause.value}>{cause.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className='space-y-1'>
                    <label className='text-xs font-semibold'>Your Name</label>
                    <Input 
                      value={donorName} 
                      onChange={e=>setDonorName(e.target.value)} 
                      placeholder='John Doe' 
                    />
                  </div>
                  <div className='space-y-1'>
                    <label className='text-xs font-semibold'>Email Address</label>
                    <Input 
                      type='email'
                      value={donorEmail} 
                      onChange={e=>setDonorEmail(e.target.value)} 
                      placeholder='john@example.com' 
                    />
                  </div>
                  <div className='md:col-span-2 space-y-1'>
                    <label className='text-xs font-semibold'>Message (Optional)</label>
                    <Textarea 
                      value={notes} 
                      onChange={e=>setNotes(e.target.value)} 
                      placeholder='Any special message or dedication...' 
                      className='min-h-20' 
                    />
                  </div>
                </div>
                <div className='flex items-center gap-3 pt-2'>
                  <Button type='submit' disabled={moneySubmitting}>
                    {moneySubmitting ? 
                      <><Loader2 className='h-4 w-4 animate-spin mr-2' /> Processing</> : 
                      'Continue to Payment'
                    }
                  </Button>
                </div>
                {moneySuccess && <p className='text-xs text-green-600'>Redirecting to donation page...</p>}
                <div className='text-xs text-muted-foreground mt-4'>
                  <p>This is a demo form. In production, this would integrate with a payment processor like Stripe or PayPal.</p>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}