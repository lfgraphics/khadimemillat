"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Heart, 
  Calendar, 
  DollarSign,
  User,
  MapPin,
  Phone,
  Pause,
  Play,
  X,
  Eye,
  Loader2
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface Sponsorship {
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
}

export default function MySponsorshipsPage() {
  const { isSignedIn, userId } = useAuth();
  const [sponsorships, setSponsorships] = useState<Sponsorship[]>([]);
  const [loading, setLoading] = useState(true);
  const [fixing, setFixing] = useState(false);

  useEffect(() => {
    if (isSignedIn) {
      fetchSponsorships();
    }
  }, [isSignedIn]);

  const fetchSponsorships = async () => {
    try {
      const response = await fetch("/api/my-sponsorships");
      if (response.ok) {
        const data = await response.json();
        setSponsorships(data.sponsorships || []);
      } else {
        toast.error("Failed to load sponsorships");
      }
    } catch (error) {
      console.error("Error fetching sponsorships:", error);
      toast.error("Error loading sponsorships");
    } finally {
      setLoading(false);
    }
  };

  const handlePauseResume = async (sponsorshipId: string, action: 'pause' | 'resume') => {
    try {
      const response = await fetch(`/api/my-sponsorships/${sponsorshipId}/${action}`, {
        method: 'POST'
      });
      
      if (response.ok) {
        toast.success(`Sponsorship ${action}d successfully`);
        fetchSponsorships(); // Refresh the list
      } else {
        const data = await response.json();
        toast.error(data.error || `Failed to ${action} sponsorship`);
      }
    } catch (error) {
      toast.error(`Error ${action}ing sponsorship`);
    }
  };

  const handleCancel = async (sponsorshipId: string) => {
    if (!confirm("Are you sure you want to cancel this sponsorship? This action cannot be undone.")) {
      return;
    }

    try {
      const response = await fetch(`/api/my-sponsorships/${sponsorshipId}/cancel`, {
        method: 'POST'
      });
      
      if (response.ok) {
        toast.success("Sponsorship cancelled successfully");
        fetchSponsorships(); // Refresh the list
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to cancel sponsorship");
      }
    } catch (error) {
      toast.error("Error cancelling sponsorship");
    }
  };

  const handleFixStatus = async () => {
    setFixing(true);
    
    try {
      const response = await fetch('/api/my-sponsorships/fix-status', {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success(data.message);
        fetchSponsorships(); // Refresh the list
      } else {
        toast.error(data.error || 'Failed to fix sponsorship status');
      }
    } catch (error) {
      console.error('Error fixing sponsorship status:', error);
      toast.error('Failed to fix sponsorship status');
    } finally {
      setFixing(false);
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
            <p className="text-muted-foreground mb-4">Please sign in to view your sponsorships.</p>
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
          <div className="grid gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">My Sponsorships</h1>
              <p className="text-muted-foreground">
                Manage your sponsorships and track your impact
              </p>
            </div>
            
            {sponsorships.some(s => s.status === 'pending' || s.status === 'created') && (
              <Button
                onClick={handleFixStatus}
                disabled={fixing}
                variant="outline"
              >
                {fixing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Fixing...
                  </>
                ) : (
                  'Fix Status Issues'
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        {sponsorships.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-primary">
                  {sponsorships.length}
                </div>
                <div className="text-sm text-muted-foreground">
                  Total Sponsorships
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {sponsorships.filter(s => s.status === 'active').length}
                </div>
                <div className="text-sm text-muted-foreground">
                  Active
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-primary">
                  ₹{sponsorships.reduce((total, s) => total + s.totalPaid, 0).toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">
                  Total Contributed
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-primary">
                  ₹{sponsorships.filter(s => s.status === 'active').reduce((total, s) => total + s.monthlyAmount, 0).toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">
                  Monthly Commitment
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Sponsorships List */}
        {sponsorships.length > 0 ? (
          <div className="grid gap-6">
            {sponsorships.map((sponsorship) => (
              <Card key={sponsorship._id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Heart className="w-5 h-5 text-red-500" />
                        {sponsorship.beneficiaryName}
                      </CardTitle>
                      <p className="text-muted-foreground">
                        {sponsorship.categoryName}
                      </p>
                    </div>
                    <Badge className={getStatusColor(sponsorship.status)}>
                      {sponsorship.status.charAt(0).toUpperCase() + sponsorship.status.slice(1)}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Payment Info */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Monthly Amount</span>
                      <p className="font-medium">₹{sponsorship.monthlyAmount.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total Paid</span>
                      <p className="font-medium">₹{sponsorship.totalPaid.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Payments Made</span>
                      <p className="font-medium">{sponsorship.paymentCount}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Started</span>
                      <p className="font-medium">{new Date(sponsorship.startDate).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {/* Next Payment */}
                  {sponsorship.nextPaymentDate && sponsorship.status === 'active' && (
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4" />
                        <span>Next payment: {new Date(sponsorship.nextPaymentDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-4 border-t">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/my-sponsorships/${sponsorship._id}`}>
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </Link>
                    </Button>
                    
                    {sponsorship.status === 'active' && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handlePauseResume(sponsorship._id, 'pause')}
                      >
                        <Pause className="w-4 h-4 mr-2" />
                        Pause
                      </Button>
                    )}
                    
                    {sponsorship.status === 'paused' && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handlePauseResume(sponsorship._id, 'resume')}
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Resume
                      </Button>
                    )}
                    
                    {['active', 'paused'].includes(sponsorship.status) && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleCancel(sponsorship._id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Card>
              <CardContent className="py-12">
                <Heart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-medium mb-2">No Sponsorships Yet</h3>
                <p className="text-muted-foreground mb-6">
                  Start making a difference by sponsoring a family in need.
                </p>
                <Button asChild>
                  <Link href="/sponsor">
                    <Heart className="w-4 h-4 mr-2" />
                    Sponsor a Family
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}