"use client"

import React, { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Package, DollarSign, Calendar, MapPin, Phone, RefreshCw } from 'lucide-react'
import { safeJson } from '@/lib/utils'

interface ScrapDonation {
  _id: string
  donor: string
  collectedBy?: string
  status: 'pending' | 'verified' | 'collected' | 'done' | 'completed'
  requestedPickupTime?: string
  actualPickupTime?: string
  collectionRequest?: {
    _id: string
    address: string
    phone: string
    notes?: string
  }
  items: Array<{
    _id: string
    name: string
    category: string
    photos?: string[]
    marketplaceListing?: {
      demandedPrice: number
      sold: boolean
    }
  }>
  createdAt: string
}

interface MoneyDonation {
  _id: string
  donorId?: string
  donorName: string
  donorEmail: string
  amount: number
  message?: string
  paymentMethod: string
  status: 'pending' | 'completed' | 'failed' | 'refunded'
  razorpayOrderId?: string
  razorpayPaymentId?: string
  campaignId?: {
    _id: string
    title: string
  }
  programId: {
    _id: string
    title: string
  }
  createdAt: string
}

export default function MyDonationsPage() {
  const { user } = useUser()
  const [scrapDonations, setScrapDonations] = useState<ScrapDonation[]>([])
  const [moneyDonations, setMoneyDonations] = useState<MoneyDonation[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'scrap' | 'money'>('scrap')

  const loadDonations = async () => {
    if (!user?.id) return
    
    setLoading(true)
    try {
      // Load scrap donations (DonationEntry)
      const scrapRes = await fetch('/api/protected/my-donations/scrap')
      if (scrapRes.ok) {
        const scrapData = await safeJson<{ donations: ScrapDonation[] }>(scrapRes)
        setScrapDonations(scrapData.donations || [])
      }

      // Load money donations (CampaignDonation)
      const moneyRes = await fetch('/api/protected/my-donations/money')
      if (moneyRes.ok) {
        const moneyData = await safeJson<{ donations: MoneyDonation[] }>(moneyRes)
        setMoneyDonations(moneyData.donations || [])
      }
    } catch (error) {
      console.error('Failed to load donations:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDonations()
  }, [user?.id])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'failed': return 'bg-red-100 text-red-800'
      case 'refunded': return 'bg-gray-100 text-gray-800'
      default: return 'bg-blue-100 text-blue-800'
    }
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Please sign in to view your donations</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">My Donations</h1>
        <Button onClick={loadDonations} disabled={loading} variant="outline" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6">
        <Button
          variant={activeTab === 'scrap' ? 'default' : 'outline'}
          onClick={() => setActiveTab('scrap')}
          className="flex items-center gap-2"
        >
          <Package className="h-4 w-4" />
          Scrap Donations ({scrapDonations.length})
        </Button>
        <Button
          variant={activeTab === 'money' ? 'default' : 'outline'}
          onClick={() => setActiveTab('money')}
          className="flex items-center gap-2"
        >
          <DollarSign className="h-4 w-4" />
          Money Donations ({moneyDonations.length})
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6 h-48" />
            </Card>
          ))}
        </div>
      ) : (
        <>
          {/* Scrap Donations */}
          {activeTab === 'scrap' && (
            <div className="space-y-4">
              {scrapDonations.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No scrap donations found</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {scrapDonations.map((donation, index) => (
                    <Card key={index}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">Scrap Donation</CardTitle>
                          <Badge className={getStatusColor(donation.status)}>
                            {donation.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {new Date(donation.createdAt).toLocaleDateString()}
                          </div>
                          {donation.collectionRequest && (
                            <>
                              <div className="flex items-center gap-2 mt-1">
                                <MapPin className="h-4 w-4" />
                                {donation.collectionRequest.address}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <Phone className="h-4 w-4" />
                                {donation.collectionRequest.phone}
                              </div>
                            </>
                          )}
                        </div>
                        
                        <div>
                          <p className="font-medium mb-2">Items ({donation.items.length})</p>
                          {donation.items.slice(0, 3).map((item) => (
                            <div key={item._id} className="text-sm text-muted-foreground flex justify-between">
                              <span>{item.name}</span>
                              {item.marketplaceListing && (
                                <span className="font-medium">
                                  ₹{item.marketplaceListing.demandedPrice}
                                  {item.marketplaceListing.sold && <span className="text-green-600 ml-1">✓</span>}
                                </span>
                              )}
                            </div>
                          ))}
                          {donation.items.length > 3 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              +{donation.items.length - 3} more items
                            </p>
                          )}
                        </div>

                        {donation.requestedPickupTime && (
                          <div className="text-sm">
                            <span className="font-medium">Pickup: </span>
                            {new Date(donation.requestedPickupTime).toLocaleString()}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Money Donations */}
          {activeTab === 'money' && (
            <div className="space-y-4">
              {moneyDonations.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No money donations found</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {moneyDonations.map((donation) => (
                    <Card key={donation._id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">₹{donation.amount}</CardTitle>
                          <Badge className={getStatusColor(donation.status)}>
                            {donation.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {new Date(donation.createdAt).toLocaleDateString()}
                          </div>
                        </div>

                        <div>
                          <p className="font-medium">{donation.programId.title}</p>
                          {donation.campaignId && (
                            <p className="text-sm text-muted-foreground">
                              Campaign: {donation.campaignId.title}
                            </p>
                          )}
                        </div>

                        {donation.message && (
                          <div>
                            <p className="font-medium text-sm">Message:</p>
                            <p className="text-sm text-muted-foreground">{donation.message}</p>
                          </div>
                        )}

                        <div className="text-sm">
                          <span className="font-medium">Payment: </span>
                          {donation.paymentMethod}
                          {donation.razorpayPaymentId && (
                            <span className="block text-xs text-muted-foreground mt-1">
                              ID: {donation.razorpayPaymentId}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}