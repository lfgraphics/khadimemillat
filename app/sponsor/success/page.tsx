"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Heart, ArrowRight, Home } from "lucide-react";
import Link from "next/link";

export default function SponsorshipSuccessPage() {
  const searchParams = useSearchParams();
  const subscriptionId = searchParams.get('subscription');
  const [loading, setLoading] = useState(true);
  const [sponsorship, setSponsorship] = useState<any>(null);

  useEffect(() => {
    if (subscriptionId) {
      fetchSponsorshipDetails();
    } else {
      setLoading(false);
    }
  }, [subscriptionId]);

  const fetchSponsorshipDetails = async () => {
    try {
      const response = await fetch(`/api/sponsor/sponsorship/${subscriptionId}`);
      if (response.ok) {
        const data = await response.json();
        setSponsorship(data.sponsorship);
      }
    } catch (error) {
      console.error('Error fetching sponsorship details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-center">
          <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-48 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <Card className="text-center shadow-lg">
          <CardHeader className="pb-4">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <CardTitle className="text-3xl font-bold text-gray-900 mb-2">
              Sponsorship Activated! 🎉
            </CardTitle>
            <p className="text-gray-600 text-lg">
              Thank you for your generosity. Your sponsorship is now active and will help transform a family's life.
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {sponsorship && (
              <div className="bg-blue-50 rounded-lg p-6">
                <h3 className="font-semibold text-blue-900 mb-3">Sponsorship Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-blue-700">Category</span>
                    <p className="font-medium text-blue-900">{sponsorship.categoryName}</p>
                  </div>
                  <div>
                    <span className="text-blue-700">Monthly Amount</span>
                    <p className="font-medium text-blue-900">₹{sponsorship.monthlyAmount?.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-blue-700">Family</span>
                    <p className="font-medium text-blue-900">{sponsorship.beneficiaryName}</p>
                  </div>
                  <div>
                    <span className="text-blue-700">Next Payment</span>
                    <p className="font-medium text-blue-900">
                      {sponsorship.nextPaymentDate ? new Date(sponsorship.nextPaymentDate).toLocaleDateString() : 'Next month'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-3">What Happens Next?</h3>
              <ul className="text-left text-gray-700 space-y-2">
                <li className="flex items-start gap-2">
                  <Heart className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <span>Your first payment has been processed successfully</span>
                </li>
                <li className="flex items-start gap-2">
                  <Heart className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <span>Monthly payments will be automatically charged on the same date</span>
                </li>
                <li className="flex items-start gap-2">
                  <Heart className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <span>You'll receive quarterly updates on your sponsored family's progress</span>
                </li>
                <li className="flex items-start gap-2">
                  <Heart className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <span>You can manage your sponsorship anytime from your dashboard</span>
                </li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg">
                <Link href="/dashboard">
                  <Home className="w-4 h-4 mr-2" />
                  Go to Dashboard
                </Link>
              </Button>
              <Button variant="outline" asChild size="lg">
                <Link href="/sponsor">
                  <Heart className="w-4 h-4 mr-2" />
                  Sponsor Another Family
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>

            <div className="text-center text-sm text-gray-600">
              <p>
                Questions about your sponsorship? 
                <Link href="/contact" className="text-blue-600 hover:underline ml-1">
                  Contact our support team
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}