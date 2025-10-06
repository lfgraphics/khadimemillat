'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
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
  const [emailGenerated, setEmailGenerated] = useState(false)

  // Auto-populate user data when logged in
  useEffect(() => {
    if (isLoaded && user) {
      setDonorName(user.fullName || '')
      setDonorEmail(user.primaryEmailAddress?.emailAddress || '')
      // Try to get phone from user metadata
      const phone = user.publicMetadata?.phone || (user as any).privateMetadata?.phone
      if (phone) setDonorPhone(phone as string)
    }
  }, [isLoaded, user])

  // Generate dynamic email for logged out users based on name and phone
  const generateDynamicEmail = (name: string, phone: string) => {
    if (!name.trim() && !phone.trim()) return ''

    let username = ''
    if (name.trim()) {
      username = name.toLowerCase().replace(/[^a-z0-9]/g, '')
    }
    if (phone.trim()) {
      const cleanPhone = phone.replace(/[^0-9]/g, '')
      username = username ? `${username}${cleanPhone.slice(-4)}` : cleanPhone.slice(-4)
    }

    const host = typeof window !== 'undefined' ? window.location.host.replace('www.', '') : 'example.com'
    return username ? `${username}@${host}` : ''
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

    if (!donorEmail.trim()) {
      toast.error('Email is required for all donations')
      return
    }

    // Phone number is optional for logged out users

    setIsSubmitting(true)

    try {
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
          paymentMethod: 'online'
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit donation')
      }

      const donation = await response.json()

      // Demo flow: immediately mark as completed so it appears in campaign supporters list
      try {
        if (donation?._id) {
          await fetch(`/api/public/donations/${encodeURIComponent(donation._id)}/complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentReference: donation._id, paymentMethod: 'online' })
          })
        }
      } catch (e) {
        console.warn('[DONATION_COMPLETE_FAILED]', e)
      }

      toast.success('Donation recorded successfully! Thank you for your support.')

      // Reset form
      setAmount('')
      setCustomAmount('')
      if (!user) {
        setDonorName('')
        setDonorEmail('')
        setDonorPhone('')
      }
      setMessage('')

  // In production, redirect to payment gateway and complete via webhook

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
          type="string"
          inputMode='numeric'
          placeholder="Enter custom amount"
          value={Number(customAmount)}
          onChange={(e) => handleCustomAmount(e.target.value)}
          min="1"
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
            disabled={!!user}
            className="text-sm"
          />
        </div>

        {!user && (
          <div>
            <Label htmlFor="donorPhone" className="text-sm font-medium text-foreground">
              Phone Number
              <span className="text-xs text-muted-foreground ml-1">
                (Optional - helps with email generation)
              </span>
            </Label>
            <Input
              id="donorPhone"
              type="tel"
              value={donorPhone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              placeholder="Enter your phone number (optional)"
              className="text-sm"
            />
          </div>
        )}

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
            disabled={!!user}
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
            Donate ₹{amount ? amount.toLocaleString() : '0'}
          </>
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        You will be redirected to a secure payment gateway to complete your donation.
        {!user && " No account creation required."}
      </p>
    </form>
  )
}