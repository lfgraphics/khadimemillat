'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils/dashboard'

interface Donation {
  id: string
  donorName: string
  amount: number
  createdAt: string
}

export default function DonationNotifications() {
  const [donations, setDonations] = useState<Donation[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  // Fetch recent donations on mount
  useEffect(() => {
    const fetchDonations = async () => {
      try {
        const response = await fetch('/api/public/donations/recent')
        const data = await response.json()
        
        if (data.success && data.donations?.length > 0) {
          setDonations(data.donations)
        }
      } catch (error) {
        console.error('Failed to fetch recent donations:', error)
      } finally {
        setIsLoaded(true)
      }
    }

    fetchDonations()
  }, [])

  // Show random donation toast
  useEffect(() => {
    if (!isLoaded || donations.length === 0) return

    const showRandomDonation = () => {
      const randomDonation = donations[Math.floor(Math.random() * donations.length)]
      
      toast.success(
        <div className="flex items-center gap-2">
          <span>{randomDonation.donorName} donated</span>
          <span className="font-semibold text-green-600">{formatCurrency(randomDonation.amount)}</span>
        </div>,
        {
          duration: 4000,
          position: 'bottom-right'
        }
      )
    }

    // Show first toast after 3 seconds
    const initialTimeout = setTimeout(showRandomDonation, 3000)

    // Then show random toasts every 15-30 seconds
    const interval = setInterval(() => {
      showRandomDonation()
    }, Math.random() * 15000 + 15000) // Random between 15-30 seconds

    return () => {
      clearTimeout(initialTimeout)
      clearInterval(interval)
    }
  }, [isLoaded, donations])

  // This component doesn't render anything visible
  return null
}