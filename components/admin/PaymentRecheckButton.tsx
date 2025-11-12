"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, Loader2, Info, CheckCircle, XCircle } from 'lucide-react'
import { toast } from 'sonner'

interface PaymentRecheckResult {
  paymentId: string
  previousStatus: string
  currentStatus: string
  razorpayResponse: any
  updatedAt: Date
  recheckSuccess: boolean
  errorMessage?: string
}

interface CampaignDonation {
  _id: string
  razorpayPaymentId?: string
  paymentVerified?: boolean
  status: string
}

interface PaymentRecheckButtonProps {
  donation: CampaignDonation
  onRecheckComplete: (result: PaymentRecheckResult) => void
  disabled?: boolean
  size?: 'sm' | 'default' | 'lg'
  variant?: 'default' | 'outline' | 'ghost'
}

export default function PaymentRecheckButton({
  donation,
  onRecheckComplete,
  disabled = false,
  size = 'sm',
  variant = 'outline'
}: PaymentRecheckButtonProps) {
  const [isRechecking, setIsRechecking] = useState(false)
  const [recheckResult, setRecheckResult] = useState<PaymentRecheckResult | null>(null)

  const handleRecheck = async () => {
    if (!donation.razorpayPaymentId) {
      toast.error('No Razorpay payment ID found for this donation')
      return
    }

    setIsRechecking(true)
    try {
      const response = await fetch('/api/protected/admin/donations/recheck-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          donationId: donation._id,
          paymentId: donation.razorpayPaymentId
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.details || 'Failed to recheck payment status')
      }

      const data = await response.json()
      const result: PaymentRecheckResult = data.result
      
      setRecheckResult(result)
      onRecheckComplete(result)

      if (result.recheckSuccess) {
        if (result.previousStatus !== result.currentStatus) {
          toast.success(`Payment status updated from ${result.previousStatus} to ${result.currentStatus}`)
        } else {
          toast.success('Payment status confirmed - no changes needed')
        }
      } else {
        toast.error(`Payment recheck failed: ${result.errorMessage}`)
      }
    } catch (error) {
      toast.error(`Error rechecking payment: ${(error as Error).message}`)
    } finally {
      setIsRechecking(false)
    }
  }

  const shouldShowRecheck = !donation.paymentVerified || donation.status === 'pending'

  if (!shouldShowRecheck) {
    return null
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={handleRecheck}
        disabled={disabled || isRechecking}
        size={size}
        variant={variant}
      >
        {isRechecking ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Rechecking...
          </>
        ) : (
          <>
            <RefreshCw className="h-4 w-4 mr-2" />
            Recheck Payment
          </>
        )}
      </Button>

      {recheckResult && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm">
              {recheckResult.recheckSuccess ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h4 className="font-medium">Recheck Result</h4>
                <Badge variant={recheckResult.recheckSuccess ? "default" : "destructive"}>
                  {recheckResult.recheckSuccess ? "Success" : "Failed"}
                </Badge>
              </div>
              
              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Previous Status:</span>
                  <Badge variant="outline">{recheckResult.previousStatus}</Badge>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Status:</span>
                  <Badge variant={recheckResult.currentStatus === 'completed' ? "default" : "secondary"}>
                    {recheckResult.currentStatus}
                  </Badge>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Updated:</span>
                  <span>{new Date(recheckResult.updatedAt).toLocaleString()}</span>
                </div>
                
                {recheckResult.errorMessage && (
                  <div className="p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
                    <strong>Error:</strong> {recheckResult.errorMessage}
                  </div>
                )}
                
                {recheckResult.razorpayResponse && (
                  <div className="p-2 bg-gray-50 border rounded text-xs">
                    <strong>Razorpay Status:</strong> {recheckResult.razorpayResponse.status}
                    <br />
                    <strong>Payment ID:</strong> {recheckResult.razorpayResponse.id}
                  </div>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  )
}