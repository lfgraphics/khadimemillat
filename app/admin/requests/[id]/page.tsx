"use client"

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { safeJson } from '@/lib/utils'
import Link from 'next/link'
import { ArrowLeft, Calendar, MapPin, Phone, User, Edit, Save, X, Package } from 'lucide-react'

interface CollectionRequest {
  _id: string
  donor: string
  donorDetails?: {
    fullName?: string
    username?: string
    primaryEmailAddress?: { emailAddress: string }
  }
  requestedPickupTime: string
  actualPickupTime?: string
  address: string
  phone: string
  notes?: string
  status: 'pending' | 'verified' | 'collected' | 'completed'
  assignedScrappers: string[]
  assignedDetails?: Array<{
    id: string
    fullName?: string
    username?: string
  }>
  donationEntryId?: string
  createdAt: string
  updatedAt: string
}

interface ScrapItem {
  _id: string
  name: string
  condition: string
  quantity: number
  availableQuantity: number
  photos: { before: string[]; after: string[] }
  marketplaceListing: {
    listed: boolean
    demandedPrice?: number
    salePrice?: number
    sold: boolean
  }
}

export default function RequestDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useUser()
  const [request, setRequest] = useState<CollectionRequest | null>(null)
  const [items, setItems] = useState<ScrapItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editData, setEditData] = useState({
    status: '',
    notes: '',
    actualPickupTime: ''
  })

  const fetchRequestDetails = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/protected/collection-requests/${params.id}`)
      if (!res.ok) throw new Error('Failed to fetch request details')
      
      const data = await safeJson<any>(res)
      setRequest(data.request)
      setEditData({
        status: data.request.status,
        notes: data.request.notes || '',
        actualPickupTime: data.request.actualPickupTime || ''
      })

      // Fetch associated items if donation entry exists
      if (data.request.donationEntryId) {
        const itemsRes = await fetch(`/api/protected/scrap-items?donationEntryId=${data.request.donationEntryId}`)
        if (itemsRes.ok) {
          const itemsData = await safeJson<any>(itemsRes)
          setItems(itemsData.items || [])
        }
      }
    } catch (error) {
      console.error('Error fetching request details:', error)
      toast.error('Failed to load request details')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (params.id) {
      fetchRequestDetails()
    }
  }, [params.id])

  const handleSave = async () => {
    try {
      const res = await fetch(`/api/protected/collection-requests/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData)
      })

      if (!res.ok) throw new Error('Failed to update request')

      const data = await safeJson<any>(res)
      setRequest(data.request)
      setEditing(false)
      toast.success('Request updated successfully')
    } catch (error) {
      console.error('Error updating request:', error)
      toast.error('Failed to update request')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'verified': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'collected': return 'bg-green-100 text-green-800 border-green-200'
      case 'completed': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <Card>
            <CardContent className="p-6">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-3 bg-gray-200 rounded w-3/4"></div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!request) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-muted-foreground">Request not found</div>
            <Link href="/admin/requests">
              <Button variant="outline" className="mt-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Requests
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/requests">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <h1 className="text-2xl font-semibold">Collection Request Details</h1>
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <Button variant="outline" onClick={() => setEditing(false)}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Request
            </Button>
          )}
        </div>
      </div>

      {/* Request Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Request Information</span>
            <Badge className={getStatusColor(request.status)}>
              {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Donor</label>
                <div className="flex items-center gap-2 mt-1">
                  <User className="h-4 w-4 text-gray-500" />
                  <span>{request.donorDetails?.fullName || request.donorDetails?.username || 'Unknown Donor'}</span>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Phone</label>
                <div className="flex items-center gap-2 mt-1">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <span>{request.phone}</span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Address</label>
                <div className="flex items-start gap-2 mt-1">
                  <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                  <span>{request.address}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Status</label>
                {editing ? (
                  <Select value={editData.status} onValueChange={(value) => setEditData(prev => ({ ...prev, status: value }))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="verified">Verified</SelectItem>
                      <SelectItem value="collected">Collected</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="mt-1">
                    <Badge className={getStatusColor(request.status)}>
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </Badge>
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium">Requested Pickup Time</label>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span>{formatDate(request.requestedPickupTime)}</span>
                </div>
              </div>

              {(request.actualPickupTime || editing) && (
                <div>
                  <label className="text-sm font-medium">Actual Pickup Time</label>
                  {editing ? (
                    <input
                      type="datetime-local"
                      value={editData.actualPickupTime}
                      onChange={(e) => setEditData(prev => ({ ...prev, actualPickupTime: e.target.value }))}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  ) : request.actualPickupTime ? (
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span>{formatDate(request.actualPickupTime)}</span>
                    </div>
                  ) : (
                    <div className="mt-1 text-muted-foreground">Not set</div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Notes</label>
            {editing ? (
              <Textarea
                value={editData.notes}
                onChange={(e) => setEditData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Add notes about this request..."
                className="mt-1"
                rows={3}
              />
            ) : (
              <div className="mt-1 p-3 bg-gray-50 rounded-md min-h-[80px]">
                {request.notes || <span className="text-muted-foreground">No notes</span>}
              </div>
            )}
          </div>

          {request.assignedDetails && request.assignedDetails.length > 0 && (
            <div>
              <label className="text-sm font-medium">Assigned Scrappers</label>
              <div className="flex gap-2 mt-1">
                {request.assignedDetails.map((scrapper, index) => (
                  <Badge key={index} variant="secondary">
                    {scrapper.fullName || scrapper.username}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="text-xs text-muted-foreground pt-2 border-t">
            <div>Request ID: {request._id}</div>
            <div>Created: {formatDate(request.createdAt)}</div>
            <div>Last Updated: {formatDate(request.updatedAt)}</div>
          </div>
        </CardContent>
      </Card>

      {/* Associated Items */}
      {items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Associated Items ({items.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {items.map(item => (
                <Link key={item._id} href={`/admin/items/${item._id}`}>
                  <Card className="hoact:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <h4 className="font-medium">{item.name}</h4>
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-xs">
                            {item.condition}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            Qty: {item.availableQuantity}/{item.quantity}
                          </span>
                        </div>
                        {item.marketplaceListing.listed && (
                          <div className="text-sm">
                            <span className="font-medium">₹{item.marketplaceListing.demandedPrice}</span>
                            {item.marketplaceListing.sold && item.availableQuantity === 0 && (
                              <Badge className="ml-2 bg-green-100 text-green-800">Sold Out</Badge>
                            )}
                            {item.marketplaceListing.sold && item.availableQuantity > 0 && (
                              <Badge className="ml-2 bg-orange-100 text-orange-800">Partially Sold</Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}