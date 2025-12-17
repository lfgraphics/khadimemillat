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
  firstName: string
  lastName: string // Required by Clerk
  phone: string
  email?: string
  address?: string
  role?: 'user' | 'admin' | 'moderator' | 'field_executive'
  skipPassword: boolean // Mobile-first OTP login by default
}


export interface CreatedUserDisplay {
  id: string
  firstName: string
  lastName: string // Required by Clerk
  phoneNumber: string
  email?: string
  username?: string // Only if password created
  password?: string // Only if password created
  address?: string
  role: string
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
  const [formData, setFormData] = useState<UserCreationFormData>({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    address: '',
    role: 'user',
    skipPassword: true // Default to mobile-first OTP
  })
  const [errors, setErrors] = useState<Partial<Record<keyof UserCreationFormData, string>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createdUser, setCreatedUser] = useState<CreatedUserDisplay | null>(null)

  // Validate email format
  const isValidEmail = (email: string): boolean => {
    if (!email) return true // Email is optional
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // Validate phone format (basic validation)
  const isValidPhone = (phone: string): boolean => {
    const phoneDigits = phone.replace(/\D/g, '')
    return phoneDigits.length >= 10
  }

  const updateField = <K extends keyof UserCreationFormData>(
    key: K,
    value: UserCreationFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    // Clear field-specific error when user starts typing
    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: "" }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof UserCreationFormData, string>> = {}

    if (!formData.firstName?.trim()) {
      newErrors.firstName = 'First name is required'
    }

    if (!formData.lastName?.trim()) {
      newErrors.lastName = 'Last name is required'
    }

    if (!formData.phone?.trim()) {
      newErrors.phone = 'Phone number is required'
    } else if (!isValidPhone(formData.phone)) {
      newErrors.phone = 'Phone number must be at least 10 digits'
    }

    if (formData.email && !isValidEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/protected/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      console.log('[FORM] Response received:', { ok: response.ok, data })

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create user')
      }

      if (data.success && data.user) {
        const displayUser: CreatedUserDisplay = {
          id: data.user.id,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phoneNumber: data.user.phoneNumber,
          email: formData.email,
          username: data.user.username, // Only present if skipPassword=false
          password: data.user.password, // Only present if skipPassword=false
          address: formData.address,
          role: formData.role || 'user'
        }
        console.log('[FORM] Setting created user:', displayUser)
        setCreatedUser(displayUser)
        onUserCreated(displayUser)
      } else {
        throw new Error('Invalid response from server')
      }
    } catch (error) {
      console.error('Error creating user:', error)
      alert(error instanceof Error ? error.message : 'Failed to create user')
    } finally {
      setIsSubmitting(false)
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      {!createdUser ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* First Name Field */}
          <div className="space-y-2">
            <Label htmlFor="firstName" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              First Name
              <span className="text-red-500">*</span>
            </Label>
            <Input
              id="firstName"
              type="text"
              placeholder="Enter first name"
              value={formData.firstName}
              onChange={(e) => updateField('firstName', e.target.value)}
              className={errors.firstName ? 'border-red-500' : ''}
              disabled={isSubmitting}
            />
            {errors.firstName && (
              <p className="text-sm text-red-500">{errors.firstName}</p>
            )}
          </div>

          {/* Last Name Field */}
          <div className="space-y-2">
            <Label htmlFor="lastName" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Last Name
              <span className="text-red-500">*</span>
            </Label>
            <Input
              id="lastName"
              type="text"
              placeholder="Enter last name"
              value={formData.lastName}
              onChange={(e) => updateField('lastName', e.target.value)}
              className={errors.lastName ? 'border-red-500' : ''}
              disabled={isSubmitting}
            />
            {errors.lastName && (
              <p className="text-sm text-red-500">{errors.lastName}</p>
            )}
          </div>

          {/* Phone Field */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Phone Number
              <span className="text-red-500">*</span>
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="Enter 10-digit phone number"
              value={formData.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              className={errors.phone ? 'border-red-500' : ''}
              disabled={isSubmitting}
            />
            {errors.phone && (
              <p className="text-sm text-red-500">{errors.phone}</p>
            )}
            <p className="text-xs text-muted-foreground">User will login with this phone number via OTP</p>
          </div>

          {/* Email Field (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email
              <span className="text-xs text-muted-foreground">(Optional)</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter email address (optional)"
              value={formData.email}
              onChange={(e) => updateField('email', e.target.value)}
              className={errors.email ? 'border-red-500' : ''}
              disabled={isSubmitting}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email}</p>
            )}
          </div>

          {/* Address Field */}
          <div className="space-y-2">
            <Label htmlFor="address" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Address
              <span className="text-xs text-muted-foreground">(Optional)</span>
            </Label>
            <Input
              id="address"
              type="text"
              placeholder="Enter address"
              value={formData.address}
              onChange={(e) => updateField('address', e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          {/* Role Selection */}
          <div className="space-y-2">
            <Label htmlFor="role" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Role
            </Label>
            <select
              id="role"
              value={formData.role}
              onChange={(e) => updateField('role', e.target.value as UserCreationFormData['role'])}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isSubmitting}
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
              <option value="moderator">Moderator</option>
              <option value="field_executive">Field Executive</option>
            </select>
          </div>

          {/* Password Option */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="skipPassword"
                checked={formData.skipPassword}
                onChange={(e) => updateField('skipPassword', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
                disabled={isSubmitting}
              />
              <Label htmlFor="skipPassword" className="cursor-pointer">
                Mobile-first OTP login (recommended)
              </Label>
            </div>
            <p className="text-xs text-muted-foreground ml-6">
              {formData.skipPassword
                ? 'User will login with phone number and OTP. No username/password required.'
                : 'System will generate username and password for traditional login.'}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating User...
                </>
              ) : (
                "Create User"
              )}
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-green-900 mb-2">User Created Successfully!</h3>
            <div className="space-y-2 text-sm">
              <p><strong>Name:</strong> {createdUser.firstName} {createdUser.lastName}</p>
              <p><strong>Phone:</strong> {createdUser.phoneNumber}</p>
              {createdUser.email && <p><strong>Email:</strong> {createdUser.email}</p>}
              {createdUser.username && <p><strong>Username:</strong> {createdUser.username}</p>}
              {createdUser.password && <p><strong>Password:</strong> {createdUser.password}</p>}
              <p><strong>Role:</strong> {createdUser.role}</p>
            </div>
          </div>
          <Button onClick={() => setCreatedUser(null)}>Create Another User</Button>
        </div>
      )}
    </div>
  );
};

export default UserCreationForm;
