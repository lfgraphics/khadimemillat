"use client";

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { OfflineDonationReceipt } from '@/components/cash-intake/OfflineDonationReceipt';
import { Loader2 } from 'lucide-react';

interface OfflineDonationData {
  _id: string;
  donorName: string;
  donorNumber?: string;
  amount: number;
  notes?: string;
  receivedAt: string;
  collectedBy: {
    name: string;
    userId: string;
  };
  createdAt: string;
}

export default function ReceiptPage() {
  const searchParams = useSearchParams();
  const donationId = searchParams.get('id');
  
  const [donation, setDonation] = useState<OfflineDonationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDonation() {
      if (!donationId) {
        setError('No donation ID provided');
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/cash-intake/receipt/${donationId}`);
        const data = await res.json();

        if (data.success) {
          setDonation(data.donation);
        } else {
          setError(data.error || 'Failed to load donation');
        }
      } catch (err) {
        setError('Network error. Please try again.');
        console.error('Receipt fetch error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchDonation();
  }, [donationId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading receipt...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md p-6 border border-destructive rounded-lg">
          <h1 className="text-lg font-semibold text-destructive mb-2">Error Loading Receipt</h1>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <button
            onClick={() => window.close()}
            className="px-4 py-2 rounded border text-sm"
          >
            Close Window
          </button>
        </div>
      </div>
    );
  }

  if (!donation) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">No donation data available</p>
        </div>
      </div>
    );
  }

  return <OfflineDonationReceipt donation={donation} />;
}
