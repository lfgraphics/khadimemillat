"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, User, Mail, Phone, MapPin, Shield, Plus, Key, Share, Copy, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
  const handleCreateRequest = () => {
    onCreateRequest(user);
  };

  const generateWhatsAppMessage = () => {
    const message = `🎉 *Account Created Successfully!*

Hello ${user.name}! Your account has been created for Khadim-Millat Welfare Foundation.

📋 *Your Login Details:*
• *Email:* ${user.email}
• *Username:* ${user.username}
• *Password:* ${user.password}
• *Phone:* ${user.phone}
${user.address ? `• *Address:* ${user.address}` : ''}
• *Role:* ${user.role.charAt(0).toUpperCase() + user.role.slice(1)}

🔐 *Important:*
- Please keep these credentials safe
- You can now log in to the system
- Change your password after first login if needed

Welcome to our community! 🤲🏻`;

    return message;
  };

  const handleWhatsAppShare = () => {
    const message = generateWhatsAppMessage();
    const phoneNumber = user.phone.replace(/[^\d]/g, ''); // Remove non-digits
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleCopyCredentials = () => {
    const credentials = `Account Details for ${user.name}:
Email: ${user.email}
Username: ${user.username}
Password: ${user.password}
Phone: ${user.phone}
${user.address ? `Address: ${user.address}` : ''}
Role: ${user.role.charAt(0).toUpperCase() + user.role.slice(1)}`;

    navigator.clipboard.writeText(credentials);
    toast.success("Credentials copied to clipboard!");
  };

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
          <div className="rounded-full bg-green-100 p-3">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <CardTitle className="text-2xl text-green-700">
          User Created Successfully!
        </CardTitle>
        <CardDescription>
          The new user has been created and added to the system.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* User Information Display */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <User className="h-5 w-5" />
            User Details
          </h3>

          <div className="grid gap-4">
            {/* Name */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Name</span>
              </div>
              <span className="text-sm">{user.name}</span>
            </div>

            {/* Email */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Email</span>
              </div>
              <span className="text-sm">{user.email}</span>
            </div>

            {/* Username */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
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
                    navigator.clipboard.writeText(user.username);
                    toast.success("Username copied!");
                  }}
                  className="h-6 w-6 p-0"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Password */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Key className="h-4 w-4 text-muted-foreground" />
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
                    navigator.clipboard.writeText(user.password);
                    toast.success("Password copied!");
                  }}
                  className="h-6 w-6 p-0"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Phone */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Phone</span>
              </div>
              <span className="text-sm">{user.phone}</span>
            </div>

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
                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
              </Badge>
            </div>
          </div>
        </div>

        <Separator />

        {/* Next Steps */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Next Steps</h3>
          <p className="text-sm text-muted-foreground">
            The user has been successfully created. You can now create a donation request
            for this user or close this dialog to return to the user management page.
          </p>

          <div className="space-y-3">
            <div className="flex gap-3">
              <Button
                onClick={handleCreateRequest}
                className="flex-1"
                size="lg"
              >
                <Plus className="mr-2 h-4 w-4" />
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

            {/* Sharing Options */}
            <div className="flex gap-2">
              <Button
                onClick={handleWhatsAppShare}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                Share on WhatsApp
              </Button>
              <Button
                onClick={handleCopyCredentials}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy All Details
              </Button>
            </div>
          </div>
        </div>

        {/* Additional Information */}
        <div className="space-y-3">
          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-blue-100 dark:bg-blue-900 p-1">
                <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  User Account Created
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  The user account has been created in Clerk and synchronized with the local database.
                  The user can now log in using their email address or username.
                </p>
              </div>
            </div>
          </div>

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
                  The generated password is strong and secure. Please share it securely with the user
                  and advise them to keep it confidential. They can change it after their first login.
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserCreationSuccess;