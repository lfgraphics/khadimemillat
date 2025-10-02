"use client";

import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, ExternalLink, Phone, Mail } from "lucide-react";

interface ActionableErrorAlertProps {
  error: string;
  onRetry?: () => void;
  className?: string;
}

interface ErrorAction {
  label: string;
  icon: React.ReactNode;
  action: () => void;
  variant?: "default" | "outline" | "secondary";
}

export const ActionableErrorAlert: React.FC<ActionableErrorAlertProps> = ({
  error,
  onRetry,
  className,
}) => {
  const getErrorActions = (errorMessage: string): ErrorAction[] => {
    const actions: ErrorAction[] = [];

    // Add retry action if available
    if (onRetry) {
      actions.push({
        label: "Try Again",
        icon: <RefreshCw className="h-4 w-4" />,
        action: onRetry,
        variant: "default",
      });
    }

    // Specific actions based on error type
    if (errorMessage.includes('email')) {
      actions.push({
        label: "Check Email Format",
        icon: <Mail className="h-4 w-4" />,
        action: () => {
          // Focus on email field if it exists
          const emailInput = document.getElementById('email') as HTMLInputElement;
          if (emailInput) {
            emailInput.focus();
            emailInput.select();
          }
        },
        variant: "outline",
      });
    }

    if (errorMessage.includes('phone')) {
      actions.push({
        label: "Check Phone Number",
        icon: <Phone className="h-4 w-4" />,
        action: () => {
          // Focus on phone field if it exists
          const phoneInput = document.getElementById('phone') as HTMLInputElement;
          if (phoneInput) {
            phoneInput.focus();
            phoneInput.select();
          }
        },
        variant: "outline",
      });
    }

    if (errorMessage.includes('network') || errorMessage.includes('connection')) {
      actions.push({
        label: "Check Connection",
        icon: <ExternalLink className="h-4 w-4" />,
        action: () => {
          // Open network troubleshooting in new tab
          window.open('https://www.google.com', '_blank');
        },
        variant: "outline",
      });
    }

    return actions;
  };

  const getErrorTitle = (errorMessage: string): string => {
    if (errorMessage.includes('email')) {
      return "Email Issue";
    }
    if (errorMessage.includes('phone')) {
      return "Phone Number Issue";
    }
    if (errorMessage.includes('network') || errorMessage.includes('connection')) {
      return "Connection Problem";
    }
    if (errorMessage.includes('validation')) {
      return "Validation Error";
    }
    if (errorMessage.includes('permission') || errorMessage.includes('Unauthorized')) {
      return "Permission Error";
    }
    return "Error";
  };

  const getErrorGuidance = (errorMessage: string): string => {
    if (errorMessage.includes('email')) {
      return "Please check that the email address is correctly formatted and not already in use.";
    }
    if (errorMessage.includes('phone')) {
      return "Please ensure the phone number contains at least 10 digits and is in a valid format.";
    }
    if (errorMessage.includes('network') || errorMessage.includes('connection')) {
      return "Please check your internet connection and try again. If the problem persists, contact support.";
    }
    if (errorMessage.includes('validation')) {
      return "Please review all form fields and ensure they meet the requirements.";
    }
    if (errorMessage.includes('permission') || errorMessage.includes('Unauthorized')) {
      return "You may not have the necessary permissions. Please contact an administrator.";
    }
    if (errorMessage.includes('pickup time') || errorMessage.includes('time')) {
      return "Please select a pickup time that is at least 1 hour in the future.";
    }
    return "Please try again. If the problem continues, contact support.";
  };

  const actions = getErrorActions(error);
  const title = getErrorTitle(error);
  const guidance = getErrorGuidance(error);

  return (
    <Alert variant="destructive" className={className}>
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="space-y-3">
        <div>
          <p className="font-medium">{error}</p>
          <p className="text-sm mt-1 opacity-90">{guidance}</p>
        </div>
        
        {actions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {actions.map((action, index) => (
              <Button
                key={index}
                size="sm"
                variant={action.variant || "outline"}
                onClick={action.action}
                className="h-8"
              >
                {action.icon}
                <span className="ml-1">{action.label}</span>
              </Button>
            ))}
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
};

export default ActionableErrorAlert;