'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils/dashboard'
import { Heart, Sparkles } from 'lucide-react'

interface Donation {
  id: string
  donorName: string
  amount: number
  createdAt: string
}

// Custom Toast Component for Donations
const DonationToast = ({ donorName, amount }: { donorName: string; amount: string }) => {
  return (
    <div className="flex items-start gap-3 p-1 z-50 bg-background rounded-lg">
      {/* Icon with gradient background */}
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
        <Heart className="w-5 h-5 text-white fill-white animate-pulse" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-[250px]">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <p className="text-sm font-semibold text-foreground">
            New Donation!
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{donorName}</span>
          {' '}donated{' '}
          <span className="font-bold text-green-600 dark:text-green-400">
            {amount}
          </span>
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          JazakAllah Khair for your generosity!
        </p>
      </div>
    </div>
  )
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

      toast.custom(
        (t) => (
          <DonationToast
            donorName={randomDonation.donorName}
            amount={formatCurrency(randomDonation.amount)}
          />
        ),
        {
          duration: 4000,
          position: 'bottom-left',
          className: 'toast-donation',
          closeButton: true,
          style: {
            background: 'hsl(var(--background))',
            border: '1px solid hsl(var(--border))',
            borderLeft: '4px solid rgb(34 197 94) rounded-lg',
            boxShadow: '0 10px 40px -10px rgba(34, 197, 94, 0.3)',
          }
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
