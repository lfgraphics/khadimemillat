"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PhoneInput } from "@/components/ui/phone-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { Loader2, User, Mail, Phone, MapPin, Shield } from "lucide-react";
import { cn, safeJson } from "@/lib/utils";

export interface UserCreationFormData {
  name: string;
  email?: string;
  phone: string;
  address?: string;
  role?: 'user' | 'admin' | 'moderator' | 'field_executive';
}

export interface CreatedUserDisplay {
  id: string;
  name: string;
  email?: string;
  username: string;
  password: string;
  phone: string;
  address?: string;
  role: string;
}

interface UserCreationFormProps {
  onUserCreated: (user: CreatedUserDisplay) => void;
  onCancel: () => void;
  className?: string;
}

export const UserCreationForm: React.FC<UserCreationFormProps> = ({
  onUserCreated,
  onCancel,
  className,
}) => {
  const [form, setForm] = useState<UserCreationFormData>({
    name: "",
    email: "",
    phone: "",
    address: "",
    role: "user",
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Generate username preview in real-time
  const usernamePreview = useMemo(() => {
    if (!form.name.trim() || !form.phone.trim()) {
      return "";
    }

    try {
      // Sanitize name: remove spaces, special characters, convert to lowercase
      const sanitizedName = form.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .trim();

      // Extract last 4 digits of phone number
      const phoneDigits = form.phone.replace(/\D/g, '');
      if (phoneDigits.length < 4) {
        return "";
      }
      const last4Digits = phoneDigits.slice(-4);

      return `${sanitizedName}${last4Digits}`;
    } catch {
      return "";
    }
  }, [form.name, form.phone]);

  const updateField = <K extends keyof UserCreationFormData>(
    key: K,
    value: UserCreationFormData[K]
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
    if (!form.name.trim()) {
      errors.name = "Name is required";
    }

    // Email is optional, but if provided, must be valid
    if (form.email && form.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.email)) {
        errors.email = "Please enter a valid email address";
      }
    }

    if (!form.phone.trim()) {
      errors.phone = "Phone number is required";
    } else {
      // Phone format validation
      const phoneDigits = form.phone.replace(/\D/g, '');
      if (phoneDigits.length < 10) {
        errors.phone = "Phone number must contain at least 10 digits";
      }
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

    try {
      const response = await fetch("/api/protected/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await safeJson<any>(response);

      if (!response.ok) {
        throw new Error(data?.error || "Failed to create user");
      }

      if (data.success && data.user) {
        onUserCreated(data.user);
        // Reset form
        setForm({
          name: "",
          email: "",
          phone: "",
          address: "",
          role: "user",
        });
      } else {
        throw new Error(data?.error || "User creation failed");
      }
    } catch (err: any) {
      console.error("User creation error:", err);
      setError(err.message || "Failed to create user. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className={cn("w-full max-w-2xl mx-auto", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Create New User
        </CardTitle>
        <CardDescription>
          Add a new user to the system. Name and phone number are required. Email is optional.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name Field */}
          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Full Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              type="text"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="Enter full name"
              className={cn(fieldErrors.name && "border-red-500")}
              disabled={loading}
            />
            {fieldErrors.name && (
              <p className="text-sm text-red-600">{fieldErrors.name}</p>
            )}
          </div>

          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Address <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="email"
              type="email"
              value={form.email || ""}
              onChange={(e) => updateField("email", e.target.value)}
              placeholder="Enter email address (optional)"
              className={cn(fieldErrors.email && "border-red-500")}
              disabled={loading}
            />
            {fieldErrors.email && (
              <p className="text-sm text-red-600">{fieldErrors.email}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Email is optional. If provided, user will receive account details via email.
            </p>
          </div>

          {/* Phone Field */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Phone Number <span className="text-red-500">*</span>
            </Label>
            <PhoneInput
              id="phone"
              value={form.phone}
              onChange={(value) => updateField("phone", value)}
              placeholder="Enter phone number"
              className={cn(fieldErrors.phone && "border-red-500")}
              disabled={loading}
            />
            {fieldErrors.phone && (
              <p className="text-sm text-red-600">{fieldErrors.phone}</p>
            )}
          </div>

          {/* Username Preview */}
          {usernamePreview && (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">
                Generated Username Preview
              </Label>
              <div className="p-3 bg-muted rounded-md">
                <code className="text-sm font-mono">{usernamePreview}</code>
                <p className="text-xs text-muted-foreground mt-1">
                  This username will be automatically generated and checked for availability
                </p>
              </div>
            </div>
          )}

          {/* Address Field */}
          <div className="space-y-2">
            <Label htmlFor="address" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Address
            </Label>
            <Textarea
              id="address"
              value={form.address}
              onChange={(e) => updateField("address", e.target.value)}
              placeholder="Enter address (optional)"
              rows={3}
              disabled={loading}
            />
          </div>

          {/* Role Field */}
          <div className="space-y-2">
            <Label htmlFor="role" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Role
            </Label>
            <Select
              value={form.role}
              onValueChange={(value: 'user' | 'admin' | 'moderator' | 'field_executive') => 
                updateField("role", value)
              }
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select user role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="field_executive">Field Executive</SelectItem>
                <SelectItem value="moderator">Moderator</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

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
                  Creating User...
                </>
              ) : (
                "Create User"
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

export default UserCreationForm;