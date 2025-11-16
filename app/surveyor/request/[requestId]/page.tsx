import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import connectDB from "@/lib/db";
import User from "@/models/User";
import SponsorshipRequest from "@/models/SponsorshipRequest";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  User as UserIcon,
  Phone,
  MapPin,
  FileText,
  AlertCircle,
  ArrowLeft
} from "lucide-react";

interface PageProps {
  params: Promise<{
    requestId: string;
  }>;
}

export default async function RequestDetailsPage({ params }: PageProps) {
  const { requestId } = await params;
  const { userId } = await auth();
  
  if (!userId) {
    redirect("/sign-in");
  }

  await connectDB();
  
  // Get user from MongoDB (optional - might not exist for Clerk-only users)
  const user = await User.findOne({ clerkUserId: userId });

  // Get the sponsorship request
  const request = await SponsorshipRequest.findById(requestId)
    .populate('submittedBy', 'name email')
    .populate('assignedOfficer', 'name');
  
  if (!request) {
    redirect("/surveyor");
  }

  // Get user role from Clerk (primary source of truth)
  const { sessionClaims } = await auth();
  const userRole = (sessionClaims?.metadata as { role?: string } | undefined)?.role;

  // Check if user is assigned to this request or has admin/moderator role
  // The assignedOfficer could be either a MongoDB ObjectId or a Clerk user ID
  const isAssignedOfficer = 
    (user && request.assignedOfficer?.toString() === user._id?.toString()) || // MongoDB ObjectId comparison (if user exists)
    request.assignedOfficer?.toString() === userId; // Clerk user ID comparison
  const hasAdminAccess = ['admin', 'moderator', 'inquiry_officer'].includes(userRole || '');
  
  if (!isAssignedOfficer && !hasAdminAccess) {
    redirect("/unauthorized");
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button variant="outline" asChild className="mb-4">
          <Link href="/surveyor">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>
        
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">Request Details</h1>
            <p className="text-muted-foreground">
              Review the sponsorship request details before conducting survey
            </p>
          </div>
          <Badge variant={
            request.priority === 'urgent' ? 'destructive' :
            request.priority === 'high' ? 'default' :
            request.priority === 'medium' ? 'secondary' : 'outline'
          }>
            {request.priority} Priority
          </Badge>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserIcon className="w-5 h-5" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                  <p className="font-medium">{request.applicantName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Father's Name</label>
                  <p className="font-medium">{request.fatherName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Aadhaar</label>
                  <p className="font-medium">{request.aadhaar}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Request ID</label>
                  <p className="font-medium text-primary">{request.requestId}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="w-5 h-5" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Primary Phone</label>
                  <p className="font-medium">{request.contactInfo.phone}</p>
                </div>
                {request.contactInfo.alternatePhone && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Alternate Phone</label>
                    <p className="font-medium">{request.contactInfo.alternatePhone}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Address Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Address Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Complete Address</label>
                <p className="font-medium">{request.fullAddress}</p>
              </div>

            </CardContent>
          </Card>



          {/* Reason for Request */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Reason for Request
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">
                {request.basicRequest?.reasonForRequest}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle>Request Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Current Status</label>
                <Badge variant="secondary" className="block w-fit mt-1">
                  {request.status}
                </Badge>
              </div>
              


              <div>
                <label className="text-sm font-medium text-muted-foreground">Submitted Date</label>
                <p className="font-medium">{new Date(request.createdAt).toLocaleDateString()}</p>
              </div>

              {request.assignedDate && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Assigned Date</label>
                  <p className="font-medium">{new Date(request.assignedDate).toLocaleDateString()}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full" asChild>
                <Link href={`/surveyor/survey/${request._id}`}>
                  <FileText className="w-4 h-4 mr-2" />
                  Start Survey
                </Link>
              </Button>
              
              <Button variant="outline" className="w-full">
                <Phone className="w-4 h-4 mr-2" />
                Call Applicant
              </Button>
              
              <Button variant="outline" className="w-full">
                <MapPin className="w-4 h-4 mr-2" />
                Get Directions
              </Button>
            </CardContent>
          </Card>

          {/* Important Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Survey Guidelines
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>• Verify all personal information with original documents</p>
              <p>• Take photos of housing conditions and family</p>
              <p>• Interview neighbors for verification</p>
              <p>• Document all income sources and expenses</p>
              <p>• Maintain dignity and respect throughout the process</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}