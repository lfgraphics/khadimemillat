import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import connectDB from "@/lib/db";
import User from "@/models/User";
import SponsorshipRequest from "@/models/SponsorshipRequest";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WorkflowStatus } from "@/components/sponsorship/WorkflowStatus";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Phone, MapPin } from "lucide-react";

export default async function SponsorshipStatusPage() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect("/sign-in");
  }

  await connectDB();
  
  const user = await User.findOne({ clerkUserId: userId });
  
  if (!user) {
    redirect("/sign-in");
  }

  // Get user's sponsorship requests
  const requests = await SponsorshipRequest.find({
    submittedBy: user._id
  }).sort({ createdAt: -1 });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button variant="outline" asChild className="mb-4">
          <Link href="/dashboard">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>
        
        <h1 className="text-3xl font-bold mb-2">Sponsorship Request Status</h1>
        <p className="text-muted-foreground">
          Track the progress of your sponsorship applications
        </p>
      </div>

      {requests.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground mb-4">
              You haven't submitted any sponsorship requests yet.
            </p>
            <Button asChild>
              <Link href="/sponsorship/request">
                Submit New Request
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {requests.map((request) => (
            <Card key={(request._id as any).toString()}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{request.applicantName}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Request ID: {request.requestId}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Submitted: {new Date(request.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <WorkflowStatus
                  status={request.status}
                  priority={request.priority}
                  assignedOfficer={request.assignedOfficer}
                />
                
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{request.contactInfo.phone}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <span className="truncate">Reason: {request.basicRequest?.reasonForRequest}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}