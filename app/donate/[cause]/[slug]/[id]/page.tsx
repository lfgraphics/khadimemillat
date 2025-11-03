"use client";
import React, { useEffect, useState, use as useUnwrap } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';

interface DonationData {
  amount: string;
  donorName: string;
  email: string;
  cause: string;
  slug: string;
  id: string;
}

export default function DynamicDonationPage({
  params
}: {
  params: Promise<{ cause: string; slug: string; id: string }>
}) {
  // Unwrap Next.js params Promise per React 19 pattern
  const { cause, slug, id } = useUnwrap(params);
  const searchParams = useSearchParams();
  const [donationData, setDonationData] = useState<DonationData | null>(null);
  const [processing, setProcessing] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    // Read query string values from the URL
    const a = searchParams.get('amount') || '0';
    const d = searchParams.get('donor') || 'Anonymous';
    const e = searchParams.get('email') || '';

    setDonationData({
      amount: a,
      donorName: decodeURIComponent(d),
      email: decodeURIComponent(e),
      cause,
      slug,
      id
    });
  }, [searchParams, cause, slug, id]);

  const handleRazorpayPayment = async () => {
    if (!donationData) return;

    setProcessing(true);

    try {
      toast.info('Creating secure payment order...')

      // Create Razorpay order for donation
      const orderRes = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'donation',
          amount: parseFloat(donationData.amount),
          referenceId: donationData.id,
          email: donationData.email,
          phone: '' // Optional for donations
        })
      })

      if (!orderRes.ok) {
        const errorData = await orderRes.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `Order creation failed (${orderRes.status})`)
      }

      const order = await orderRes.json()

      // Dynamically load Razorpay checkout if not present
      if (typeof window !== 'undefined' && !(window as any).Razorpay) {
        toast.info('Loading secure payment gateway...')
        await new Promise<void>((resolve, reject) => {
          const script = document?.createElement('script')
          script.src = 'https://checkout.razorpay.com/v1/checkout.js'
          script.onload = () => resolve()
          script.onerror = () => reject(new Error('Failed to load Razorpay'))
          document?.head.appendChild(script)
        })
      }

      // Initialize Razorpay checkout
      const razorpay = new (window as any).Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency || 'INR',
        order_id: order.orderId,
        name: 'Khadim-e-Millat Welfare Foundation',
        description: `Donation for ${donationData.cause}`,
        image: '/favicon.ico', // Your organization logo
        prefill: {
          name: donationData.donorName,
          email: donationData.email,
        },
        theme: {
          color: '#3B82F6' // Your brand color
        },
        handler: async function (response: any) {
          try {
            toast.info('Verifying payment...')

            // Verify payment on server
            const verifyRes = await fetch('/api/razorpay/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'donation',
                orderId: order.orderId,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
                referenceId: donationData.id
              })
            })

            if (!verifyRes.ok) {
              const errorData = await verifyRes.json().catch(() => ({ error: 'Verification failed' }))
              throw new Error(errorData.error || 'Payment verification failed')
            }

            setCompleted(true)
            toast.success('🎉 Donation completed successfully!')
            toast.success('Thank you for your generous contribution!')

            // Show additional success message
            setTimeout(() => {
              toast.info('You will receive confirmation and receipt shortly.')
            }, 2000)

          } catch (error: any) {
            console.error('[PAYMENT_VERIFICATION_ERROR]', error)
            toast.error(error.message || 'Payment verification failed. Please contact support.')
          }
        },
        modal: {
          ondismiss: function () {
            toast.info('Payment cancelled by user')
            setProcessing(false)
          }
        }
      })

      // Add error handlers
      razorpay.on('payment.failed', function (response: any) {
        console.error('[PAYMENT_FAILED]', response.error)
        toast.error(response.error?.description || 'Payment failed. Please try again.')
        setProcessing(false)
      })

      // Open Razorpay checkout
      razorpay.open()

    } catch (error: any) {
      console.error('[DONATION_PAYMENT_ERROR]', error)
      toast.error(error.message || 'Failed to initiate payment. Please try again.')
      setProcessing(false)
    }
  }

  const handleDummyPayment = async () => {
    if (!donationData) return;

    setProcessing(true);

    try {
      // Simulate payment processing for testing
      toast.info('Processing demo payment...')
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Simulate successful payment and persist donation record
      try {
        if (donationData.id && !donationData.id.startsWith('dummy-')) {
          // Complete existing pending donation by ID
          await fetch(`/api/public/donations/${encodeURIComponent(donationData.id)}/complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentReference: donationData.id, paymentMethod: 'online' })
          })
        } else {
          // Fallback: record directly against campaign by slug (demo-only)
          await fetch(`/api/public/campaigns/${encodeURIComponent(donationData.slug)}/donations/complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              donorName: donationData.donorName,
              donorEmail: donationData.email,
              amount: parseFloat(donationData.amount),
              paymentReference: donationData.id,
              paymentMethod: 'online'
            })
          })
        }
      } catch (e) {
        console.warn('[DONATION_RECORD_FAILED]', e)
      }

      setCompleted(true);
      toast.success('Demo donation completed successfully!');

    } catch (error) {
      toast.error('Demo payment processing failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const getCauseDisplayName = (cause: string) => {
    const causeMap: Record<string, string> = {
      'education': 'Education Support',
      'healthcare': 'Healthcare Initiatives',
      'environment': 'Environmental Projects',
      'community': 'Community Development',
      'emergency': 'Emergency Relief'
    };
    return causeMap[cause] || cause.charAt(0).toUpperCase() + cause.slice(1);
  };

  if (!donationData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (completed) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <CardTitle className="text-green-800">Donation Successful!</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-background p-4 rounded-lg border">
                <h3 className="font-semibold text-muted-foreground mb-2">Donation Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Donor Name:</span>
                    <span className="font-medium">{donationData.donorName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email:</span>
                    <span className="font-medium">{donationData.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cause:</span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">{getCauseDisplayName(donationData.cause)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount:</span>
                    <span className="font-bold text-green-600">${donationData.amount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Transaction ID:</span>
                    <span className="font-mono text-xs">{donationData.id}</span>
                  </div>
                </div>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground mb-4">Thank you for your generous donation!</p>
                <p className="text-xs text-gray-500">
                  A confirmation email has been sent to {donationData.email}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Complete Your Donation</CardTitle>
            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">{getCauseDisplayName(donationData.cause)}</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Donation Summary */}
            <div className="border p-4 rounded-lg">
              <h3 className="font-semibold text-muted-foreground mb-3">Donation Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Donor:</span>
                  <span className="font-medium">{donationData.donorName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email:</span>
                  <span className="font-medium">{donationData.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Campaign:</span>
                  <span className="font-medium capitalize">{donationData.slug.replace('-', ' ')}</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span className="text-muted-foreground">Total Amount:</span>
                  <span className="text-green-600">₹{donationData.amount}</span>
                </div>
              </div>
            </div>

            {/* Payment Method Selection */}
            <div className="space-y-3">
              <h3 className="font-semibold text-muted-foreground">Select Payment Method</h3>
              <div className="grid gap-3">
                <div className="p-4 border-2 border-primary rounded-lg bg-primary/5">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-4 h-4 rounded-full bg-primary"></div>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-primary">Secure Online Payment</p>
                      <p className="text-sm text-muted-foreground">Credit/Debit Card, UPI, Net Banking via Razorpay</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">Recommended</span>
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Instant Receipt</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-4">
              <Button
                onClick={handleRazorpayPayment}
                disabled={processing}
                className="w-full bg-primary hover:bg-primary/90 text-white py-3 text-lg"
                size="lg"
              >
                {processing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Processing Payment...
                  </>
                ) : (
                  <>
                    🔒 Secure Donate ₹{donationData.amount}
                  </>
                )}
              </Button>

              {/* Demo option for testing */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-muted-foreground/20" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">For Testing Only</span>
                </div>
              </div>

              <Button
                onClick={handleDummyPayment}
                disabled={processing}
                variant="outline"
                className="w-full"
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Processing Demo...
                  </>
                ) : (
                  `Demo Payment ₹${donationData.amount}`
                )}
              </Button>

              <Button
                variant="ghost"
                onClick={() => window.history.back()}
                disabled={processing}
                className="w-full"
              >
                Cancel
              </Button>
            </div>

            {/* Security Notice */}
            <div className="text-xs text-center p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="font-medium text-green-800">🔒 Your payment is secure</p>
              <p className="text-green-700">We use industry-standard encryption to protect your information</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}