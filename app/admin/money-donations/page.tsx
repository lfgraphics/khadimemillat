"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { 
  DollarSign, 
  Calendar, 
  CreditCard, 
  RefreshCw, 
  Search, 
  Filter, 
  Download,
  AlertTriangle,
  Eye,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react'
import { safeJson } from '@/lib/utils'
import { toast } from 'sonner'

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

interface RefundRequest {
  donationId: string
  reason: string
  amount: number
}

export default function MoneyDonationsPage() {
  const [donations, setDonations] = useState<MoneyDonation[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedDonation, setSelectedDonation] = useState<MoneyDonation | null>(null)
  const [showRefundDialog, setShowRefundDialog] = useState(false)
  const [refundReason, setRefundReason] = useState('')
  const [processing, setProcessing] = useState(false)

  const loadDonations = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/protected/admin/money-donations')
      if (response.ok) {
        const data = await safeJson<{ donations: MoneyDonation[] }>(response)
        setDonations(data.donations || [])
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
    loadDonations()
  }, [])

  const filteredDonations = donations.filter(donation => {
    const matchesSearch = donation.donorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         donation.donorEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         donation.programId.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (donation.campaignId?.title || '').toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' || donation.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const stats = {
    total: donations.length,
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
        setShowRefundDialog(false)
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

  const exportDonations = () => {
    const csvData = filteredDonations.map(donation => ({
      'Donation ID': donation._id,
      'Donor Name': donation.donorName,
      'Donor Email': donation.donorEmail,
      'Amount': donation.amount,
      'Status': donation.status,
      'Payment Method': donation.paymentMethod,
      'Program': donation.programId.title,
      'Campaign': donation.campaignId?.title || 'N/A',
      'Razorpay Payment ID': donation.razorpayPaymentId || 'N/A',
      'Date': new Date(donation.createdAt).toLocaleDateString(),
      'Message': donation.message || 'N/A'
    }))

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `money-donations-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Money Donations Management</h1>
        <div className="flex gap-2">
          <Button onClick={exportDonations} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={loadDonations} variant="outline" size="sm">
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
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search by donor name, email, program, or campaign..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
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
              {searchTerm || statusFilter !== 'all' ? 'No donations match your filters' : 'No money donations found'}
            </p>
          </CardContent>
        </Card>
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