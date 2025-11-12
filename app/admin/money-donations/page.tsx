"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import MoneyDonationFilters, { MoneyDonationFiltersState } from '@/components/admin/MoneyDonationFilters'
import { 
  DollarSign, 
  Calendar, 
  CreditCard, 
  RefreshCw, 
  Search, 
  Download,
  Eye,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react'
import { 
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '@/components/ui/pagination'
import { safeJson } from '@/lib/utils'
import { toast } from 'sonner'

interface MoneyDonation {
  _id: string
  donorId?: string
  donorName: string
  donorEmail: string
  donorPAN?: string
  amount: number
  message?: string
  paymentMethod: string
  status: 'pending' | 'completed' | 'failed' | 'refunded'
  paymentVerified?: boolean
  paymentVerifiedAt?: string
  razorpayOrderId?: string
  razorpayPaymentId?: string
  razorpaySignature?: string
  campaignId?: {
    _id: string
    title: string
  }
  programId: {
    _id: string
    title: string
  }
  refundRequested?: boolean
  refundReason?: string
  refundProcessedAt?: string
  createdAt: string
  updatedAt: string
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  pages: number
}

interface RefundRequest {
  donationId: string
  reason: string
  amount: number
}

export default function MoneyDonationsPage() {
  const [donations, setDonations] = useState<MoneyDonation[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDonation, setSelectedDonation] = useState<MoneyDonation | null>(null)
  const [refundReason, setRefundReason] = useState('')
  const [processing, setProcessing] = useState(false)
  const [exporting, setExporting] = useState(false)
  
  // Filters state
  const [filters, setFilters] = useState<MoneyDonationFiltersState>({
    searchTerm: '',
    statusFilter: 'all',
    paymentVerified: 'all',
    panProvided: 'all',
    showAllDonations: false,
    dateRange: undefined
  })
  
  // Pagination state
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 25,
    total: 0,
    pages: 0
  })

  const loadDonations = async (page: number = pagination.page) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('page', page.toString())
      params.append('limit', pagination.limit.toString())
      
      if (filters.showAllDonations) {
        params.append('showAll', 'true')
      }
      
      if (filters.statusFilter && filters.statusFilter !== 'all') {
        params.append('status', filters.statusFilter)
      }
      
      if (filters.paymentVerified && filters.paymentVerified !== 'all') {
        params.append('paymentVerified', filters.paymentVerified)
      }
      
      if (filters.panProvided && filters.panProvided !== 'all') {
        params.append('panProvided', filters.panProvided)
      }
      
      if (filters.searchTerm?.trim()) {
        params.append('search', filters.searchTerm.trim())
      }
      
      // Add date range filtering
      if (filters.dateRange?.from) {
        params.append('dateFrom', filters.dateRange.from.toISOString())
      }
      
      if (filters.dateRange?.to) {
        params.append('dateTo', filters.dateRange.to.toISOString())
      }
      
      const response = await fetch(`/api/protected/admin/money-donations?${params}`)
      if (response.ok) {
        const data = await safeJson<{ 
          donations: MoneyDonation[]
          pagination: PaginationInfo
        }>(response)
        setDonations(data.donations || [])
        setPagination(data.pagination || {
          page: 1,
          limit: 25,
          total: 0,
          pages: 0
        })
      } else {
        toast.error('Failed to load money donations')
      }
    } catch (error) {
      console.error('Error loading donations:', error)
      toast.error('Failed to load money donations')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDonations(1)
  }, [filters])

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }))
    loadDonations(newPage)
  }

  const handleLimitChange = (newLimit: number) => {
    setPagination(prev => ({ ...prev, limit: newLimit, page: 1 }))
    loadDonations(1)
  }

  const handleFiltersChange = (newFilters: MoneyDonationFiltersState) => {
    setFilters(newFilters)
    setPagination(prev => ({ ...prev, page: 1 })) // Reset to first page when filters change
  }

  const clearAllFilters = () => {
    setFilters({
      searchTerm: '',
      statusFilter: 'all',
      paymentVerified: 'all',
      panProvided: 'all',
      showAllDonations: false,
      dateRange: undefined
    })
  }

  // Remove client-side filtering since it's now handled by the API
  const filteredDonations = donations

  const stats = {
    total: pagination.total,
    completed: donations.filter(d => d.status === 'completed').length,
    pending: donations.filter(d => d.status === 'pending').length,
    failed: donations.filter(d => d.status === 'failed').length,
    refunded: donations.filter(d => d.status === 'refunded').length,
    totalAmount: donations.filter(d => d.status === 'completed').reduce((sum, d) => sum + d.amount, 0)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'failed': return 'bg-red-100 text-red-800'
      case 'refunded': return 'bg-gray-100 text-gray-800'
      default: return 'bg-blue-100 text-blue-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4" />
      case 'pending': return <Clock className="h-4 w-4" />
      case 'failed': return <XCircle className="h-4 w-4" />
      case 'refunded': return <RotateCcw className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const handleRefund = async (donation: MoneyDonation) => {
    if (!refundReason.trim()) {
      toast.error('Please provide a reason for the refund')
      return
    }

    setProcessing(true)
    try {
      const response = await fetch('/api/protected/admin/money-donations/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          donationId: donation._id,
          reason: refundReason,
          amount: donation.amount
        })
      })

      if (response.ok) {
        toast.success('Refund initiated successfully')
        setRefundReason('')
        setSelectedDonation(null)
        loadDonations()
      } else {
        const error = await response.text()
        toast.error(error || 'Failed to initiate refund')
      }
    } catch (error) {
      console.error('Error processing refund:', error)
      toast.error('Failed to process refund')
    } finally {
      setProcessing(false)
    }
  }

  const exportDonations = async () => {
    setExporting(true)
    try {
      // Build query parameters to match current filters
      const params = new URLSearchParams()
      
      if (filters.showAllDonations) {
        params.append('showAll', 'true')
      }
      
      if (filters.statusFilter && filters.statusFilter !== 'all') {
        params.append('status', filters.statusFilter)
      }
      
      if (filters.paymentVerified && filters.paymentVerified !== 'all') {
        params.append('paymentVerified', filters.paymentVerified)
      }
      
      if (filters.panProvided && filters.panProvided !== 'all') {
        params.append('panProvided', filters.panProvided)
      }
      
      if (filters.searchTerm?.trim()) {
        params.append('search', filters.searchTerm.trim())
      }
      
      // Add date range to export
      if (filters.dateRange?.from) {
        params.append('dateFrom', filters.dateRange.from.toISOString())
      }
      
      if (filters.dateRange?.to) {
        params.append('dateTo', filters.dateRange.to.toISOString())
      }

      const response = await fetch(`/api/protected/admin/money-donations/export?${params}`)
      
      if (response.ok) {
        // Get the CSV content as blob
        const blob = await response.blob()
        
        // Extract filename from response headers or use default
        const contentDisposition = response.headers.get('Content-Disposition')
        const filename = contentDisposition 
          ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
          : `money-donations-export-${new Date().toISOString().split('T')[0]}.csv`
        
        // Create download link
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
        
        toast.success('Export completed successfully')
      } else {
        const errorText = await response.text()
        toast.error(errorText || 'Failed to export donations')
      }
    } catch (error) {
      console.error('Error exporting donations:', error)
      toast.error('Failed to export donations')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Money Donations Management</h1>
        <div className="flex gap-2">
          <Button 
            onClick={exportDonations} 
            variant="outline" 
            size="sm"
            disabled={exporting}
          >
            <Download className={`h-4 w-4 mr-2 ${exporting ? 'animate-spin' : ''}`} />
            {exporting ? 'Exporting...' : 'Export CSV'}
          </Button>
          <Button onClick={() => loadDonations()} variant="outline" size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              <div>
                <p className="text-sm text-muted-foreground">Failed</p>
                <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-gray-600" />
              <div>
                <p className="text-sm text-muted-foreground">Refunded</p>
                <p className="text-2xl font-bold text-gray-600">{stats.refunded}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-xl font-bold text-blue-600">₹{stats.totalAmount.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <MoneyDonationFilters
              value={filters}
              onChange={handleFiltersChange}
              onClear={clearAllFilters}
            />
            
            <div className="flex gap-2 ml-auto">
              <Select value={pagination.limit.toString()} onValueChange={(value) => handleLimitChange(Number(value))}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 per page</SelectItem>
                  <SelectItem value="25">25 per page</SelectItem>
                  <SelectItem value="50">50 per page</SelectItem>
                  <SelectItem value="100">100 per page</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Donations Table */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6 h-48" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
          {filteredDonations.map((donation) => (
            <Card key={donation._id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">₹{donation.amount}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(donation.status)}>
                      {getStatusIcon(donation.status)}
                      <span className="ml-1">{donation.status}</span>
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="font-medium">{donation.donorName}</p>
                  <p className="text-sm text-muted-foreground">{donation.donorEmail}</p>
                </div>

                <div>
                  <p className="font-medium">{donation.programId.title}</p>
                  {donation.campaignId && (
                    <p className="text-sm text-muted-foreground">
                      Campaign: {donation.campaignId.title}
                    </p>
                  )}
                </div>

                <div className="text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {new Date(donation.createdAt).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <CreditCard className="h-4 w-4" />
                    {donation.paymentMethod}
                  </div>
                  {donation.razorpayPaymentId && (
                    <p className="text-xs mt-1">ID: {donation.razorpayPaymentId}</p>
                  )}
                </div>

                {/* PAN Number and Payment Verification Status */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">PAN Number:</span>
                    {donation.donorPAN ? (
                      <Badge variant="secondary" className="text-xs">
                        {donation.donorPAN}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">Not Provided</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Payment Verification:</span>
                    <Badge 
                      variant={donation.paymentVerified ? "default" : "destructive"}
                      className="text-xs"
                    >
                      {donation.paymentVerified ? "Verified" : "Unverified"}
                    </Badge>
                  </div>
                </div>

                {donation.message && (
                  <div>
                    <p className="font-medium text-sm">Message:</p>
                    <p className="text-sm text-muted-foreground">{donation.message}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setSelectedDonation(donation)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View Details
                  </Button>
                  {donation.status === 'completed' && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive">
                          <RotateCcw className="h-4 w-4 mr-1" />
                          Refund
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Initiate Refund</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to initiate a refund for ₹{donation.amount} to {donation.donorName}?
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="py-4">
                          <Input
                            placeholder="Reason for refund..."
                            value={refundReason}
                            onChange={(e) => setRefundReason(e.target.value)}
                          />
                        </div>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleRefund(donation)}
                            disabled={processing || !refundReason.trim()}
                          >
                            {processing ? 'Processing...' : 'Initiate Refund'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {filteredDonations.length === 0 && !loading && (
        <Card>
          <CardContent className="p-8 text-center">
            <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {filters.searchTerm || (filters.statusFilter && filters.statusFilter !== 'all') || filters.dateRange?.from ? 'No donations match your filters' : 'No money donations found'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Pagination Controls */}
      {!loading && pagination.pages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
          <div className="text-sm text-muted-foreground">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} donations
          </div>
          
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={(e) => {
                    e.preventDefault()
                    if (pagination.page > 1) {
                      handlePageChange(pagination.page - 1)
                    }
                  }}
                  className={pagination.page <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
              
              {/* Page numbers */}
              {Array.from({ length: pagination.pages }, (_, i) => i + 1)
                .filter(page => {
                  // Show first page, last page, current page, and 2 pages around current
                  return page === 1 || 
                         page === pagination.pages || 
                         Math.abs(page - pagination.page) <= 2
                })
                .map((page, index, array) => {
                  // Add ellipsis if there's a gap
                  const prevPage = array[index - 1]
                  const showEllipsis = prevPage && page - prevPage > 1
                  
                  return (
                    <React.Fragment key={page}>
                      {showEllipsis && (
                        <PaginationItem>
                          <PaginationEllipsis />
                        </PaginationItem>
                      )}
                      <PaginationItem>
                        <PaginationLink
                          onClick={(e) => {
                            e.preventDefault()
                            handlePageChange(page)
                          }}
                          isActive={page === pagination.page}
                          className="cursor-pointer"
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    </React.Fragment>
                  )
                })}
              
              <PaginationItem>
                <PaginationNext 
                  onClick={(e) => {
                    e.preventDefault()
                    if (pagination.page < pagination.pages) {
                      handlePageChange(pagination.page + 1)
                    }
                  }}
                  className={pagination.page >= pagination.pages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* Donation Details Modal */}
      {selectedDonation && (
        <Dialog open={!!selectedDonation} onOpenChange={() => setSelectedDonation(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Donation Details</DialogTitle>
              <DialogDescription>
                Complete information about this money donation
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Donation ID</label>
                  <p className="text-sm text-muted-foreground">{selectedDonation._id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Amount</label>
                  <p className="text-sm text-muted-foreground">₹{selectedDonation.amount}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Donor Name</label>
                  <p className="text-sm text-muted-foreground">{selectedDonation.donorName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Donor Email</label>
                  <p className="text-sm text-muted-foreground">{selectedDonation.donorEmail}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">PAN Number</label>
                  {selectedDonation.donorPAN ? (
                    <Badge variant="secondary">{selectedDonation.donorPAN}</Badge>
                  ) : (
                    <p className="text-sm text-muted-foreground">Not Provided</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium">Payment Verification</label>
                  <div className="flex items-center gap-2">
                    <Badge variant={selectedDonation.paymentVerified ? "default" : "destructive"}>
                      {selectedDonation.paymentVerified ? "Verified" : "Unverified"}
                    </Badge>
                    {selectedDonation.paymentVerifiedAt && (
                      <span className="text-xs text-muted-foreground">
                        on {new Date(selectedDonation.paymentVerifiedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Program</label>
                <p className="text-sm text-muted-foreground">{selectedDonation.programId.title}</p>
              </div>
              {selectedDonation.campaignId && (
                <div>
                  <label className="text-sm font-medium">Campaign</label>
                  <p className="text-sm text-muted-foreground">{selectedDonation.campaignId.title}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Payment Method</label>
                  <p className="text-sm text-muted-foreground">{selectedDonation.paymentMethod}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <Badge className={getStatusColor(selectedDonation.status)}>
                    {selectedDonation.status}
                  </Badge>
                </div>
              </div>
              {selectedDonation.razorpayPaymentId && (
                <div>
                  <label className="text-sm font-medium">Razorpay Payment ID</label>
                  <p className="text-sm text-muted-foreground">{selectedDonation.razorpayPaymentId}</p>
                </div>
              )}
              {selectedDonation.razorpayOrderId && (
                <div>
                  <label className="text-sm font-medium">Razorpay Order ID</label>
                  <p className="text-sm text-muted-foreground">{selectedDonation.razorpayOrderId}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Created At</label>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selectedDonation.createdAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Updated At</label>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selectedDonation.updatedAt).toLocaleString()}
                  </p>
                </div>
              </div>
              {selectedDonation.message && (
                <div>
                  <label className="text-sm font-medium">Message</label>
                  <p className="text-sm text-muted-foreground">{selectedDonation.message}</p>
                </div>
              )}
              {selectedDonation.refundReason && (
                <div>
                  <label className="text-sm font-medium">Refund Reason</label>
                  <p className="text-sm text-muted-foreground">{selectedDonation.refundReason}</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedDonation(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}