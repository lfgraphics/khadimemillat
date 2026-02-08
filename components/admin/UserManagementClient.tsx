"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UserCreationForm, CreatedUserDisplay } from "@/components/admin/UserCreationForm";
import { UserCreationSuccess } from "@/components/admin/UserCreationSuccess";
import { CreateDonationRequestForm } from "@/components/admin/CreateDonationRequestForm";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { errorLogger } from "@/lib/utils/errorHandling";

interface UserManagementClientProps {
  children: React.ReactNode;
}

type ModalState = 'closed' | 'create-user' | 'user-success' | 'create-request';

export const UserManagementClient: React.FC<UserManagementClientProps> = ({ children }) => {
  const [modalState, setModalState] = useState<ModalState>('closed');
  const [createdUser, setCreatedUser] = useState<CreatedUserDisplay | null>(null);
  const router = useRouter();

  const handleCreateUserClick = () => {
    setModalState('create-user');
  };

  const handleUserCreated = (user: CreatedUserDisplay) => {
    try {
      setCreatedUser(user);
      setModalState('user-success');
      toast.success("User created successfully!", {
        description: `${user.firstName} ${user.lastName} has been added to the system.`,
      });
      // Refresh the page to show the new user in the list
      router.refresh();
    } catch (err) {
      errorLogger.logWorkflowError(err as Error, 'user_creation_success', {
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
      });
      toast.error("Error processing user creation", {
        description: "The user was created but there was an issue displaying the success page.",
      });
    }
  };

  const handleCreateRequest = (user: CreatedUserDisplay) => {
    try {
      setModalState('create-request');
    } catch (err) {
      errorLogger.logWorkflowError(err as Error, 'transition_to_request_creation', {
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
      });
      toast.error("Error opening donation request form", {
        description: "Please try clicking the Create Request button again.",
      });
    }
  };

  const handleRequestCreated = (request: any) => {
    try {
      toast.success("Donation request created!", {
        description: `Request for ${request.userName} created. ${request.fieldExecutiveNotificationsSent} field executive(s) notified.`,
      });
      // Return to user success modal instead of closing completely
      setModalState('user-success');
    } catch (err) {
      errorLogger.logWorkflowError(err as Error, 'request_creation_success', {
        requestId: request.id,
        userId: request.userId,
        userName: request.userName,
      });
      toast.error("Error processing request creation", {
        description: "The donation request was created successfully, but there was an issue with the interface.",
      });
      // Still return to user success modal even if there's an error
      setModalState('user-success');
    }
  };

  const handleCloseModal = () => {
    setModalState('closed');
    setCreatedUser(null);
  };

  const handleCancelUserCreation = () => {
    setModalState('closed');
  };

  const handleCancelRequestCreation = () => {
    setModalState('user-success');
  };

  const handleRequestCreationError = (error: string) => {
    toast.error("Failed to create donation request", {
      description: error,
    });
  };

  return (
    <>
      {/* Header with Create User Button */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-muted-foreground">
            Manage users and their roles. Search for users to view and modify their information.
          </p>
        </div>
        <Button onClick={handleCreateUserClick} size="lg">
          <Plus className="mr-2 h-4 w-4" />
          Create New User
        </Button>
      </div>

      {/* Main Content */}
      {children}

      {/* User Creation Modal */}
      <Dialog open={modalState === 'create-user'} onOpenChange={(open) => !open && handleCancelUserCreation()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
          </DialogHeader>
          <UserCreationForm
            onUserCreated={handleUserCreated}
            onCancel={handleCancelUserCreation}
          />
        </DialogContent>
      </Dialog>

      {/* User Creation Success Modal */}
      <Dialog open={modalState === 'user-success'} onOpenChange={(open) => !open && handleCloseModal()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User Created Successfully</DialogTitle>
          </DialogHeader>
          {createdUser && (
            <UserCreationSuccess
              user={createdUser}
              onCreateRequest={handleCreateRequest}
              onClose={handleCloseModal}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Donation Request Creation Modal */}
      <Dialog open={modalState === 'create-request'} onOpenChange={(open) => !open && handleCancelRequestCreation()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Donation Request</DialogTitle>
          </DialogHeader>
          {createdUser && (
            <CreateDonationRequestForm
              user={createdUser}
              onRequestCreated={handleRequestCreated}
              onCancel={handleCancelRequestCreation}
              onError={handleRequestCreationError}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UserManagementClient;