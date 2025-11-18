"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  Heart, 
  Users, 
  Calendar,
  MapPin,
  CreditCard,
  Shield,
  CheckCircle
} from "lucide-react";
import Link from "next/link";
import Script from "next/script";

interface Beneficiary {
  _id: string;
  age: number;
  relationship: string;
  healthStatus: string;
  hasDisability: boolean;
  familySize?: number;
  dependentsCount?: number;
  sponsorship: {
    availableForSponsorship: boolean;
    category: string;
    monthlyRequirement: number;
    description?: string;
  };
}

interface Category {
  _id: string;
  slug: string;
  label: string;
  description: string;
  defaultMonthlyAmount: number;
}

export default function BeneficiarySponsorshipPage() {
  const params = useParams();
  const router = useRouter();
  const { isSignedIn, userId } = useAuth();
  
  const [beneficiary, setBeneficiary] = useState<Beneficiary | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [sponsoring, setSponsoring] = useState(false);
  
  // Form state
  const [monthlyAmount, setMonthlyAmount] = useState(0);
  const [sponsorNotes, setSponsorNotes] = useState("");

  const beneficiaryId = params.id as string;

  useEffect(() => {
    fetchBeneficiaryDetails();
  }, [beneficiaryId]);

  const fetchBeneficiaryDetails = async () => {
    try {
      const response = await fetch(`/api/sponsor/beneficiary/${beneficiaryId}`);
      if (response.ok) {
        const data = await response.json();
        setBeneficiary(data.beneficiary);
        setCategory(data.category);
        setMonthlyAmount(data.beneficiary.sponsorship.monthlyRequirement || data.category.defaultMonthlyAmount);
      } else {
        toast.error("Failed to load beneficiary details");
        router.push("/sponsor");
      }
    } catch (error) {
      console.error("Error fetching beneficiary:", error);
      toast.error("Error loading beneficiary details");
      router.push("/sponsor");
    } finally {
      setLoading(false);
    }
  };

  const handleSponsorshipSubmit = async () => {
    if (!isSignedIn) {
      toast.error("Please sign in to sponsor a family");
      return;
    }

    if (monthlyAmount < (beneficiary?.sponsorship.monthlyRequirement || 0)) {
      toast.error(`Minimum monthly amount is ₹${beneficiary?.sponsorship.monthlyRequirement?.toLocaleString()}`);
      return;
    }

    setSponsoring(true);
    try {
      const response = await fetch("/api/sponsor/create-sponsorship", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
        cache: "no-store",
        body: JSON.stringify({
          beneficiaryId,
          monthlyAmount,
          notes: sponsorNotes
        }),
      });

      const data = await response.json();
      console.log('Full API Response:', {
        status: response.status,
        ok: response.ok,
        data: data
      });

      if (response.ok && data.success) {
        console.log('SUCCESS: API response is OK and data.success is true');
        toast.success("Sponsorship created successfully! Opening payment...");
        
        // Show message if resuming existing sponsorship
        if (data.resumed) {
          toast.info("Resuming your previous sponsorship attempt");
        }
        
        // Redirect to Razorpay payment
        if (data.razorpayOptions) {
          console.log('Opening Razorpay checkout with options:', data.razorpayOptions);
          
          // Check if Razorpay is loaded
          if (typeof (window as any).Razorpay === 'undefined') {
            console.error('Razorpay script not loaded');
            toast.error("Payment system not loaded. Please refresh the page and try again.");
            setSponsoring(false);
            return;
          }

          try {
            const options = {
              ...data.razorpayOptions,
              handler: function (response: any) {
                console.log('Payment successful:', response);
                // Payment successful, redirect to success page
                router.push(`/sponsor/success?subscription=${data.subscriptionId}`);
              },
              modal: {
                ondismiss: function() {
                  console.log('Payment modal dismissed');
                  setSponsoring(false);
                }
              }
            };

            console.log('Creating Razorpay instance with options:', options);
            const rzp = new (window as any).Razorpay(options);
            console.log('Razorpay instance created, opening checkout...');
            rzp.open();
          } catch (razorpayError) {
            console.error('Error creating Razorpay instance:', razorpayError);
            toast.error("Failed to open payment checkout. Please try again.");
            setSponsoring(false);
          }
        } else {
          console.error('No razorpayOptions in response:', data);
          toast.error("Payment setup failed - no payment options received");
          setSponsoring(false);
        }
      } else {
        console.error('API error response:', {
          status: response.status,
          statusText: response.statusText,
          data: data
        });
        
        // Check if it's the specific "already sponsoring" error
        if (data.error && data.error.includes('already')) {
          toast.error("You have a pending sponsorship for this person. Please complete the payment or wait for it to expire.");
        } else {
          toast.error(data.error || "Failed to create sponsorship");
        }
        setSponsoring(false);
      }
    } catch (error) {
      console.error("Error creating sponsorship:", error);
      toast.error("Error creating sponsorship");
      setSponsoring(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!beneficiary || !category) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="text-center py-12">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Beneficiary Not Found</h3>
            <p className="text-gray-600 mb-4">This family may no longer be available for sponsorship.</p>
            <Button asChild>
              <Link href="/sponsor">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Browse Other Families
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" asChild className="mb-4">
            <Link href={`/sponsor/category/${category.slug}`}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to {category.label}
            </Link>
          </Button>
          
          <div className="bg-card rounded-lg p-6 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold mb-2">
                  Sponsor This Person
                </h1>
                <p className="text-muted-foreground">
                  Help transform lives through monthly sponsorship
                </p>
              </div>
              <Badge variant="secondary">
                {category.label}
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Family Details */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Family Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-gray-600">Relationship</Label>
                    <p className="font-medium capitalize">{beneficiary.relationship}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">Age</Label>
                    <p className="font-medium">{beneficiary.age} years</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">Family Size</Label>
                    <p className="font-medium">{beneficiary.familySize || 'N/A'} members</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">Health Status</Label>
                    <p className="font-medium capitalize">{beneficiary.healthStatus}</p>
                  </div>
                </div>

                {beneficiary.hasDisability && (
                  <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-orange-600" />
                      <span className="text-sm font-medium text-orange-800">Special Needs Family</span>
                    </div>
                    <p className="text-sm text-orange-700 mt-1">
                      This family has special care requirements and needs additional support.
                    </p>
                  </div>
                )}

                <div>
                  <Label className="text-sm text-gray-600">Support Needed</Label>
                  <p className="text-gray-800 leading-relaxed">
                    {beneficiary.sponsorship.description || 
                     `This ${beneficiary.relationship} and their family need support for ${category.label.toLowerCase()}. Your monthly contribution will help improve their living conditions and provide essential resources.`}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Sponsorship Setup */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="w-5 h-5" />
                  Set Up Your Sponsorship
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="monthlyAmount">Monthly Sponsorship Amount (₹)</Label>
                  <Input
                    id="monthlyAmount"
                    type="number"
                    value={monthlyAmount}
                    onChange={(e) => setMonthlyAmount(Number(e.target.value))}
                    min={beneficiary.sponsorship.monthlyRequirement}
                    className="text-lg font-medium"
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    Minimum required: ₹{beneficiary.sponsorship.monthlyRequirement?.toLocaleString()}
                  </p>
                </div>

                <div>
                  <Label htmlFor="sponsorNotes">Personal Message (Optional)</Label>
                  <Textarea
                    id="sponsorNotes"
                    value={sponsorNotes}
                    onChange={(e) => setSponsorNotes(e.target.value)}
                    placeholder="Share why you want to sponsor this family..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sponsorship Summary */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Sponsorship Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Category</span>
                  <span className="font-medium">{category.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Monthly Amount</span>
                  <span className="font-bold text-lg">₹{monthlyAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">First Payment</span>
                  <span className="font-medium">₹{monthlyAmount.toLocaleString()}</span>
                </div>
                
                <div className="border-t pt-4">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total Today</span>
                    <span>₹{monthlyAmount.toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Then ₹{monthlyAmount.toLocaleString()} monthly
                  </p>
                </div>

                <Button 
                  onClick={handleSponsorshipSubmit}
                  disabled={sponsoring || !isSignedIn}
                  className="w-full"
                  size="lg"
                >
                  {sponsoring ? (
                    "Processing..."
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      {isSignedIn ? "Start Sponsorship" : "Sign In to Sponsor"}
                    </>
                  )}
                </Button>

                {!isSignedIn && (
                  <p className="text-sm text-center text-gray-600">
                    <Link href="/sign-in" className="text-blue-600 hover:underline">
                      Sign in
                    </Link> to sponsor this family
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Security Info */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-800">Secure & Transparent</span>
                </div>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Payments secured by Razorpay</li>
                  <li>• 100% fund transparency</li>
                  <li>• Regular progress updates</li>
                  <li>• Cancel anytime</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Load Razorpay Script */}
      <Script 
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
        onLoad={() => {
          console.log('Razorpay script loaded successfully');
        }}
        onError={() => {
          console.error('Failed to load Razorpay script');
        }}
      />
    </div>
  );
}