'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Download,
  Search,
  Calendar,
  Loader2
} from 'lucide-react'
import { toast } from 'sonner'

interface Subscription {
  _id: string
  planType: string
  amount: number
  status: string
}

interface PaymentHistoryProps {
  subscriptions: Subscription[]
}

interface Payment {
  _id: string
  amount: number
  status: string
  createdAt: string
  paymentSequence: number
  subscriptionId: string
  razorpayPaymentId?: string
}

const statusIcons = {
  completed: CheckCircle,
  failed: XCircle,
  pending: Clock
}

const statusColors = {
  completed: 'text-green-600 bg-green-100 dark:bg-green-900/20',
  failed: 'text-red-600 bg-red-100 dark:bg-red-900/20',
  pending: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20'
}

export default function PaymentHistory({ subscriptions }: PaymentHistoryProps) {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [subscriptionFilter, setSubscriptionFilter] = useState('all')

  useEffect(() => {
    fetchPaymentHistory()
  }, [])

  const fetchPaymentHistory = async () => {
    try {
      // This would be a new API endpoint to fetch payment history
      // For now, we'll simulate the data structure
      setLoading(false)
      // TODO: Implement actual API call
      setPayments([])
    } catch (error) {
      console.error('Error fetching payment history:', error)
      toast.error('Failed to load payment history')
      setLoading(false)
    }
  }

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = payment.razorpayPaymentId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment._id.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter
    const matchesSubscription = subscriptionFilter === 'all' || payment.subscriptionId === subscriptionFilter
    
    return matchesSearch && matchesStatus && matchesSubscription
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getSubscriptionName = (subscriptionId: string) => {
    const subscription = subscriptions.find(sub => sub._id === subscriptionId)
    return subscription ? `${subscription.planType.charAt(0).toUpperCase() + subscription.planType.slice(1)} Sadqa` : 'Unknown'
  }

  const handleDownloadReceipt = async (paymentId: string) => {
    try {
      // TODO: Implement receipt download
      toast.success('Receipt download started')
    } catch (error) {
      toast.error('Failed to download receipt')
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="ml-2">Loading payment history...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Payment History
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by payment ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>

          <Select value={subscriptionFilter} onValueChange={setSubscriptionFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Subscription" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subscriptions</SelectItem>
              {subscriptions.map(sub => (
                <SelectItem key={sub._id} value={sub._id}>
                  {sub.planType.charAt(0).toUpperCase() + sub.planType.slice(1)} - ₹{sub.amount}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Payment Table */}
        {filteredPayments.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Subscription</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment #</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.map((payment) => {
                  const StatusIcon = statusIcons[payment.status as keyof typeof statusIcons]
                  return (
                    <TableRow key={payment._id}>
                      <TableCell className="font-medium">
                        {formatDate(payment.createdAt)}
                      </TableCell>
                      <TableCell>
                        {getSubscriptionName(payment.subscriptionId)}
                      </TableCell>
                      <TableCell>₹{payment.amount}</TableCell>
                      <TableCell>
                        <Badge 
                          variant="secondary" 
                          className={statusColors[payment.status as keyof typeof statusColors]}
                        >
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>#{payment.paymentSequence}</TableCell>
                      <TableCell className="text-right">
                        {payment.status === 'completed' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownloadReceipt(payment._id)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Payment History</h3>
            <p className="text-muted-foreground">
              {payments.length === 0 
                ? "Your payment history will appear here once you have active subscriptions."
                : "No payments match your current filters."
              }
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}