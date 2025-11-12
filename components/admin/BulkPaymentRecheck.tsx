"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
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

interface BulkRecheckSummary {
  total: number
  successful: number
  failed: number
}

interface BulkPaymentRecheckProps {
  selectedDonations: string[]
  onRecheckComplete: (results: PaymentRecheckResult[]) => void
  onClose?: () => void
}

export default function BulkPaymentRecheck({
  selectedDonations,
  onRecheckComplete,
  onClose
}: BulkPaymentRecheckProps) {
  const [isRechecking, setIsRechecking] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentMessage, setCurrentMessage] = useState('')
  const [results, setResults] = useState<PaymentRecheckResult[]>([])
  const [summary, setSummary] = useState<BulkRecheckSummary | null>(null)

  const handleBulkRecheck = async () => {
    if (selectedDonations.length === 0) {
      toast.error('No donations selected for recheck')
      return
    }

    setIsRechecking(true)
    setProgress(0)
    setCurrentMessage('Starting bulk payment recheck...')
    setResults([])
    setSummary(null)

    try {
      const response = await fetch('/api/protected/admin/donations/bulk-recheck-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          donationIds: selectedDonations
        })
      })

      if (!response.ok) {
        throw new Error('Failed to start bulk payment recheck')
      }

      // Read the streaming response
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n').filter(line => line.trim())

          for (const line of lines) {
            try {
              const data = JSON.parse(line)
              
              if (data.type === 'progress') {
                const progressPercent = (data.completed / data.total) * 100
                setProgress(progressPercent)
                setCurrentMessage(data.message || `Processing ${data.completed} of ${data.total}...`)
              } else if (data.type === 'complete') {
                setResults(data.results)
                setSummary(data.summary)
                onRecheckComplete(data.results)
                
                const { successful, failed, total } = data.summary
                toast.success(
                  `Bulk recheck completed! ${successful} successful, ${failed} failed out of ${total} total.`
                )
              } else if (data.type === 'error') {
                throw new Error(data.error)
              }
            } catch (parseError) {
              // Ignore malformed JSON lines
              console.warn('Failed to parse streaming response line:', line)
            }
          }
        }
      }
    } catch (error) {
      toast.error(`Error during bulk recheck: ${(error as Error).message}`)
      setCurrentMessage(`Error: ${(error as Error).message}`)
    } finally {
      setIsRechecking(false)
    }
  }

  const getStatusIcon = (success: boolean) => {
    if (success) {
      return <CheckCircle className="h-4 w-4 text-green-600" />
    } else {
      return <XCircle className="h-4 w-4 text-red-600" />
    }
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Bulk Payment Recheck
        </CardTitle>
        <CardDescription>
          {selectedDonations.length} donations selected for payment verification recheck
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Action Button */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            This will verify payment status with Razorpay for all selected donations
          </div>
          
          <div className="flex gap-2">
            {onClose && (
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isRechecking}
              >
                Cancel
              </Button>
            )}
            
            <Button
              onClick={handleBulkRecheck}
              disabled={isRechecking || selectedDonations.length === 0}
            >
              {isRechecking ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Rechecking...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Start Recheck
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Progress Section */}
        {isRechecking && (
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="w-full" />
            <div className="text-sm text-muted-foreground">
              {currentMessage}
            </div>
          </div>
        )}

        {/* Summary Section */}
        {summary && (
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Recheck Complete
            </h4>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{summary.total}</div>
                <div className="text-sm text-blue-800">Total Processed</div>
              </div>
              
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{summary.successful}</div>
                <div className="text-sm text-green-800">Successful</div>
              </div>
              
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{summary.failed}</div>
                <div className="text-sm text-red-800">Failed</div>
              </div>
            </div>
          </div>
        )}

        {/* Results Section */}
        {results.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium">Detailed Results</h4>
            
            <div className="max-h-60 overflow-y-auto space-y-2">
              {results.map((result, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 border rounded-lg text-sm"
                >
                  <div className="flex items-center gap-2">
                    {getStatusIcon(result.recheckSuccess)}
                    <span className="font-mono text-xs">
                      {result.paymentId || 'Unknown Payment'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {result.recheckSuccess ? (
                      <>
                        <Badge variant="outline" className="text-xs">
                          {result.previousStatus}
                        </Badge>
                        <span className="text-muted-foreground">→</span>
                        <Badge 
                          variant={result.currentStatus === 'completed' ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {result.currentStatus}
                        </Badge>
                      </>
                    ) : (
                      <Badge variant="destructive" className="text-xs">
                        {result.errorMessage || 'Failed'}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Warning */}
        {!isRechecking && !summary && (
          <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <strong>Note:</strong> This operation will query Razorpay for each selected donation 
              and update payment statuses accordingly. This may take several minutes for large batches.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}