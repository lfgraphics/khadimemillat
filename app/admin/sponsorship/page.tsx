import { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import connectDB from "@/lib/db";
import User from "@/models/User";
import SponsorshipRequest from "@/models/SponsorshipRequest";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AssignOfficerForm } from "@/components/sponsorship/AssignOfficerForm";
import { 
  Users, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Eye
} from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sponsorship Management - KMWF Admin",
  description: "Manage sponsorship requests and applications"
};

async function getSponsorshipStats() {
  await connectDB();
  
  const [
    totalRequests,
    pendingRequests,
    approvedRequests,
    rejectedRequests,
    urgentRequests
  ] = await Promise.all([
    SponsorshipRequest.countDocuments(),
    SponsorshipRequest.countDocuments({ status: 'pending' }),
    SponsorshipRequest.countDocuments({ status: 'approved' }),
    SponsorshipRequest.countDocuments({ status: 'rejected' }),
    SponsorshipRequest.countDocuments({ priority: 'urgent' })
  ]);

  return {
    totalRequests,
    pendingRequests,
    approvedRequests,
    rejectedRequests,
    urgentRequests
  };
}

async function getRecentRequests() {
  await connectDB();
  
  const requests = await SponsorshipRequest.find()
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  // Fetch user details from Clerk for assigned officers
  const { clerkClient } = await import('@clerk/nextjs/server');
  const client = await clerkClient();
  
  const requestsWithUserDetails = await Promise.all(
    requests.map(async (request: any) => {
      if (request.assignedOfficer) {
        try {
          // Check if assignedOfficer is a Clerk user ID (string) or MongoDB ObjectId
          let clerkUserId = request.assignedOfficer;
          
          // If it's a MongoDB ObjectId, try to find the corresponding Clerk user ID
          if (request.assignedOfficer.length === 24 && /^[0-9a-fA-F]{24}$/.test(request.assignedOfficer)) {
            // This looks like a MongoDB ObjectId, find the corresponding user
            const officerUser = await User.findById(request.assignedOfficer);
            if (officerUser?.clerkUserId) {
              clerkUserId = officerUser.clerkUserId;
            } else {
              request.assignedOfficerName = 'Officer (Legacy)';
              return request;
            }
          }
          
          const officer = await client.users.getUser(clerkUserId);
          request.assignedOfficerName = officer.firstName && officer.lastName 
            ? `${officer.firstName} ${officer.lastName}` 
            : (officer.username || officer.emailAddresses?.[0]?.emailAddress || 'Officer');
        } catch (error) {
          console.error('Error fetching officer details for request:', request._id, error);
          request.assignedOfficerName = 'Officer (Unavailable)';
        }
      }
      return request;
    })
  );

  return requestsWithUserDetails;
}

async function getInquiryOfficers() {
  try {
    const { clerkClient } = await import('@clerk/nextjs/server');
    const client = await clerkClient();
    
    // Get all users from Clerk and filter by inquiry_officer role
    const allUsers = await client.users.getUserList({ limit: 500 });
    const inquiryOfficers = allUsers.data
      .filter(user => (user.publicMetadata as any)?.role === 'inquiry_officer')
      .map(user => ({
        _id: user.id, // Use Clerk ID as _id
        name: user.firstName && user.lastName 
          ? `${user.firstName} ${user.lastName}` 
          : (user.username || 'Unnamed User'),
        email: user.emailAddresses?.[0]?.emailAddress
      }));

    return inquiryOfficers;
  } catch (error) {
    console.error('Error fetching inquiry officers from Clerk:', error);
    return [];
  }
}

export default async function SponsorshipManagementPage() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect("/sign-in");
  }

  await connectDB();
  const user = await User.findOne({ clerkUserId: userId });
  
  if (!user || !['admin', 'moderator'].includes(user.role)) {
    redirect("/unauthorized");
  }

  const [stats, recentRequests, inquiryOfficers] = await Promise.all([
    getSponsorshipStats(),
    getRecentRequests(),
    getInquiryOfficers()
  ]);

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: "secondary",
      assigned: "default",
      surveyed: "outline",
      approved: "default",
      rejected: "destructive",
      cancelled: "secondary"
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || "secondary"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const colors = {
      low: "bg-green-100 text-green-800",
      medium: "bg-yellow-100 text-yellow-800", 
      high: "bg-orange-100 text-orange-800",
      urgent: "bg-red-100 text-red-800"
    } as const;

    return (
      <Badge className={colors[priority as keyof typeof colors] || colors.medium}>
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Sponsorship Management</h1>
          <p className="text-muted-foreground">
            Manage sponsorship requests, assignments, and approvals
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalRequests}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingRequests}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.approvedRequests}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rejected</CardTitle>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.rejectedRequests}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Urgent</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.urgentRequests}</div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Requests */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Sponsorship Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentRequests.map((request: any) => (
                <div key={request._id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium">{request.applicantName}</h3>
                      {getStatusBadge(request.status)}
                      {getPriorityBadge(request.priority)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p>Request ID: {request.requestId}</p>
                      <p>Phone: {request.contactInfo.phone}</p>
                      <p>Submitted: {new Date(request.createdAt).toLocaleDateString()}</p>
                      <p className="truncate">Reason: {request.basicRequest?.reasonForRequest}</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/admin/sponsorship/requests/${request._id}`}>
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Link>
                    </Button>
                    
                    {request.status === 'pending' && (
                      <AssignOfficerForm
                        requestId={request._id}
                        officers={inquiryOfficers}
                      />
                    )}
                    
                    {request.assignedOfficer && (
                      <div className="text-xs text-muted-foreground">
                        Assigned to: {request.assignedOfficerName || request.assignedOfficer}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {recentRequests.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No sponsorship requests found
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}