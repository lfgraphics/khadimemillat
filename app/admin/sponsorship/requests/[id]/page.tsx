"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { toast } from "sonner";
import {
  ArrowLeft,
  User,
  Phone,
  MapPin,
  FileText,
  Calendar,
  UserCheck,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle
} from "lucide-react";
import { assignOfficer } from "@/actions/sponsorship-actions";

interface SponsorshipRequest {
  _id: string;
  requestId: string;
  applicantName: string;
  fatherName: string;
  aadhaar?: string; // Optional Aadhaar number
  contactInfo: {
    phone: string;
    alternatePhone?: string;
  };
  fullAddress: string;
  basicRequest: {
    reasonForRequest: string;
  };
  status: string;
  priority: string;
  assignedOfficer?: {
    _id: string;
    name: string;
    email: string;
  };
  assignedDate?: string;
  submittedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface User {
  _id: string;
  clerkUserId: string;
  name: string;
  email: string;
  role: string;
}

export default function SponsorshipRequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [request, setRequest] = useState<SponsorshipRequest | null>(null);
  const [surveyOfficers, setSurveyOfficers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);

  const requestId = params.id as string;

  useEffect(() => {
    fetchRequestDetails();
    fetchSurveyOfficers();
  }, [requestId]);

  const fetchRequestDetails = async () => {
    try {
      const response = await fetch(`/api/sponsorship/requests/${requestId}`);
      if (response.ok) {
        const data = await response.json();
        setRequest(data.data);
      } else {
        toast.error("Failed to load request details");
      }
    } catch (error) {
      console.error("Error fetching request:", error);
      toast.error("Error loading request details");
    } finally {
      setLoading(false);
    }
  };

  const fetchSurveyOfficers = async () => {
    try {
      const response = await fetch("/api/users?role=inquiry_officer");
      if (response.ok) {
        const data = await response.json();
        setSurveyOfficers(data.users || []);
      }
    } catch (error) {
      console.error("Error fetching survey officers:", error);
    }
  };

  const handleAssignOfficer = async (officerId: string) => {
    setAssigning(true);
    try {
      const result = await assignOfficer(requestId, officerId);
      if (result.success) {
        toast.success("Survey officer assigned successfully");
        fetchRequestDetails(); // Refresh the data
      } else {
        toast.error(result.error || "Failed to assign officer");
      }
    } catch (error) {
      console.error("Error assigning officer:", error);
      toast.error("Error assigning officer");
    } finally {
      setAssigning(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'assigned': return 'bg-blue-100 text-blue-800';
      case 'surveyed': return 'bg-purple-100 text-purple-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'assigned': return <UserCheck className="w-4 h-4" />;
      case 'surveyed': return <FileText className="w-4 h-4" />;
      case 'approved': return <CheckCircle className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="text-center py-12">
            <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Request Not Found</h3>
            <p className="text-gray-600 mb-4">The sponsorship request you're looking for doesn't exist.</p>
            <Button onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Sponsorship Request Details</h1>
            <p className="text-muted-foreground">Request ID: {request.requestId}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={getStatusColor(request.status)}>
            {getStatusIcon(request.status)}
            <span className="ml-1 capitalize">{request.status}</span>
          </Badge>
          <Badge className={getPriorityColor(request.priority)}>
            <span className="capitalize">{request.priority} Priority</span>
          </Badge>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Applicant Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Applicant Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Full Name</label>
                  <p className="text-lg font-medium">{request.applicantName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Father's Name</label>
                  <p className="text-lg">{request.fatherName}</p>
                </div>
              </div>
              
              {request.aadhaar && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Aadhaar Number</label>
                  <p className="text-lg font-mono">{request.aadhaar}</p>
                </div>
              )}
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
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Primary Phone</label>
                  <p className="text-lg">{request.contactInfo.phone}</p>
                </div>
                {request.contactInfo.alternatePhone && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Alternate Phone</label>
                    <p className="text-lg">{request.contactInfo.alternatePhone}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Address */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Address
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg">{request.fullAddress}</p>
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
              <p className="text-lg leading-relaxed">{request.basicRequest.reasonForRequest}</p>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Assignment */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="w-5 h-5" />
                Survey Assignment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {request.assignedOfficer ? (
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm font-medium text-green-800">Assigned to:</p>
                  <p className="text-lg font-medium text-green-900">{request.assignedOfficer.name}</p>
                  <p className="text-sm text-green-700">{request.assignedOfficer.email}</p>
                  {request.assignedDate && (
                    <p className="text-xs text-green-600 mt-2">
                      Assigned on: {new Date(request.assignedDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">No survey officer assigned yet.</p>
                  
                  {surveyOfficers.length > 0 ? (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Assign Survey Officer:</label>
                      {surveyOfficers.map((officer) => (
                        <Button
                          key={officer._id}
                          variant="outline"
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => handleAssignOfficer(officer._id)}
                          disabled={assigning}
                        >
                          <UserCheck className="w-4 h-4 mr-2" />
                          {officer.name}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-amber-600">No survey officers available</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium">Request Submitted</p>
                    <p className="text-xs text-gray-600">
                      {new Date(request.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                
                {request.assignedDate && (
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div>
                      <p className="text-sm font-medium">Officer Assigned</p>
                      <p className="text-xs text-gray-600">
                        {new Date(request.assignedDate).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
                
                {request.status === 'surveyed' && (
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <div>
                      <p className="text-sm font-medium">Survey Completed</p>
                    </div>
                  </div>
                )}
                
                {request.status === 'approved' && (
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div>
                      <p className="text-sm font-medium">Request Approved</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Submitted By */}
          {request.submittedBy && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Submitted By</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <p className="font-medium">{request.submittedBy.name}</p>
                  <p className="text-sm text-gray-600">{request.submittedBy.email}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}