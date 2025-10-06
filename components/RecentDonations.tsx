'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Heart, Users, Calendar } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Donation {
  donorName: string
  amount: number
  message?: string
  createdAt: string
}

interface RecentDonationsProps {
  donations: Donation[]
  campaignSlug: string
  totalSupporters: number
}

export default function RecentDonations({ donations, campaignSlug, totalSupporters }: RecentDonationsProps) {
  const [allDonations, setAllDonations] = useState<Donation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)

  const loadAllDonations = async () => {
    if (hasLoaded) return
    
    setIsLoading(true)
    try {
      const response = await fetch(`/api/public/campaigns/${campaignSlug}/donations`)
      if (response.ok) {
        const data = await response.json()
        setAllDonations(data.donations)
        setHasLoaded(true)
      }
    } catch (error) {
      console.error('Error loading donations:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (donations.length === 0) {
    return (
      <div className="text-center py-8">
        <Heart className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">
          Be the first to support this campaign!
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Recent Donations List */}
      <div className="space-y-3 mb-4">
        {donations.slice(0, 5).map((donation, index) => (
          <div key={index} className="flex items-start space-x-3 p-3 bg-background rounded-lg">
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
              <Heart className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground truncate">
                  {donation.donorName}
                </p>
                <p className="text-sm font-semibold text-primary">
                  ₹{donation.amount.toLocaleString()}
                </p>
              </div>
              {donation.message && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  "{donation.message}"
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {formatDistanceToNow(new Date(donation.createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* View All Supporters Button */}
      {totalSupporters > 5 && (
        <Dialog>
          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={loadAllDonations}
            >
              <Users className="h-4 w-4 mr-2" />
              View All {totalSupporters} Supporters
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                All Supporters ({totalSupporters})
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-sm text-muted-foreground mt-2">Loading supporters...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {allDonations.map((donation, index) => (
                    <div key={index} className="flex items-start space-x-3 p-3 bg-card rounded-lg">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <Heart className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-foreground">
                            {donation.donorName}
                          </p>
                          <p className="text-sm font-semibold text-primary">
                            ₹{donation.amount.toLocaleString()}
                          </p>
                        </div>
                        {donation.message && (
                          <p className="text-xs text-muted-foreground mt-1">
                            "{donation.message}"
                          </p>
                        )}
                        <div className="flex items-center text-xs text-muted-foreground mt-1">
                          <Calendar className="h-3 w-3 mr-1" />
                          {formatDistanceToNow(new Date(donation.createdAt), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}