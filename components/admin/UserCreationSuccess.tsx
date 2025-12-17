"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, User, Mail, Phone, MapPin, Shield, Key, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface CreatedUserDisplay {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;  
  email?: string;
  username?: string; // Only if password created
  password?: string; // Only if password created
  address?: string;
  role: string;
}

interface UserCreationSuccessProps {
  user: CreatedUserDisplay;
  onCreateRequest: (user: CreatedUserDisplay) => void;
  onClose: () => void;
  className?: string;
}

export const UserCreationSuccess: React.FC<UserCreationSuccessProps> = ({
  user,
  onCreateRequest,
  onClose,
  className,
}) => {
  const hasCredentials = !!(user.username && user.password);

  const getRoleBadgeVariant = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'destructive';
      case 'moderator':
        return 'default';
      case 'field_executive':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <Card className={cn("w-full max-w-2xl mx-auto", className)}>
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="rounded-full bg-green-100 dark:bg-green-900 p-3">
            <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
        </div>
        <CardTitle className="text-2xl text-green-700 dark:text-green-400">
          User Created Successfully!
        </CardTitle>
        <CardDescription>
          {hasCredentials
            ? "Account created with username and password"
            : "Account created - user will login with phone number via OTP"}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* User Information Display */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <User className="h-5 w-5" />
            User Details
          </h3>

          <div className="grid gap-3">
            {/* Name */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Name</span>
              </div>
              <span className="text-sm">{user.firstName} {user.lastName}</span>
            </div>

            {/* Phone */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Phone</span>
              </div>
              <span className="text-sm font-mono">{user.phoneNumber}</span>
            </div>

            {/* Email (if provided) */}
            {user.email && (
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Email</span>
                </div>
                <span className="text-sm">{user.email}</span>
              </div>
            )}

            {/* Username (only if credentials generated) */}
            {user.username && (
              <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <span className="font-medium">Username</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="text-sm bg-background px-2 py-1 rounded border">
                    {user.username}
                  </code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      navigator.clipboard.writeText(user.username!);
                      toast.success("Username copied!");
                    }}
                    className="h-6 w-6 p-0"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}

            {/* Password (only if credentials generated) */}
            {user.password && (
              <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-3">
                  <Key className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <span className="font-medium">Password</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="text-sm bg-background px-2 py-1 rounded border font-mono">
                    {user.password}
                  </code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      navigator.clipboard.writeText(user.password!);
                      toast.success("Password copied!");
                    }}
                    className="h-6 w-6 p-0"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}

            {/* Address */}
            {user.address && (
              <div className="flex items-start justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span className="font-medium">Address</span>
                </div>
                <span className="text-sm text-right max-w-xs">{user.address}</span>
              </div>
            )}

            {/* Role */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Role</span>
              </div>
              <Badge variant={getRoleBadgeVariant(user.role)}>
                {user.role.charAt(0).toUpperCase() + user.role.slice(1).replace('_', ' ')}
              </Badge>
            </div>
          </div>
        </div>

        <Separator />

        {/* Notification Status */}
        <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-green-100 dark:bg-green-900 p-1">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-green-900 dark:text-green-100">
                WhatsApp Notification Sent
              </p>
              <p className="text-xs text-green-700 dark:text-green-300">
                {hasCredentials
                  ? "User credentials have been sent via WhatsApp to their registered number."
                  : "Welcome message sent via WhatsApp. User can login with phone number and OTP."}
              </p>
            </div>
          </div>
        </div>

        {/* Security Notice (only if credentials generated) */}
        {hasCredentials && (
          <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-amber-100 dark:bg-amber-900 p-1">
                <Key className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                  Security Notice
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  The generated password is strong and secure. User can change it after their first login.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <Button
            onClick={() => onCreateRequest(user)}
            className="flex-1"
            size="lg"
          >
            Create Donation Request
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
            size="lg"
          >
            Close
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserCreationSuccess;