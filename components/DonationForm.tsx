'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { PhoneInput } from '@/components/ui/phone-input'
import { Heart, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useUser } from '@clerk/nextjs'

interface DonationFormProps {
  campaignSlug: string
}

const PRESET_AMOUNTS = [500, 1000, 2500, 5000]

export default function DonationForm({ campaignSlug }: DonationFormProps) {
  const { user, isLoaded } = useUser()
  const [amount, setAmount] = useState<number | ''>('')
  const [customAmount, setCustomAmount] = useState('')
  const [donorName, setDonorName] = useState('')
  const [donorEmail, setDonorEmail] = useState('')
  const [donorPhone, setDonorPhone] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [razorpayReady, setRazorpayReady] = useState(false)
  const [emailGenerated, setEmailGenerated] = useState(false)
  const [allowEditProfileFields, setAllowEditProfileFields] = useState(false)
  
  // 80G Receipt and preferences state
  const [wants80GReceipt, setWants80GReceipt] = useState(false)
  const [donorPAN, setDonorPAN] = useState('')
  const [donorAddress, setDonorAddress] = useState('')
  const [donorCity, setDonorCity] = useState('')
  const [donorState, setDonorState] = useState('')
  const [donorPincode, setDonorPincode] = useState('')
  const [receiptViaEmail, setReceiptViaEmail] = useState(true)
  const [receiptViaSMS, setReceiptViaSMS] = useState(true)
  const [razorpayManagedReceipt, setRazorpayManagedReceipt] = useState(true)

  // Auto-populate user data when logged in
  useEffect(() => {
    if (isLoaded && user) {
      setDonorName(user.fullName || '')
      setDonorEmail(user.primaryEmailAddress?.emailAddress || '')
      
      // Fetch complete user profile from API (like /donate page does)
      const loadUserProfile = async () => {
        try {
          const res = await fetch('/api/protected/users?self=1', { cache: 'no-store' })
          const ct = res.headers.get('content-type') || ''
          if (!res.ok || !ct.includes('application/json')) {
            return
          }
          const json = await res.json()
          if (json.users && json.users.length) {
            const u = json.users[0]
            if (u.phone && !donorPhone) {
              setDonorPhone(u.phone)
            }
            if (u.address && !donorAddress) {
              setDonorAddress(u.address)
            }
            if (u.city && !donorCity) {
              setDonorCity(u.city)
            }
            if (u.state && !donorState) {
              setDonorState(u.state)
            }
            if (u.pincode && !donorPincode) {
              setDonorPincode(u.pincode)
            }
          }
        } catch (e) {
          console.error('[CAMPAIGN_FORM_PROFILE_FETCH]', e)
        }
      }
      
      loadUserProfile()
    }
  }, [isLoaded, user, donorPhone, donorAddress, donorCity, donorState, donorPincode])

  // Load Razorpay script
  useEffect(() => {
    const existing = document?.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]') as HTMLScriptElement | null
    if (existing) {
      if ((window as any).Razorpay) setRazorpayReady(true)
      else existing.addEventListener('load', () => setRazorpayReady(true))
      return
    }
    const script = document?.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = () => setRazorpayReady(true)
    script.onerror = () => {
      console.error('Failed to load Razorpay')
      setRazorpayReady(false)
    }
    document?.body.appendChild(script)
  }, [])

  // Generate dynamic email for logged out users based on name and phone
  const isValidEmail = (email: string) => /[^\s@]+@[^\s@]+\.[^\s@]+/.test(email)
  const generateDynamicEmail = (name: string, phone: string) => {
    let username = ''
    if (name.trim()) {
      username = name.toLowerCase().replace(/[^a-z0-9]/g, '')
    }
    if (phone.trim()) {
      const cleanPhone = phone.replace(/[^0-9]/g, '')
      username = username ? `${username}${cleanPhone.slice(-4)}` : cleanPhone.slice(-4)
    }
    const host = typeof window !== 'undefined' ? window.location.host.replace('www.', '') : 'khadimemillat.org'
    const candidate = username ? `${username}@${host}` : ''
    if (candidate && isValidEmail(candidate)) return candidate
    return `donor-${Date.now()}@khadimemillat.org`
  }

  const handlePresetAmount = (presetAmount: number) => {
    setAmount(presetAmount)
    setCustomAmount(presetAmount.toString())
  }

  const handleCustomAmount = (value: string) => {
    setCustomAmount(value)
    const numValue = parseInt(value)
    if (!isNaN(numValue) && numValue > 0) {
      setAmount(numValue)
    } else {
      setAmount('')
    }
  }

  const handleNameChange = (name: string) => {
    setDonorName(name)

    // Auto-generate email for logged out users if email was previously generated
    if (!user && (emailGenerated || !donorEmail)) {
      const generatedEmail = generateDynamicEmail(name, donorPhone)
      setDonorEmail(generatedEmail)
      setEmailGenerated(true)
    }
  }

  const handlePhoneChange = (phone: string) => {
    setDonorPhone(phone)

    // Auto-generate email for logged out users if email was previously generated
    if (!user && (emailGenerated || !donorEmail)) {
      const generatedEmail = generateDynamicEmail(donorName, phone)
      setDonorEmail(generatedEmail)
      setEmailGenerated(true)
    }
  }

  const handleEmailChange = (email: string) => {
    setDonorEmail(email)
    setEmailGenerated(false) // User is manually editing email
  }

  // PAN validation helper
  const isValidPAN = (pan: string) => /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!amount || amount <= 0) {
      toast.error('Please enter a valid donation amount')
      return
    }

    if (!donorName.trim()) {
      toast.error('Please enter your name')
      return
    }

    if (!donorPhone.trim()) {
      toast.error('Please enter your phone number')
      return
    }

    if (!donorEmail.trim() || !isValidEmail(donorEmail.trim())) {
      const fallback = generateDynamicEmail(donorName, donorPhone)
      setDonorEmail(fallback)
    }

    if (!donorPhone.trim()) {
      toast.error('Please enter your phone number')
      return
    }

    // Validate 80G receipt requirements
    if (wants80GReceipt) {
      if (!donorPAN.trim()) {
        toast.error('PAN number is required for 80G tax exemption receipt')
        return
      }
      if (!isValidPAN(donorPAN.trim().toUpperCase())) {
        toast.error('Please enter a valid PAN number (e.g., ABCDE1234F)')
        return
      }
      if (!donorAddress.trim()) {
        toast.error('Address is required for 80G tax exemption receipt')
        return
      }
      if (!donorCity.trim()) {
        toast.error('City is required for 80G tax exemption receipt')
        return
      }
      if (!donorState.trim()) {
        toast.error('State is required for 80G tax exemption receipt')
        return
      }
      if (!donorPincode.trim() || !/^[0-9]{6}$/.test(donorPincode.trim())) {
        toast.error('Valid 6-digit pincode is required for 80G tax exemption receipt')
        return
      }
    }

    setIsSubmitting(true)

    try {
      // Update user profile if logged in and details have changed
      if (user) {
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
            await fetch('/api/protected/users/profile', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updateData)
            })
          } catch (profileError) {
            console.warn('[PROFILE_UPDATE_FAILED]', profileError)
            // Don't fail donation if profile update fails
          }
        }
      }

      const response = await fetch(`/api/public/campaigns/${campaignSlug}/donations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          donorName: donorName.trim(),
          donorEmail: donorEmail.trim(),
          donorPhone: donorPhone.trim() || undefined,
          amount,
          message: message.trim() || undefined,
          wants80GReceipt,
          donorPAN: wants80GReceipt ? donorPAN.trim().toUpperCase() : undefined,
          donorAddress: wants80GReceipt ? donorAddress.trim() : undefined,
          donorCity: wants80GReceipt ? donorCity.trim() : undefined,
          donorState: wants80GReceipt ? donorState.trim() : undefined,
          donorPincode: wants80GReceipt ? donorPincode.trim() : undefined,
          receiptPreferences: {
            email: receiptViaEmail,
            sms: receiptViaSMS,
            razorpayManaged: razorpayManagedReceipt
          },
          paymentMethod: 'online'
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit donation')
      }

      const donation = await response.json()

      // Create Razorpay order
      if (!razorpayReady) throw new Error('Payment gateway is not ready. Please try again.')
      const orderRes = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'donation', 
          amount, 
          referenceId: donation._id, 
          email: donorEmail.trim(), 
          phone: donorPhone.trim() || undefined,
          receiptPreferences: {
            email: receiptViaEmail,
            sms: receiptViaSMS,
            razorpayManaged: razorpayManagedReceipt
          }
        })
      })
      if (!orderRes.ok) {
        const er = await orderRes.json().catch(() => ({}))
        throw new Error(er.error || 'Failed to create payment order')
      }
      const { orderId, amount: amtPaise, currency, keyId } = await orderRes.json()

      const rzp = new (window as any).Razorpay({
        key: keyId,
        amount: amtPaise,
        currency,
        name: 'Khadim-e-Millat Welfare Foundation',
        description: `Donation for ${campaignSlug}`,
        order_id: orderId,
        prefill: { name: donorName, email: donorEmail, contact: donorPhone },
        theme: { color: '#16a34a' },
        handler: async (resp: any) => {
          try {
            const verifyRes = await fetch('/api/razorpay/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'donation', orderId: resp.razorpay_order_id, paymentId: resp.razorpay_payment_id, signature: resp.razorpay_signature, referenceId: donation._id
              })
            })
            if (verifyRes.status === 202) {
              toast.info('Payment received. Verification is pending; you will receive a confirmation shortly.')
              // Redirect to thank you page even for pending status
              toast.loading('Redirecting to confirmation page...', { id: 'redirect-loading' })
              setTimeout(() => {
                window.location.href = `/thank-you?donationId=${donation._id}&paymentId=${resp.razorpay_payment_id}`
              }, 2000)
              return
            }
            if (!verifyRes.ok) {
              const data = await verifyRes.json().catch(() => ({}))
              throw new Error(data.error || 'Payment verification failed')
            }
            
            // Success! Redirect to thank you page
            toast.success('Donation completed successfully! Thank you for your support.')
            toast.loading('Redirecting to confirmation page...', { id: 'redirect-loading' })
            setTimeout(() => {
              window.location.href = `/thank-you?donationId=${donation._id}&paymentId=${resp.razorpay_payment_id}`
            }, 1500)
          } catch (err) {
            console.error('[VERIFY_PAYMENT_ERROR]', err)
            toast.error(err instanceof Error ? err.message : 'Payment verification failed')
          }
        }
      })
      rzp.on('payment.failed', (resp: any) => {
        console.error('[PAYMENT_FAILED]', resp.error)
        toast.error(resp.error?.description || 'Payment failed. Please try again.')
      })
      rzp.open()

      // In production, webhook also confirms payment

    } catch (error) {
      console.error('Error submitting donation:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to submit donation. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isPresetSelected = (presetAmount: number) => amount === presetAmount

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Preset Amounts */}
      <div>
        <Label className="text-sm font-medium text-foreground mb-3 block">
          Choose Amount (₹)
        </Label>
        <div className="grid grid-cols-2 gap-2 mb-3">
          {PRESET_AMOUNTS.map((presetAmount) => (
            <Button
              key={presetAmount}
              type="button"
              variant={isPresetSelected(presetAmount) ? "default" : "outline"}
              size="sm"
              onClick={() => handlePresetAmount(presetAmount)}
              className="text-sm"
            >
              ₹{presetAmount.toLocaleString()}
            </Button>
          ))}
        </div>

        {/* Custom Amount */}
        <Input
          type="number"
          inputMode="numeric"
          placeholder="Enter custom amount"
          value={customAmount}
          onChange={(e) => handleCustomAmount(e.target.value)}
          min={1}
          className="text-sm"
        />
      </div>

      {/* Donor Information */}
      <div className="space-y-3">
        <div>
          <Label htmlFor="donorName" className="text-sm font-medium text-foreground">
            Your Name *
          </Label>
          <Input
            id="donorName"
            type="text"
            value={donorName}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Enter your full name"
            required
            disabled={!!user && !allowEditProfileFields}
            className="text-sm"
          />
        </div>

        {/* Phone Number Field - Always shown */}
        <div>
          <Label htmlFor="donorPhone" className="text-sm font-medium text-foreground">
            Phone Number *
          </Label>
          <PhoneInput
            id="donorPhone"
            value={donorPhone}
            onChange={(value) => handlePhoneChange(value)}
            placeholder="Enter your phone number"
            required
            disabled={!!user && !allowEditProfileFields}
            className="text-sm"
          />
        </div>

        <div>
          <Label htmlFor="donorEmail" className="text-sm font-medium text-foreground">
            Email *
            {!user && (
              <span className="text-xs text-muted-foreground ml-1">
                (Required for all donations)
              </span>
            )}
          </Label>
          <Input
            id="donorEmail"
            type="email"
            value={donorEmail}
            onChange={(e) => handleEmailChange(e.target.value)}
            placeholder={user ? "Your email" : "Enter your email or use generated"}
            required
            disabled={!!user && !allowEditProfileFields}
            className="text-sm"
          />
          {!user && emailGenerated && (
            <p className="text-xs text-muted-foreground mt-1">
              Auto-generated from name and phone. You can edit this if needed.
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="message" className="text-sm font-medium text-foreground">
            Message (Optional)
          </Label>
          <Textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Leave a message of support..."
            rows={3}
            className="text-sm resize-none"
          />
        </div>
      </div>

      {/* 80G Receipt and Preferences Section */}
      <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Receipt Preferences</h3>
          
          {/* 80G Receipt Option */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                id="wants80GReceipt"
                type="checkbox"
                checked={wants80GReceipt}
                onChange={(e) => setWants80GReceipt(e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="wants80GReceipt" className="text-sm font-medium">
                I want 80G tax exemption certificate
              </Label>
            </div>
            <p className="text-xs text-muted-foreground ml-6">
              Get tax benefits under Section 80G of Income Tax Act. PAN number required.
            </p>
          </div>

          {/* PAN Input (conditionally shown) */}
          {wants80GReceipt && (
            <>
              <div>
                <Label htmlFor="donorPAN" className="text-sm font-medium text-foreground">
                  PAN Number *
                </Label>
                <Input
                  id="donorPAN"
                  type="text"
                  value={donorPAN}
                  onChange={(e) => setDonorPAN(e.target.value.toUpperCase())}
                  placeholder="ABCDE1234F"
                  required={wants80GReceipt}
                  maxLength={10}
                  className="text-sm uppercase"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Required for 80G certificate. Format: ABCDE1234F
                </p>
              </div>

              {/* Address Fields for 80G */}
              <div className="space-y-3 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">Address Details (Required for 80G Certificate)</h4>
                
                <div>
                  <Label htmlFor="donorAddress" className="text-sm font-medium text-foreground">
                    Address *
                  </Label>
                  <Input
                    id="donorAddress"
                    type="text"
                    value={donorAddress}
                    onChange={(e) => setDonorAddress(e.target.value)}
                    placeholder="Enter your complete address"
                    required={wants80GReceipt}
                    className="text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="donorCity" className="text-sm font-medium text-foreground">
                      City *
                    </Label>
                    <Input
                      id="donorCity"
                      type="text"
                      value={donorCity}
                      onChange={(e) => setDonorCity(e.target.value)}
                      placeholder="City"
                      required={wants80GReceipt}
                      className="text-sm"
                    />
                  </div>

                  <div>
                    <Label htmlFor="donorPincode" className="text-sm font-medium text-foreground">
                      Pincode *
                    </Label>
                    <Input
                      id="donorPincode"
                      type="text"
                      value={donorPincode}
                      onChange={(e) => setDonorPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="123456"
                      required={wants80GReceipt}
                      maxLength={6}
                      className="text-sm"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="donorState" className="text-sm font-medium text-foreground">
                    State *
                  </Label>
                  <Input
                    id="donorState"
                    type="text"
                    value={donorState}
                    onChange={(e) => setDonorState(e.target.value)}
                    placeholder="State"
                    required={wants80GReceipt}
                    className="text-sm"
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {user && (
        <div className="flex items-center gap-2 text-xs">
          <input id="editProfileFields" type="checkbox" checked={allowEditProfileFields} onChange={e => setAllowEditProfileFields(e.target.checked)} />
          <label htmlFor="editProfileFields">Edit my name/email for this donation</label>
        </div>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        className="w-full"
        disabled={isSubmitting || !amount || !donorName.trim() || !donorEmail.trim()}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Heart className="mr-2 h-4 w-4" />
            Proceed to Payment ₹{amount ? amount.toLocaleString() : '0'}
          </>
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        You will be redirected to Razorpay secure payment gateway to complete your donation.
        {!user && " No account creation required."}
      </p>
    </form>
  )
}