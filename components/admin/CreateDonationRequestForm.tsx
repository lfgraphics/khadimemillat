"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ActionableErrorAlert } from "@/components/admin/ActionableErrorAlert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Calendar, Clock, Package, FileText, User, MapPin, Phone, CheckCircle } from "lucide-react";
import { cn, safeJson } from "@/lib/utils";
import { errorLogger, formatErrorMessage, extractErrorDetails } from "@/lib/utils/error-logger";
import { fetchWithRetry, DEFAULT_API_RETRY_OPTIONS } from "@/lib/utils/retry";

export interface CreatedUserDisplay {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email?: string;
  username?: string;
  password?: string;
  address?: string;
  role: string;
}

interface DonationRequestData {
  userId: string;
  pickupTime: string;
  address: string;
  items?: string;
  notes?: string;
}

interface CreateDonationRequestFormProps {
  user: CreatedUserDisplay;
  onRequestCreated: (request: any) => void;
  onCancel: () => void;
  onError?: (error: string) => void;
  className?: string;
}

export const CreateDonationRequestForm: React.FC<CreateDonationRequestFormProps> = ({
  user,
  onRequestCreated,
  onCancel,
  onError,
  className,
}) => {
  const [form, setForm] = useState<DonationRequestData>({
    userId: user.id,
    pickupTime: "",
    address: user.address || "",
    items: "",
    notes: "",
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [createdRequest, setCreatedRequest] = useState<any>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const updateField = <K extends keyof DonationRequestData>(
    key: K,
    value: DonationRequestData[K]
  ) => {
    setForm(prev => ({ ...prev, [key]: value }));
    // Clear field-specific error when user starts typing
    if (fieldErrors[key]) {
      setFieldErrors(prev => ({ ...prev, [key]: "" }));
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Required field validation
    if (!form.pickupTime.trim()) {
      errors.pickupTime = "Pickup time is required";
    } else {
      // Validate that pickup time is in the future
      const pickupDate = new Date(form.pickupTime);
      const now = new Date();
      if (pickupDate <= now) {
        errors.pickupTime = "Pickup time must be in the future";
      }
    }

    if (!form.address?.trim()) {
      errors.address = "Address is required";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetchWithRetry("/api/protected/collection-requests/create-for-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      }, DEFAULT_API_RETRY_OPTIONS);

      const data = await safeJson<any>(response);

      if (!response.ok) {
        throw new Error(data?.error || "Failed to create donation request");
      }

      if (data.success && data.request) {
        setSuccess(true);
        setCreatedRequest(data.request);
        onRequestCreated(data.request);
      } else {
        throw new Error(data?.error || "Donation request creation failed");
      }
    } catch (err: any) {
      // Log error for monitoring and debugging
      errorLogger.logDonationRequestError(err, user.id, {
        formData: {
          userId: form.userId,
          pickupTime: form.pickupTime,
          hasItems: !!form.items,
          hasNotes: !!form.notes,
        },
        userData: {
          userName: `${user.firstName} ${user.lastName}`,
          userEmail: user.email,
          hasAddress: !!user.address,
          hasPhone: !!user.phoneNumber,
        },
        errorDetails: extractErrorDetails(err),
      });
      
      // Provide specific error messages based on error type
      let errorMessage = "Failed to create donation request. Please try again.";
      
      if (err.message) {
        if (err.message.includes('pickup time') || err.message.includes('time')) {
          errorMessage = "Invalid pickup time. Please select a future date and time.";
        } else if (err.message.includes('address')) {
          errorMessage = "User address is missing. Please update the user's address first.";
        } else if (err.message.includes('phone')) {
          errorMessage = "User phone number is missing. Please update the user's phone number first.";
        } else if (err.message.includes('network') || err.message.includes('fetch')) {
          errorMessage = "Network error. Please check your connection and try again.";
        } else if (err.message.includes('validation')) {
          errorMessage = "Please check all required fields and try again.";
        } else if (err.message.includes('Unauthorized') || err.message.includes('Forbidden')) {
          errorMessage = "You don't have permission to create donation requests.";
        } else if (err.message.includes('User not found')) {
          errorMessage = "The user could not be found. Please try creating the user again.";
        } else {
          errorMessage = formatErrorMessage(err);
        }
      }
      
      setError(errorMessage);
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // Get minimum datetime for input (current time + 1 hour)
  const getMinDateTime = () => {
    const now = new Date();
    now.setHours(now.getHours() + 1);
    return now.toISOString().slice(0, 16);
  };

  // Format pickup time for display
  const formatPickupTime = (dateTimeString: string) => {
    if (!dateTimeString) return "";
    const date = new Date(dateTimeString);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (success && createdRequest) {
    return (
      <Card className={cn("w-full max-w-2xl mx-auto", className)}>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-green-100 p-3">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <CardTitle className="text-2xl text-green-700">
            Donation Request Created!
          </CardTitle>
          <CardDescription>
            The donation request has been created and field executives have been notified.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Request Summary */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Request Details</h3>
            
            <div className="grid gap-4">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">User</span>
                </div>
                <span className="text-sm">{createdRequest.userName}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Pickup Time</span>
                </div>
                <span className="text-sm">{formatPickupTime(createdRequest.pickupTime)}</span>
              </div>

              <div className="flex items-start justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span className="font-medium">Address</span>
                </div>
                <span className="text-sm text-right max-w-xs">{createdRequest.userAddress}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Phone</span>
                </div>
                <span className="text-sm">{createdRequest.userPhone}</span>
              </div>

              {createdRequest.items && createdRequest.items !== 'Not specified' && (
                <div className="flex items-start justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Package className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <span className="font-medium">Items</span>
                  </div>
                  <span className="text-sm text-right max-w-xs">{createdRequest.items}</span>
                </div>
              )}

              {createdRequest.notes && (
                <div className="flex items-start justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <span className="font-medium">Notes</span>
                  </div>
                  <span className="text-sm text-right max-w-xs">{createdRequest.notes}</span>
                </div>
              )}

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Status</span>
                </div>
                <Badge variant="default">Verified</Badge>
              </div>
            </div>
          </div>

          <Separator />

          {/* Notification Info */}
          <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-green-100 dark:bg-green-900 p-1">
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-green-900 dark:text-green-100">
                  Field Executives Notified
                </p>
                <p className="text-xs text-green-700 dark:text-green-300">
                  {createdRequest.fieldExecutiveNotificationsSent} field executive(s) have been notified about this verified donation request.
                </p>
              </div>
            </div>
          </div>

          <Button onClick={onCancel} className="w-full" size="lg">
            Close
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full max-w-2xl mx-auto", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Create Donation Request
        </CardTitle>
        <CardDescription>
          Create a pre-verified donation request for {user.firstName} {user.lastName}. 
          Field executives will be automatically notified.
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {/* User Information Summary */}
        <div className="mb-6 p-4 bg-muted/50 rounded-lg">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <User className="h-4 w-4" />
            User Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div>
              <span className="font-medium">Name:</span> {user.firstName} {user.lastName}
            </div>
            <div>
              <span className="font-medium">Phone:</span> {user.phoneNumber}
            </div>
            {user.address && (
              <div className="md:col-span-2">
                <span className="font-medium">Address:</span> {user.address}
              </div>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Pickup Time Field */}
          <div className="space-y-2">
            <Label htmlFor="pickupTime" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Pickup Time <span className="text-red-500">*</span>
            </Label>
            <Input
              id="pickupTime"
              type="datetime-local"
              value={form.pickupTime}
              onChange={(e) => updateField("pickupTime", e.target.value)}
              min={getMinDateTime()}
              className={cn(fieldErrors.pickupTime && "border-red-500")}
              disabled={loading}
            />
            {fieldErrors.pickupTime && (
              <p className="text-sm text-red-600">{fieldErrors.pickupTime}</p>
            )}
            {form.pickupTime && (
              <p className="text-xs text-muted-foreground">
                Scheduled for: {formatPickupTime(form.pickupTime)}
              </p>
            )}
          </div>

          {/* Address Field */}
          <div className="space-y-2">
            <Label htmlFor="address" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Pickup Address <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="address"
              value={form.address}
              onChange={(e) => updateField("address", e.target.value)}
              placeholder="Enter complete pickup address with landmarks"
              rows={3}
              className={cn(fieldErrors.address && "border-red-500")}
              disabled={loading}
            />
            {fieldErrors.address && (
              <p className="text-sm text-red-600">{fieldErrors.address}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Provide complete address for field executive to locate
            </p>
          </div>

          {/* Items Field */}
          <div className="space-y-2">
            <Label htmlFor="items" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Items Description
            </Label>
            <Textarea
              id="items"
              value={form.items}
              onChange={(e) => updateField("items", e.target.value)}
              placeholder="Describe the items to be collected (e.g., old furniture, electronics, books)"
              rows={3}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Optional: Describe what items will be collected
            </p>
          </div>

          {/* Notes Field */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Additional Notes
            </Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              placeholder="Any special instructions, access details, or additional information"
              rows={3}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Optional: Special instructions for field executives
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <ActionableErrorAlert
              error={error}
              onRetry={() => handleSubmit(new Event('submit') as any)}
            />
          )}

          {/* Info Alert */}
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              This request will be created with "Verified" status and all field executives 
              will be immediately notified with the pickup details.
            </AlertDescription>
          </Alert>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={loading}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Request...
                </>
              ) : (
                "Create Request"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default CreateDonationRequestForm;