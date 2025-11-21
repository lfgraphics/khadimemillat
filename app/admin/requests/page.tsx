"use client"

import React, { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { safeJson } from '@/lib/utils'
import Link from 'next/link'
import { Eye, Search, Filter, Calendar, MapPin, Phone, User } from 'lucide-react'

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
  assignedFieldExecutives: string[]
  assignedDetails?: Array<{
    fullName?: string
    username?: string
  }>
  createdAt: string
  updatedAt: string
}

export default function RequestsPage() {
  const { user } = useUser()
  const [requests, setRequests] = useState<CollectionRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchRequests = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        ...(statusFilter !== 'all' && { status: statusFilter })
      })
      
      const res = await fetch(`/api/protected/collection-requests?${params}`)
      if (!res.ok) throw new Error('Failed to fetch requests')
      
      const data = await safeJson<any>(res)
      setRequests(data.items || [])
      setTotalPages(Math.ceil((data.total || 0) / (data.limit || 10)))
    } catch (error) {
      console.error('Error fetching requests:', error)
      toast.error('Failed to load collection requests')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [page, statusFilter])

  const filteredRequests = requests.filter(request => {
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      request.donorDetails?.fullName?.toLowerCase().includes(searchLower) ||
      request.donorDetails?.username?.toLowerCase().includes(searchLower) ||
      request.address.toLowerCase().includes(searchLower) ||
      request.phone.includes(searchTerm) ||
      request._id.toLowerCase().includes(searchLower)
    )
  })

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
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Collection Requests</h1>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Collection Requests</h1>
        <div className="text-sm text-muted-foreground">
          {requests.length} requests found
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by donor name, address, phone, or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="collected">Collected</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requests List */}
      <div className="grid gap-4">
        {filteredRequests.map(request => (
          <Card key={request._id} className="hoact:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-lg">
                      {request.donorDetails?.fullName || request.donorDetails?.username || 'Unknown Donor'}
                    </h3>
                    <Badge className={getStatusColor(request.status)}>
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Request ID: {request._id}
                  </div>
                </div>
                <Link href={`/admin/requests/${request._id}`}>
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                </Link>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">Address:</span>
                    <span className="text-muted-foreground">{request.address}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">Phone:</span>
                    <span className="text-muted-foreground">{request.phone}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">Requested Pickup:</span>
                    <span className="text-muted-foreground">
                      {formatDate(request.requestedPickupTime)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">Created:</span>
                    <span className="text-muted-foreground">
                      {formatDate(request.createdAt)}
                    </span>
                  </div>
                </div>
              </div>

              {request.notes && (
                <div className="mb-4">
                  <span className="font-medium text-sm">Notes:</span>
                  <p className="text-sm text-muted-foreground mt-1">{request.notes}</p>
                </div>
              )}

              {request.assignedDetails && request.assignedDetails.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">Assigned to:</span>
                  <div className="flex gap-2">
                    {request.assignedDetails.map((fieldExecutive, index) => (
                      <Badge key={index} variant="secondary">
                        {fieldExecutive.fullName || fieldExecutive.username}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredRequests.length === 0 && !loading && (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-muted-foreground">
              {searchTerm || statusFilter !== 'all' 
                ? 'No requests match your search criteria' 
                : 'No collection requests found'
              }
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="flex items-center px-4 text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}