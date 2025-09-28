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

  const handleDummyPayment = async () => {
    if (!donationData) return;
    
    setProcessing(true);
    
    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate successful payment
      setCompleted(true);
      toast.success('Donation completed successfully!');
      
      // In a real implementation, you would:
      // 1. Send data to your payment processor (Stripe, PayPal, etc.)
      // 2. Create a donation record in your database
      // 3. Send confirmation email
      // 4. Redirect to success page or show confirmation
      
    } catch (error) {
      toast.error('Payment processing failed. Please try again.');
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
              <h3 className="font-semibold text-muted-foreground">Payment Method</h3>
              <div className="grid gap-3">
                <div className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <input type="radio" name="payment" defaultChecked className="text-blue-600" />
                    <div>
                      <p className="font-medium">Credit/Debit Card</p>
                      <p className="text-xs text-gray-500">Visa, Mastercard, American Express</p>
                    </div>
                  </div>
                </div>
                <div className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <input type="radio" name="payment" className="text-blue-600" />
                    <div>
                      <p className="font-medium">PayPal</p>
                      <p className="text-xs text-gray-500">Pay with your PayPal account</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Dummy Payment Form */}
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Card Number</label>
                <Input
                  placeholder="4242 4242 4242 4242" 
                  className="font-mono"
                  defaultValue="4242 4242 4242 4242"
                />
                <p className="text-xs text-gray-500">Use any valid test card number</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Expiry Date</label>
                  <Input 
                    placeholder="MM/YY" 
                    defaultValue="12/25"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold">CVC</label>
                  <Input 
                    placeholder="123" 
                    defaultValue="123"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button 
                onClick={handleDummyPayment}
                disabled={processing}
                className="flex-1"
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  `Donate ₹${donationData.amount}`
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.history.back()}
                disabled={processing}
              >
                Cancel
              </Button>
            </div>

            {/* Demo Notice */}
            <div className="text-xs text-gray-500 text-center p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="font-medium">Demo Environment</p>
              <p>This is a demonstration page. In production, this would integrate with a real payment processor like Stripe or PayPal.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}