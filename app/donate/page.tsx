"use client";
import React, { useState, useEffect } from 'react';
import { safeJson } from '@/lib/utils';
import { useUser, useClerk, useSignIn } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { PhoneInput } from '@/components/ui/phone-input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { EnhancedFileSelector } from '@/components/file-selector';
import { FileUploadError, UploadResult } from '@/components/file-selector/types';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Checkbox, Label } from '@/components/ui';

type Tab = 'money' | 'scrap'

export default function DonationPage() {
  const [tab, setTab] = useState<Tab>('money')
  const { user, isSignedIn } = useUser()
  const { openSignIn } = useClerk()
  const { signIn, isLoaded: isSignInLoaded, setActive } = useSignIn()
  const router = useRouter()
  const [profile, setProfile] = useState<{ phone: string; address: string; donorId?: string }>({ phone: '', address: '' })
  const [pickupTime, setPickupTime] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // File upload states for scrap collection
  const [uploadedImages, setUploadedImages] = useState<UploadResult[]>([])
  const [fileUploadError, setFileUploadError] = useState<string | null>(null)

  // Location sharing states
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number; accuracy?: number } | null>(null)
  const [locationLoading, setLocationLoading] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)

  // Money donation states
  const [donationAmount, setDonationAmount] = useState('')
  const [donorName, setDonorName] = useState('')
  const [donorEmail, setDonorEmail] = useState('')
  const [donorPhone, setDonorPhone] = useState('')
  const searchParams = useSearchParams()
  const [programSlug, setProgramSlug] = useState<string | null>(null)
  const [selectedCause, setSelectedCause] = useState('sadqa') // Default to first cause
  const [moneySubmitting, setMoneySubmitting] = useState(false)
  const [moneySuccess, setMoneySuccess] = useState(false)
  
  // Dynamic causes state
  const [donationCauses, setDonationCauses] = useState<Array<{value: string, label: string, description?: string}>>([])
  const [causesLoading, setCausesLoading] = useState(true)
  
  // 80G Tax exemption states
  const [wants80GReceipt, setWants80GReceipt] = useState(false)
  const [donorPAN, setDonorPAN] = useState('')
  const [donorAddress, setDonorAddress] = useState('')
  const [donorCity, setDonorCity] = useState('')
  const [donorState, setDonorState] = useState('')
  const [donorPincode, setDonorPincode] = useState('')
  


  useEffect(() => {
    // Fetch dynamic causes from welfare programs
    const fetchCauses = async () => {
      try {
        setCausesLoading(true)
        const res = await fetch('/api/public/welfare-programs?format=simple')
        if (!res.ok) {
          throw new Error('Failed to fetch welfare programs')
        }
        const data = await res.json()
        if (data.programs && Array.isArray(data.programs)) {
          setDonationCauses(data.programs)
          // Set default selected cause to the first available program
          if (data.programs.length > 0 && !selectedCause) {
            setSelectedCause(data.programs[0].value)
          }
        }
      } catch (error) {
        console.error('[FETCH_CAUSES_ERROR]', error)
        toast.error('Failed to load donation causes')
        // Fallback to hardcoded causes if API fails
        setDonationCauses([
          { value: 'sadqa', label: 'Sadqa' },
          { value: 'zakat', label: 'Zakat' },
          { value: 'education', label: 'Education Support' },
          { value: 'healthcare', label: 'Healthcare Access' },
          { value: 'emergency', label: 'Emergency Relief' }
        ])
      } finally {
        setCausesLoading(false)
      }
    }
    
    fetchCauses()
  }, [])

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
            const text = await res.text().catch(() => '')
            console.warn('[DONATE_PROFILE_FETCH_NON_JSON]', res.status, ct, text?.slice(0, 120))
          }
          return
        }
        const json = await safeJson<any>(res)
        if (json.users && json.users.length) {
          const u = json.users[0]
          // Prioritize Clerk user ID; fallback to mongo mapping only if needed
          setProfile({ phone: u.phone || '', address: u.address || '', donorId: u.id || u.mongoUserId || u._id })

          // Auto-populate donation form fields if user is signed in
          if (user?.fullName && !donorName) {
            setDonorName(user.fullName)
          }
          if (user?.primaryEmailAddress?.emailAddress && !donorEmail) {
            setDonorEmail(user.primaryEmailAddress.emailAddress)
          }
          if (u.phone && !donorPhone) {
            setDonorPhone(u.phone)
          }
        }
      } catch (e) { console.error(e) }
    }
    load()
  }, [isSignedIn, user, donorName, donorEmail, donorPhone])

  // Pre-populate cause from URL 'program' slug and store slug separately
  useEffect(() => {
    const p = searchParams?.get('program')
    if (!p || donationCauses.length === 0) return
    
    setProgramSlug(p)
    const lower = p.toLowerCase()
    
    // Try to find exact match first
    const exactMatch = donationCauses.find(cause => cause.value === lower)
    if (exactMatch) {
      setSelectedCause(exactMatch.value)
      return
    }
    
    // Fallback to partial matching
    if (lower.includes('zakat')) {
      const zakatCause = donationCauses.find(c => c.value.includes('zakat'))
      if (zakatCause) setSelectedCause(zakatCause.value)
    } else if (lower.includes('sadqa') || lower.includes('sadaq')) {
      const sadqaCause = donationCauses.find(c => c.value.includes('sadqa'))
      if (sadqaCause) setSelectedCause(sadqaCause.value)
    } else if (lower.includes('health')) {
      const healthCause = donationCauses.find(c => c.value.includes('health'))
      if (healthCause) setSelectedCause(healthCause.value)
    } else if (lower.includes('educ')) {
      const educCause = donationCauses.find(c => c.value.includes('education'))
      if (educCause) setSelectedCause(educCause.value)
    } else if (lower.includes('emerg')) {
      const emergCause = donationCauses.find(c => c.value.includes('emergency'))
      if (emergCause) setSelectedCause(emergCause.value)
    }
  }, [searchParams, donationCauses])

  const missingInfo = !profile.phone || !profile.address

  const updateProfileIfMissing = async () => {
    if (!missingInfo) return
    // PATCH endpoint accepts Clerk ID or Mongo ID; when missing, prefer skipping instead of failing
    if (!profile.donorId) return
    try {
      await fetch(`/api/protected/users/${encodeURIComponent(profile.donorId)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: profile.phone, address: profile.address }) })
    } catch (e) { console.error(e) }
  }

  // File upload handlers
  const handleFileSelect = (file: File, previewUrl: string) => {
    console.log('File selected:', file.name, 'Preview URL:', previewUrl)
    setFileUploadError(null)
  }

  const handleUploadComplete = (uploadResult: UploadResult) => {
    console.log('Upload completed:', uploadResult)
    setUploadedImages(prev => [...prev, uploadResult])
    toast.success(`Image uploaded successfully: ${uploadResult.publicId}`)
  }

  const handleUploadError = (error: FileUploadError) => {
    console.error('Upload error:', error)
    setFileUploadError(error.message)
    toast.error(`Upload failed: ${error.message}`)
  }

  const removeUploadedImage = (publicId: string) => {
    setUploadedImages(prev => prev.filter(img => img.publicId !== publicId))
    toast.success('Image removed')
  }

  // Location sharing function
  const shareCurrentLocation = async () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser')
      toast.error('Location sharing not supported on this device')
      return
    }

    setLocationLoading(true)
    setLocationError(null)

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000 // 5 minutes
          }
        )
      })

      const location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy
      }

      setCurrentLocation(location)
      setLocationError(null)
      toast.success('Location shared successfully! This will help our team find you.')
    } catch (error: any) {
      console.error('[LOCATION_ERROR]', error)
      let errorMessage = 'Failed to get location'
      
      if (error.code === 1) {
        errorMessage = 'Location access denied. Please enable location permissions.'
      } else if (error.code === 2) {
        errorMessage = 'Location unavailable. Please try again.'
      } else if (error.code === 3) {
        errorMessage = 'Location request timed out. Please try again.'
      }
      
      setLocationError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLocationLoading(false)
    }
  }

  const submitScrapRequest = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isSignedIn) {
      toast.error('Please sign in to submit a collection request.')
      setError('Please sign in to submit a collection request.')
      return
    }

    if (!pickupTime) {
      toast.error('Please select a pickup time')
      setError('Pickup time required')
      return
    }

    if (!profile.phone || profile.phone.length < 10) {
      toast.error('Please provide a valid phone number (10+ digits)')
      setError('Phone number required and must be at least 10 digits')
      return
    }

    if (!profile.address || profile.address.trim().length < 10) {
      toast.error('Please provide a detailed address (minimum 10 characters)')
      setError('Detailed address required for pickup')
      return
    }

    setSubmitting(true)
    setError(null)
    setSuccess(false)

    try {
      await updateProfileIfMissing()

      // Prepare request data with uploaded images and location
      const requestData = {
        requestedPickupTime: pickupTime,
        address: profile.address,
        phone: profile.phone,
        notes: notes,
        // Include current location if available
        ...(currentLocation && { currentLocation }),
        // Include uploaded image URLs and metadata
        images: uploadedImages.map(img => ({
          url: img.secureUrl,
          publicId: img.publicId,
          width: img.width,
          height: img.height,
          format: img.format,
          bytes: img.bytes
        }))
      }

      toast.info('Submitting collection request...')

      // Omit donor to default to current Clerk user on server; aligns with Clerk-first priority
      const res = await fetch('/api/protected/collection-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }))
        const errorMsg = errorData.error || errorData.message || await res.text().catch(() => `Request failed (${res.status})`)
        throw new Error(errorMsg)
      }

      const result = await res.json()
      setSuccess(true)
      setNotes('')
      setUploadedImages([])
      setPickupTime('')
      setCurrentLocation(null)
      setLocationError(null)
      toast.success('Collection request submitted successfully! You will receive confirmation shortly.')

      // Optionally show request ID if available
      if (result.requestId) {
        toast.info(`Request ID: ${result.requestId}`)
      }
    } catch (e: any) {
      console.error('[COLLECTION_REQUEST_ERROR]', e)
      const errorMessage = e.message || 'Failed to submit collection request'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  const submitMoneyDonation = async (e: React.FormEvent) => {
    e.preventDefault()

    // Enhanced validation with specific feedback
    if (!donationAmount || isNaN(parseFloat(donationAmount)) || parseFloat(donationAmount) <= 0) {
      toast.error('Please enter a valid donation amount (minimum ₹1)');
      return
    }

    if (parseFloat(donationAmount) > 500000) {
      toast.error('Maximum donation amount is ₹5,00,000. For larger donations, please contact us directly.');
      return
    }

    if (!donorName.trim() || donorName.trim().length < 2) {
      toast.error('Please enter your full name (minimum 2 characters)');
      return
    }

    // Phone number validation
    if (!donorPhone.trim() || donorPhone.trim().length < 10) {
      toast.error('Please enter a valid phone number (minimum 10 digits)');
      return
    }

    // Validate phone format
    const phoneDigits = donorPhone.replace(/\D/g, '')
    if (phoneDigits.length < 10) {
      toast.error('Please provide a valid phone number with at least 10 digits')
      return
    }

    // Email is optional for donations
    if (donorEmail.trim() && (!donorEmail.includes('@') || !donorEmail.includes('.'))) {
      toast.error('Please enter a valid email address (e.g., name@example.com)');
      return
    }

    // 80G validation
    if (wants80GReceipt) {
      const panValue = donorPAN.trim().toUpperCase()
      console.log('[80G_VALIDATION] PAN value:', panValue, 'Length:', panValue.length)
      
      if (!panValue || !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panValue)) {
        console.log('[80G_VALIDATION] PAN validation failed for:', panValue)
        toast.error('Please enter a valid PAN number (e.g., ABCDE1234F)');
        return
      }
      
      if (!donorAddress.trim() || donorAddress.trim().length < 5) {
        toast.error('Please enter a complete address for 80G certificate');
        return
      }
      
      if (!donorCity.trim() || donorCity.trim().length < 2) {
        toast.error('Please enter a valid city name');
        return
      }
      
      if (!donorState.trim() || donorState.trim().length < 2) {
        toast.error('Please enter a valid state name');
        return
      }
      
      if (!donorPincode.trim() || !/^[0-9]{6}$/.test(donorPincode.trim())) {
        toast.error('Please enter a valid 6-digit pincode');
        return
      }
    }

    setMoneySubmitting(true)
    setMoneySuccess(false)
    setError(null)

    try {
      // Update user profile if logged in and details have changed
      if (isSignedIn && user) {
        const updateData: any = {}
        
        // Check if profile fields have been modified
        if (donorPhone.trim()) {
          const { normalizePhoneNumber } = await import('@/lib/utils/phone')
          updateData.phone = normalizePhoneNumber(donorPhone.trim())
        }
        if (donorAddress.trim()) updateData.address = donorAddress.trim()
        if (donorCity.trim()) updateData.city = donorCity.trim()
        if (donorState.trim()) updateData.state = donorState.trim()
        if (donorPincode.trim()) updateData.pincode = donorPincode.trim()
        
        // Update profile if there are changes
        if (Object.keys(updateData).length > 0) {
          try {
            // Use the existing profile update approach from earlier in the component
            if (profile.donorId) {
              await fetch(`/api/protected/users/${encodeURIComponent(profile.donorId)}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData)
              })
            }
          } catch (profileError) {
            console.warn('[PROFILE_UPDATE_FAILED]', profileError)
            // Don't fail donation if profile update fails
          }
        }
      }

      // Handle user authentication/creation
      if (!isSignedIn) {
        const wantsLogin = typeof window !== 'undefined'
          ? window.confirm('Please sign in to donate. Press OK to sign in, or Cancel to continue as guest (we will create an account and send credentials).')
          : true
        if (wantsLogin) {
          try {
            openSignIn?.({})
            toast.info('Please complete sign in to continue with your donation')
          } catch (signInError) {
            console.error('[SIGN_IN_ERROR]', signInError)
            toast.error('Failed to open sign in. Please try again.')
          }
          setMoneySubmitting(false)
          return
        } else {
          // Create guest account with provided information
          toast.info('Creating your account for future donations...')
          const signupRes = await fetch('/api/public/guest-signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: donorName.trim(),
              phone: donorPhone.trim(),
              email: donorEmail.trim() || undefined
            })
          })

          if (!signupRes.ok) {
            const errorData = await signupRes.json().catch(() => ({ error: 'Unknown error' }))
            let errorMsg = errorData.error || errorData.message || `Account creation failed (${signupRes.status})`

            // Handle specific error cases
            if (errorMsg.includes('phone') || errorMsg.includes('Phone')) {
              errorMsg = 'Phone number already exists. Please sign in instead.'
            } else if (errorMsg.includes('email') || errorMsg.includes('Email')) {
              errorMsg = 'Email already exists. Please sign in instead.'
            }

            toast.error(errorMsg)
            setMoneySubmitting(false)
            return
          }

          const created = await signupRes.json()
          toast.success('✅ Account created successfully!')
          toast.info('You will receive login credentials via WhatsApp/SMS')

          // Immediately sign in with returned credentials
          if (signIn && isSignInLoaded) {
            try {
              toast.info('Signing you in automatically...')
              const result = await signIn.create({
                identifier: created.identifier,
                password: created.password
              })

              if (result?.status === 'complete') {
                await setActive?.({ session: result.createdSessionId })
                toast.success('🎉 Signed in successfully!')

                // Show welcome message
                setTimeout(() => {
                  toast.info(`Welcome ${donorName}! Your account is now set up for future donations.`)
                }, 1000)
              } else {
                toast.warning('Account created but auto-login incomplete. Please check your credentials.')
                console.warn('[AUTO_LOGIN_INCOMPLETE]', result?.status)
              }
            } catch (loginError: any) {
              console.error('[AUTO_LOGIN_ERROR]', loginError)
              toast.warning('Account created successfully! Please sign in manually to continue.')
              toast.info(`Username: ${created.username}`)
            }
          } else {
            toast.warning('Account created! Please sign in manually to continue.')
            toast.info(`Username: ${created.username}`)
          }
        }
      }

      // Create donation record
      let donationId = ''

      if (programSlug) {
        toast.info('Creating donation record...')
        const res = await fetch(`/api/public/programs/${encodeURIComponent(programSlug)}/donations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            donorName: donorName.trim(),
            donorEmail: donorEmail.trim() || undefined,
            donorPhone: donorPhone.trim(),
            amount: parseFloat(donationAmount),
            message: notes,
            paymentMethod: 'online',
            wants80GReceipt,
            ...(wants80GReceipt && {
              donorPAN: donorPAN.trim().toUpperCase(),
              donorAddress: donorAddress.trim(),
              donorCity: donorCity.trim(),
              donorState: donorState.trim(),
              donorPincode: donorPincode.trim()
            })
          })
        })

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: 'Unknown error' }))
          const errorMsg = errorData.error || errorData.message || await res.text().catch(() => `Request failed (${res.status})`)
          throw new Error(errorMsg)
        }

        const data = await res.json()
        donationId = data.donationId
      } else {
        // Create general donation directly
        const res = await fetch('/api/public/donations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            donorName: donorName.trim(),
            donorEmail: donorEmail.trim() || undefined,
            donorPhone: donorPhone.trim(),
            amount: parseFloat(donationAmount),
            message: notes,
            cause: selectedCause,
            paymentMethod: 'online',
            wants80GReceipt,
            ...(wants80GReceipt && {
              donorPAN: donorPAN.trim().toUpperCase(),
              donorAddress: donorAddress.trim(),
              donorCity: donorCity.trim(),
              donorState: donorState.trim(),
              donorPincode: donorPincode.trim()
            })
          })
        })

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: 'Unknown error' }))
          const errorMsg = errorData.error || errorData.message || await res.text().catch(() => `Request failed (${res.status})`)
          throw new Error(errorMsg)
        }

        const data = await res.json()
        donationId = data.donationId
      }

      if (!donationId) {
        throw new Error('Failed to create donation record')
      }

      // Create Razorpay order
      toast.info('Creating secure payment order...')
      const orderRes = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'donation',
          amount: parseFloat(donationAmount),
          referenceId: donationId,
          email: donorEmail.trim() || undefined,
          phone: donorPhone.trim() || undefined
        })
      })

      if (!orderRes.ok) {
        const errorData = await orderRes.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `Order creation failed (${orderRes.status})`)
      }

      const order = await orderRes.json()

      // Load Razorpay checkout if not present
      if (typeof window !== 'undefined' && !(window as any).Razorpay) {
        toast.info('Loading secure payment gateway...')
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script')
          script.src = 'https://checkout.razorpay.com/v1/checkout.js'
          script.onload = () => resolve()
          script.onerror = () => reject(new Error('Failed to load payment gateway'))
          document.head.appendChild(script)
        })
      }

      // Initialize Razorpay checkout
      const razorpay = new (window as any).Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency || 'INR',
        order_id: order.orderId,
        name: 'Khadim-e-Millat Welfare Foundation',
        description: `Donation for ${selectedCause.charAt(0).toUpperCase() + selectedCause.slice(1)}`,
        image: '/favicon.ico',
        prefill: {
          name: donorName.trim(),
          email: donorEmail.trim() || undefined,
          contact: donorPhone.trim() || undefined
        },
        theme: {
          color: '#3B82F6'
        },
        handler: async function (response: any) {
          try {
            toast.info('Verifying payment...')

            // Verify payment on server
            const verifyRes = await fetch('/api/razorpay/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'donation',
                orderId: order.orderId,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
                referenceId: donationId
              })
            })

            if (!verifyRes.ok) {
              const errorData = await verifyRes.json().catch(() => ({ error: 'Verification failed' }))
              throw new Error(errorData.error || 'Payment verification failed')
            }

            setMoneySuccess(true)
            toast.success('🎉 Donation completed successfully!')
            toast.success('Thank you for your generous contribution!')

            // Redirect to thank you page
            toast.loading('Redirecting to confirmation page...', { id: 'redirect-loading' })
            setTimeout(() => {
              window.location.href = `/thank-you?donationId=${donationId}&paymentId=${response.razorpay_payment_id}`
            }, 1500)

          } catch (error: any) {
            console.error('[PAYMENT_VERIFICATION_ERROR]', error)
            toast.error(error.message || 'Payment verification failed. Please contact support.')
          }
        },
        modal: {
          ondismiss: function () {
            toast.info('Payment cancelled by user')
            setMoneySubmitting(false)
          }
        }
      })

      // Add error handlers
      razorpay.on('payment.failed', function (response: any) {
        console.error('[PAYMENT_FAILED]', response.error)
        toast.error(response.error?.description || 'Payment failed. Please try again.')
        setMoneySubmitting(false)
      })

      // Open Razorpay checkout
      toast.success('Opening secure payment gateway...')
      razorpay.open()

    } catch (error: any) {
      console.error('[DONATION_SUBMISSION_ERROR]', error)
      const errorMessage = error.message || 'Failed to process donation. Please try again.'
      toast.error(errorMessage)
      setError(errorMessage)
      setMoneySubmitting(false)
    }
  }

  return (
    <div className='p-6 max-w-3xl mx-auto space-y-8'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-semibold'>Donate</h1>
        <p className='text-xs text-muted-foreground'>Contribute via scrap pickup or monetary support.</p>
      </div>
      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
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
                    <Label className='text-xs font-semibold'>Name</Label>
                    <Input disabled value={user?.fullName || user?.username || ''} className='bg-muted/40' />
                  </div>
                  <div className='space-y-1'>
                    <Label className='text-xs font-semibold'>Phone {!profile.phone && <span className='text-red-600'>(required)</span>}</Label>
                    <PhoneInput value={profile.phone} onChange={value => setProfile(p => ({ ...p, phone: value }))} placeholder='Enter phone number' />
                  </div>
                  <div className='md:col-span-2 space-y-1'>
                    <Label className='text-xs font-semibold'>Address {!profile.address && <span className='text-red-600'>(required)</span>}</Label>
                    <Textarea value={profile.address} onChange={e => setProfile(p => ({ ...p, address: e.target.value }))} placeholder='Street, City, ...' className='min-h-24' />
                    
                    {/* Location sharing section */}
                    <div className='mt-3 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700'>
                      <div className='flex items-center justify-between mb-2'>
                        <Label className='text-xs font-semibold text-blue-900 dark:text-blue-100'>📍 Share Current Location (Optional)</Label>
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          onClick={shareCurrentLocation}
                          disabled={locationLoading}
                          className='text-xs h-7'
                        >
                          {locationLoading ? (
                            <>
                              <Loader2 className='h-3 w-3 animate-spin mr-1' />
                              Getting...
                            </>
                          ) : currentLocation ? (
                            '✅ Location Shared'
                          ) : (
                            '📍 Share Location'
                          )}
                        </Button>
                      </div>
                      
                      {currentLocation && (
                        <div className='text-xs text-green-700 dark:text-green-300 mb-1'>
                          ✅ Location shared successfully! This will help our team find you more easily.
                          {currentLocation.accuracy && (
                            <span className='block text-muted-foreground'>
                              Accuracy: ±{Math.round(currentLocation.accuracy)}m
                            </span>
                          )}
                        </div>
                      )}
                      
                      {locationError && (
                        <div className='text-xs text-red-600 mb-1'>
                          ❌ {locationError}
                        </div>
                      )}
                      
                      <p className='text-xs text-blue-700 dark:text-blue-300'>
                        Sharing your location helps our collection team find you faster. This is completely optional and your location is only used for pickup coordination.
                      </p>
                    </div>
                  </div>
                  <div className='space-y-1'>
                    <Label className='text-xs font-semibold'>Preferred Pickup Time</Label>
                    <Input type='datetime-local' value={pickupTime} onChange={e => setPickupTime(e.target.value)} />
                  </div>
                  <div className='md:col-span-2 space-y-1'>
                    <Label className='text-xs font-semibold'>Notes</Label>
                    <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder='Any additional info...' className='min-h-20' />
                  </div>

                  {/* Enhanced File Selector for Item Images */}
                  <div className='md:col-span-2 space-y-1'>
                    <Label className='text-xs font-semibold'>Item Images (Optional)</Label>
                    <p className='text-xs text-muted-foreground mb-2'>
                      Upload photos of the items you want to donate. This helps our team prepare for collection.
                    </p>
                    <EnhancedFileSelector
                      onFileSelect={handleFileSelect}
                      onUploadComplete={handleUploadComplete}
                      onError={handleUploadError}
                      maxFileSize={10 * 1024 * 1024} // 10MB
                      acceptedTypes={['image/jpeg', 'image/png', 'image/webp']}
                      placeholder="Drag and drop item photos here or click to select"
                      showPreview={true}
                      uploadToCloudinary={true}
                      cloudinaryOptions={{
                        folder: 'kmwf/collection-requests',
                        tags: ['collection-request', 'donation-items']
                      }}
                      className="rounded-lg p-4"
                    />

                    {/* Display uploaded images */}
                    {uploadedImages.length > 0 && (
                      <div className='mt-4'>
                        <p className='text-xs font-semibold mb-2'>Uploaded Images ({uploadedImages.length})</p>
                        <div className='grid grid-cols-2 md:grid-cols-3 gap-2'>
                          {uploadedImages.map((image, index) => (
                            <div key={image.publicId} className='relative group'>
                              <img
                                src={image.url}
                                alt={`Uploaded item ${index + 1}`}
                                className='w-full h-24 object-cover rounded-md border'
                              />
                              <button
                                type='button'
                                onClick={() => removeUploadedImage(image.publicId)}
                                className='absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity'
                                title='Remove image'
                              >
                                ×
                              </button>
                              <div className='absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 rounded-b-md'>
                                {(image.bytes / 1024).toFixed(1)}KB
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* File upload error display */}
                    {fileUploadError && (
                      <div className='text-xs text-red-600 mt-2'>
                        Upload Error: {fileUploadError}
                      </div>
                    )}
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
                    <Label className='text-xs font-semibold'>Donation Amount (INR)</Label>
                    <Input
                      type='string'
                      inputMode="numeric"
                      value={donationAmount}
                      onChange={e => setDonationAmount(e.target.value)}
                      placeholder='25'
                      min='1'
                    />
                  </div>
                  <div className='space-y-1'>
                    <Label className='text-xs font-semibold'>Select Cause</Label>
                    <Select value={selectedCause} onValueChange={setSelectedCause} disabled={causesLoading}>
                      <SelectTrigger className='w-full'>
                        <SelectValue placeholder={causesLoading ? 'Loading causes...' : 'Select cause'} />
                      </SelectTrigger>
                      <SelectContent>
                        {causesLoading ? (
                          <SelectItem value="loading" disabled>
                            <div className="flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Loading causes...
                            </div>
                          </SelectItem>
                        ) : (
                          donationCauses.map(cause => (
                            <SelectItem key={cause.value} value={cause.value}>
                              {cause.label}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className='space-y-1'>
                    <Label className='text-xs font-semibold'>Your Name</Label>
                    <Input
                      value={donorName}
                      onChange={e => setDonorName(e.target.value)}
                      placeholder='John Doe'
                    />
                  </div>
                  <div className='space-y-1'>
                    <Label className='text-xs font-semibold'>Phone Number</Label>
                    <PhoneInput
                      value={donorPhone}
                      onChange={value => setDonorPhone(value)}
                      placeholder='Enter phone number'
                    />
                  </div>
                  <div className='space-y-1'>
                    <Label className='text-xs font-semibold'>Email Address (Optional)</Label>
                    <Input
                      type='email'
                      value={donorEmail}
                      onChange={e => setDonorEmail(e.target.value)}
                      placeholder='john@example.com (optional)'
                    />
                  </div>
                  <div className='md:col-span-2 space-y-1'>
                    <Label className='text-xs font-semibold'>Message (Optional)</Label>
                    <Textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder='Any special message or dedication...'
                      className='min-h-20'
                    />
                  </div>
                  
                  {/* 80G Tax Exemption Section */}
                  <div className='md:col-span-2 border-t pt-4'>
                    <div className='flex items-center space-x-2 mb-4'>
                      <Checkbox
                        id="wants80G"
                        checked={wants80GReceipt}
                        onCheckedChange={(checked) => setWants80GReceipt(checked === true)}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor="wants80G" className="text-sm font-medium">
                        🏛️ I want 80G Tax Exemption Certificate
                      </Label>
                    </div>
                    
                    {wants80GReceipt && (
                      <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className='space-y-1'>
                            <Label className='text-xs font-semibold text-blue-900 dark:text-blue-100'>PAN Number *</Label>
                            <Input
                              value={donorPAN}
                              onChange={e => setDonorPAN(e.target.value.toUpperCase())}
                              placeholder='ABCDE1234F'
                              pattern="[A-Z]{5}[0-9]{4}[A-Z]{1}"
                              maxLength={10}
                              className="uppercase"
                            />
                          </div>
                          <div className='space-y-1'>
                            <Label className='text-xs font-semibold text-blue-900 dark:text-blue-100'>Address *</Label>
                            <Input
                              value={donorAddress}
                              onChange={e => setDonorAddress(e.target.value)}
                              placeholder='House/Flat no, Street name'
                            />
                          </div>
                          <div className='space-y-1'>
                            <Label className='text-xs font-semibold text-blue-900 dark:text-blue-100'>City *</Label>
                            <Input
                              value={donorCity}
                              onChange={e => setDonorCity(e.target.value)}
                              placeholder='Mumbai'
                            />
                          </div>
                          <div className='space-y-1'>
                            <Label className='text-xs font-semibold text-blue-900 dark:text-blue-100'>State *</Label>
                            <Input
                              value={donorState}
                              onChange={e => setDonorState(e.target.value)}
                              placeholder='Maharashtra'
                            />
                          </div>
                          <div className='space-y-1'>
                            <Label className='text-xs font-semibold text-blue-900 dark:text-blue-100'>Pincode *</Label>
                            <Input
                              value={donorPincode}
                              onChange={e => setDonorPincode(e.target.value)}
                              placeholder='400001'
                              pattern="[0-9]{6}"
                              maxLength={6}
                            />
                          </div>
                        </div>
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                          Address is mandatory for 80G certificate as per Income Tax Department requirements.
                        </p>
                      </div>
                    )}
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
                {moneySuccess && <p className='text-xs text-green-600'>Payment processing completed successfully!</p>}
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}