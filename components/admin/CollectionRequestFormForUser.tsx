"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Calendar, MapPin, Phone, FileText, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { validateCollectionRequestForm, sanitizeString } from "@/lib/utils/validation";
import { parseApiError, logError } from "@/lib/utils/errorHandling";

export interface SelectedUser {
  id: string; // Clerk ID
  name: string;
  email: string;
  phone?: string;
  address?: string;
  username?: string;
}

export interface CollectionRequestFormData {
  address: string;
  phone: string;
  pickupTime: string; // ISO datetime string
  items?: string;
  notes?: string;
}

export interface CreatedRequest {
  id: string;
  userId: string;
  userName: string;
  userAddress: string;
  userPhone: string;
  pickupTime: Date;
  status: 'verified';
  items?: string;
  notes?: string;
  fieldExecutiveNotificationsSent: number;
}

interface CollectionRequestFormForUserProps {
  selectedUser: SelectedUser | null;
  onRequestCreated: (request: CreatedRequest) => void;
  onError: (error: string) => void;
  disabled?: boolean;
}

interface ValidationErrors {
  address?: string;
  phone?: string;
  pickupTime?: string;
  items?: string;
  notes?: string;
}

const CollectionRequestFormForUser: React.FC<CollectionRequestFormForUserProps> = ({
  selectedUser,
  onRequestCreated,
  onError,
  disabled = false
}) => {
  const [formData, setFormData] = useState<CollectionRequestFormData>({
    address: '',
    phone: '',
    pickupTime: '',
    items: '',
    notes: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [canRetry, setCanRetry] = useState(false);

  // Pre-populate form when user is selected
  useEffect(() => {
    if (selectedUser) {
      setFormData({
        address: selectedUser.address || '',
        phone: selectedUser.phone || '',
        pickupTime: '',
        items: '',
        notes: ''
      });
      setValidationErrors({});
      setSubmitError(null);
      setRetryCount(0);
      setCanRetry(false);
    } else {
      // Reset form when no user is selected
      setFormData({
        address: '',
        phone: '',
        pickupTime: '',
        items: '',
        notes: ''
      });
      setValidationErrors({});
      setSubmitError(null);
      setRetryCount(0);
      setCanRetry(false);
    }
  }, [selectedUser]);

  const validateForm = (): boolean => {
    const validation = validateCollectionRequestForm(formData, selectedUser);
    setValidationErrors(validation.errors);
    return validation.isValid;
  };

  const handleInputChange = (field: keyof CollectionRequestFormData, value: string) => {
    // Sanitize only items and notes to prevent XSS, but allow full text in address
    const sanitizedValue = (field === 'items' || field === 'notes')
      ? sanitizeString(value)
      : value;

    setFormData(prev => ({
      ...prev,
      [field]: sanitizedValue
    }));

    // Clear validation error for this field when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }

    // Clear submit error when user makes changes
    if (submitError) {
      setSubmitError(null);
      setCanRetry(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedUser) {
      setSubmitError('Please select a user first');
      onError('Please select a user first');
      return;
    }

    if (!validateForm()) {
      setSubmitError('Please fix the validation errors before submitting');
      onError('Please fix the validation errors before submitting');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const payload = {
        donor: selectedUser.id,
        address: formData.address.trim(),
        phone: formData.phone.trim(),
        requestedPickupTime: new Date(formData.pickupTime).toISOString(),
        notes: [
          formData.items?.trim() && `Items: ${formData.items.trim()}`,
          formData.notes?.trim() && `Notes: ${formData.notes.trim()}`
        ].filter(Boolean).join('\n\n') || undefined
      };

      const response = await fetch('/api/protected/collection-requests/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        // Add timeout handling
        signal: AbortSignal.timeout(30000) // 30 second timeout for form submission
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        // Enhanced error handling based on status codes and error messages
        let errorMessage = '';
        switch (response.status) {
          case 400:
            if (errorData.error?.includes('Selected user is no longer available')) {
              errorMessage = 'Selected user is no longer available. Please search for the user again.';
            } else if (errorData.error?.includes('User missing required information')) {
              errorMessage = 'User missing required information (phone or address). Please provide complete information.';
            } else if (errorData.error?.includes('Pickup time must be in the future')) {
              errorMessage = 'Pickup time must be in the future. Please select a valid date and time.';
            } else if (errorData.details) {
              // Handle validation errors from server
              const fieldErrors = Object.entries(errorData.details).map(([field, errors]) =>
                `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`
              ).join('; ');
              errorMessage = `Validation failed: ${fieldErrors}`;
            } else {
              errorMessage = errorData.error || 'Invalid request data. Please check your inputs.';
            }
            break;
          case 401:
            errorMessage = 'Session expired. Please refresh the page and try again.';
            break;
          case 403:
            errorMessage = 'Unauthorized. Only admins and moderators can create collection requests.';
            break;
          case 429:
            errorMessage = 'Too many requests. Please wait a moment and try again.';
            setCanRetry(true);
            break;
          case 500:
            errorMessage = 'Service temporarily unavailable. Please try again in a few moments.';
            setCanRetry(true);
            break;
          case 502:
          case 503:
          case 504:
            errorMessage = 'Service temporarily unavailable. Please try again.';
            setCanRetry(true);
            break;
          default:
            errorMessage = errorData.error || `Server error (${response.status}). Please try again.`;
            setCanRetry(true);
        }

        setSubmitError(errorMessage);
        throw new Error(errorMessage);
      }

      const result = await response.json();

      if (result.success && result.data) {
        const createdRequest: CreatedRequest = {
          id: result.data._id || result.data.id,
          userId: selectedUser.id,
          userName: selectedUser.name,
          userAddress: formData.address.trim(),
          userPhone: formData.phone.trim(),
          pickupTime: new Date(formData.pickupTime),
          status: 'verified',
          items: formData.items?.trim() || undefined,
          notes: formData.notes?.trim() || undefined,
          fieldExecutiveNotificationsSent: result.data.fieldExecutiveNotificationsSent || 0
        };

        onRequestCreated(createdRequest);

        // Reset form after successful submission
        setFormData({
          address: selectedUser.address || '',
          phone: selectedUser.phone || '',
          pickupTime: '',
          items: '',
          notes: ''
        });
        setValidationErrors({});
        setSubmitError(null);
        setRetryCount(0);
        setCanRetry(false);
      } else {
        const errorMessage = result.error || 'Failed to create collection request';
        setSubmitError(errorMessage);
        setCanRetry(true);
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      logError(error, 'collection-request-creation', {
        userId: selectedUser?.id,
        formData: { ...formData, phone: '[REDACTED]' } // Don't log sensitive data
      });

      const errorDetails = parseApiError(error, 'Collection request creation');
      setCanRetry(errorDetails.retryable);

      if (!submitError) {
        setSubmitError(errorDetails.message);
      }
      onError(errorDetails.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = () => {
    if (retryCount < 3 && canRetry) {
      setRetryCount(prev => prev + 1);
      setCanRetry(false);
      setSubmitError(null);
      handleSubmit(new Event('submit') as any);
    }
  };

  // Don't render form if no user is selected
  if (!selectedUser) {
    return (
      <Card className="border-muted">
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">Please select a user to create a collection request</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Collection Request for {selectedUser.name}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Address Field */}
          <div className="space-y-2">
            <Label htmlFor="address" className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Pickup Address
              <span className="text-destructive">*</span>
            </Label>
            <Input
              id="address"
              type="text"
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              placeholder="Enter the pickup address"
              disabled={disabled || isSubmitting}
              aria-invalid={!!validationErrors.address}
              className={cn(validationErrors.address && "border-destructive")}
            />
            {validationErrors.address && (
              <div className="flex items-center gap-1 text-sm text-destructive">
                <AlertCircle className="w-4 h-4" />
                {validationErrors.address}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              You can modify the address for this request only. User's profile won't be updated.
            </p>
          </div>

          {/* Phone Field */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Contact Phone
              <span className="text-destructive">*</span>
            </Label>
            <PhoneInput
              id="phone"
              value={formData.phone}
              onChange={(value) => handleInputChange('phone', value)}
              placeholder="Enter contact phone number"
              disabled={disabled || isSubmitting}
              className={cn(validationErrors.phone && "border-destructive")}
            />
            {validationErrors.phone && (
              <div className="flex items-center gap-1 text-sm text-destructive">
                <AlertCircle className="w-4 h-4" />
                {validationErrors.phone}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              You can modify the phone number for this request only. User's profile won't be updated.
            </p>
          </div>

          {/* Pickup Time Field */}
          <div className="space-y-2">
            <Label htmlFor="pickupTime" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Pickup Time
              <span className="text-destructive">*</span>
            </Label>
            <Input
              id="pickupTime"
              type="datetime-local"
              value={formData.pickupTime}
              onChange={(e) => handleInputChange('pickupTime', e.target.value)}
              disabled={disabled || isSubmitting}
              aria-invalid={!!validationErrors.pickupTime}
              className={cn(validationErrors.pickupTime && "border-destructive")}
            />
            {validationErrors.pickupTime && (
              <div className="flex items-center gap-1 text-sm text-destructive">
                <AlertCircle className="w-4 h-4" />
                {validationErrors.pickupTime}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Select any future date and time for the pickup
            </p>
          </div>

          {/* Items Field */}
          <div className="space-y-2">
            <Label htmlFor="items" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Items Description
            </Label>
            <Textarea
              id="items"
              value={formData.items}
              onChange={(e) => handleInputChange('items', e.target.value)}
              placeholder="Describe the scrap items to be collected (e.g., old newspapers, metal scraps, electronics)"
              disabled={disabled || isSubmitting}
              rows={3}
              aria-invalid={!!validationErrors.items}
              className={cn(validationErrors.items && "border-destructive")}
            />
            {validationErrors.items && (
              <div className="flex items-center gap-1 text-sm text-destructive">
                <AlertCircle className="w-4 h-4" />
                {validationErrors.items}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Optional: Provide details about the items to help field executives prepare
            </p>
          </div>

          {/* Notes Field */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Additional Notes
            </Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Any additional instructions, access details, or special requirements"
              disabled={disabled || isSubmitting}
              rows={3}
              aria-invalid={!!validationErrors.notes}
              className={cn(validationErrors.notes && "border-destructive")}
            />
            {validationErrors.notes && (
              <div className="flex items-center gap-1 text-sm text-destructive">
                <AlertCircle className="w-4 h-4" />
                {validationErrors.notes}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Optional: Include access instructions, special requirements, or other relevant information
            </p>
          </div>

          {/* Submit Error Display */}
          {submitError && (
            <Card className="border-destructive/20 bg-destructive/5">
              <CardContent className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-1 text-sm text-destructive">
                      <AlertCircle className="w-4 h-4" />
                      {submitError}
                    </div>
                    {retryCount > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Retry attempt {retryCount} of 3
                      </p>
                    )}
                  </div>
                  {canRetry && retryCount < 3 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRetry}
                      disabled={isSubmitting}
                      className="text-xs"
                    >
                      {isSubmitting ? 'Retrying...' : 'Retry'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Submit Button */}
          <div className="pt-4">
            <Button
              type="submit"
              disabled={disabled || isSubmitting || !selectedUser}
              className="w-full md:w-auto"
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  {retryCount > 0 ? `Retrying (${retryCount}/3)...` : 'Creating Request...'}
                </>
              ) : (
                'Create Collection Request'
              )}
            </Button>
          </div>

          {/* Helper Text */}
          <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-md">
            <p className="font-medium mb-1">What happens next:</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>The request will be created with 'verified' status</li>
              <li>All field executives will be automatically notified</li>
              <li>The user will receive a confirmation notification</li>
              <li>Field executives can view and accept the assignment</li>
            </ul>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default CollectionRequestFormForUser;