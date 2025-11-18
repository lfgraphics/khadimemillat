"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft,
  Heart, 
  Calendar, 
  DollarSign,
  User,
  MapPin,
  Phone,
  Pause,
  Play,
  X,
  Download,
  CreditCard
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface SponsorshipDetails {
  _id: string;
  beneficiaryName: string;
  categoryName: string;
  monthlyAmount: number;
  totalPaid: number;
  paymentCount: number;
  status: string;
  startDate: string;
  nextPaymentDate?: string;
  lastPaymentDate?: string;
  beneficiaryId: string;
  description: string;
  notes?: string;
  payments: Array<{
    _id: string;
    amount: number;
    status: string;
    paymentDate: string;
    razorpayPaymentId: string;
  }>;
}

export default function SponsorshipDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const [sponsorship, setSponsorship] = useState<SponsorshipDetails | null>(null);
  const [loading, setLoading] = useState(true);

  const sponsorshipId = params.sponsorshipId as string;

  useEffect(() => {
    if (isSignedIn) {
      fetchSponsorshipDetails();
    }
  }, [isSignedIn, sponsorshipId]);

  const fetchSponsorshipDetails = async () => {
    try {
      const response = await fetch(`/api/my-sponsorships/${sponsorshipId}`);
      if (response.ok) {
        const data = await response.json();
        setSponsorship(data.sponsorship);
      } else {
        toast.error("Failed to load sponsorship details");
        router.push("/my-sponsorships");
      }
    } catch (error) {
      console.error("Error fetching sponsorship:", error);
      toast.error("Error loading sponsorship details");
      router.push("/my-sponsorships");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: 'pause' | 'resume' | 'cancel') => {
    if (action === 'cancel' && !confirm("Are you sure you want to cancel this sponsorship? This action cannot be undone.")) {
      return;
    }

    try {
      const response = await fetch(`/api/my-sponsorships/${sponsorshipId}/${action}`, {
        method: 'POST'
      });
      
      if (response.ok) {
        toast.success(`Sponsorship ${action}d successfully`);
        fetchSponsorshipDetails(); // Refresh the details
      } else {
        const data = await response.json();
        toast.error(data.error || `Failed to ${action} sponsorship`);
      }
    } catch (error) {
      toast.error(`Error ${action}ing sponsorship`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isSignedIn) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="text-center py-12">
            <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Sign In Required</h3>
            <p className="text-muted-foreground mb-4">Please sign in to view sponsorship details.</p>
            <Button asChild>
              <Link href="/sign-in">Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-64 bg-muted rounded"></div>
          <div className="h-48 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!sponsorship) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="text-center py-12">
            <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Sponsorship Not Found</h3>
            <p className="text-muted-foreground mb-4">The sponsorship you're looking for doesn't exist.</p>
            <Button asChild>
              <Link href="/my-sponsorships">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to My Sponsorships
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
            <Link href="/my-sponsorships">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to My Sponsorships
            </Link>
          </Button>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
                <Heart className="w-8 h-8 text-red-500" />
                {sponsorship.beneficiaryName}
              </h1>
              <p className="text-muted-foreground text-lg">
                {sponsorship.categoryName} Sponsorship
              </p>
            </div>
            <Badge className={getStatusColor(sponsorship.status)}>
              {sponsorship.status.charAt(0).toUpperCase() + sponsorship.status.slice(1)}
            </Badge>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Sponsorship Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Sponsorship Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">Monthly Amount</span>
                    <p className="text-2xl font-bold text-primary">₹{sponsorship.monthlyAmount.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Total Contributed</span>
                    <p className="text-2xl font-bold text-green-600">₹{sponsorship.totalPaid.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Payments Made</span>
                    <p className="text-2xl font-bold">{sponsorship.paymentCount}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Duration</span>
                    <p className="text-2xl font-bold">{sponsorship.paymentCount} months</p>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-muted-foreground">{sponsorship.description}</p>
                  
                  {sponsorship.notes && (
                    <div className="mt-4">
                      <h4 className="font-medium mb-2">Your Message</h4>
                      <p className="text-muted-foreground italic">"{sponsorship.notes}"</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Payment History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Payment History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sponsorship.payments && sponsorship.payments.length > 0 ? (
                  <div className="space-y-3">
                    {sponsorship.payments.map((payment) => (
                      <div key={payment._id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div>
                          <p className="font-medium">₹{payment.amount.toLocaleString()}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(payment.paymentDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant={payment.status === 'paid' ? 'default' : 'destructive'}>
                            {payment.status}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {payment.razorpayPaymentId}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No payment history available
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Started</span>
                  <span className="font-medium">{new Date(sponsorship.startDate).toLocaleDateString()}</span>
                </div>
                
                {sponsorship.lastPaymentDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Payment</span>
                    <span className="font-medium">{new Date(sponsorship.lastPaymentDate).toLocaleDateString()}</span>
                  </div>
                )}
                
                {sponsorship.nextPaymentDate && sponsorship.status === 'active' && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Next Payment</span>
                    <span className="font-medium">{new Date(sponsorship.nextPaymentDate).toLocaleDateString()}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Manage Sponsorship</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {sponsorship.status === 'active' && (
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => handleAction('pause')}
                  >
                    <Pause className="w-4 h-4 mr-2" />
                    Pause Sponsorship
                  </Button>
                )}
                
                {sponsorship.status === 'paused' && (
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => handleAction('resume')}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Resume Sponsorship
                  </Button>
                )}
                
                {['active', 'paused'].includes(sponsorship.status) && (
                  <Button 
                    variant="outline" 
                    className="w-full text-red-600 hover:text-red-700"
                    onClick={() => handleAction('cancel')}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel Sponsorship
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}