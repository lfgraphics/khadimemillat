"use client";

import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CheckCircle, Home, Phone, Clock } from "lucide-react";

export default function SponsorshipRequestSuccessPage() {
  const searchParams = useSearchParams();
  const requestId = searchParams.get('requestId');

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8" />
          </div>
          <CardTitle className="text-2xl">Request Submitted Successfully!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {requestId && (
            <div className="p-4 rounded-lg">
              <p className="text-sm font-medium">Your Request ID:</p>
              <p className="text-lg font-mono">{requestId}</p>
            </div>
          )}
          
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 mt-0.5" />
              <div>
                <h3 className="font-medium">What happens next?</h3>
                <p className="text-sm">
                  Our team will contact you within 2-3 days to schedule a home visit for verification.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 mt-0.5" />
              <div>
                <h3 className="font-medium">Processing Time</h3>
                <p className="text-sm">
                  Complete verification and approval typically takes 7-10 days.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 space-y-3">
            <Button asChild className="w-full">
              <Link href="/sponsorship/status">
                Track My Request
              </Link>
            </Button>
            
            <Button variant="outline" asChild className="w-full">
              <Link href="/">
                <Home className="w-4 h-4 mr-2" />
                Back to Home
              </Link>
            </Button>
          </div>

          <div className="text-xs text-center">
            <p>Keep your request ID safe for future reference.</p>
            <p>You can track your request status anytime using the link above.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}