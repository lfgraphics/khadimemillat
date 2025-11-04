"use client";

import React, { useState } from 'react';
import UserSearchForRequest, { SelectedUser } from '@/components/admin/UserSearchForRequest';
import CollectionRequestFormForUser, { CreatedRequest } from '@/components/admin/CollectionRequestFormForUser';
import RequestCreationSuccess from '@/components/admin/RequestCreationSuccess';
import CollectionRequestErrorBoundary from '@/components/admin/CollectionRequestErrorBoundary';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Search, FileText, CheckCircle, AlertCircle } from 'lucide-react';

type FlowStep = 'search' | 'form' | 'success';

export default function CreateCollectionRequestClient() {
    const [currentStep, setCurrentStep] = useState<FlowStep>('search');
    const [selectedUser, setSelectedUser] = useState<SelectedUser | null>(null);
    const [createdRequest, setCreatedRequest] = useState<CreatedRequest | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isOffline, setIsOffline] = useState(false);

    // Network status monitoring
    React.useEffect(() => {
        const handleOnline = () => {
            setIsOffline(false);
            if (error?.includes('network') || error?.includes('connection')) {
                setError(null);
            }
        };
        
        const handleOffline = () => {
            setIsOffline(true);
            setError('You are currently offline. Please check your internet connection.');
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        
        // Check initial status
        setIsOffline(!navigator.onLine);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [error]);

    const handleUserSelect = (user: SelectedUser | null) => {
        setSelectedUser(user);
        setError(null);

        if (user) {
            // Validate that user has minimum required information
            if (!user.name || !user.email) {
                setError('Selected user is missing required information. Please select a different user.');
                return;
            }
            setCurrentStep('form');
        } else {
            setCurrentStep('search');
        }
    };

    const handleRequestCreated = (request: CreatedRequest) => {
        setCreatedRequest(request);
        setCurrentStep('success');
        setError(null);
    };

    const handleError = (errorMessage: string) => {
        setError(errorMessage);
    };

    const handleCreateAnother = () => {
        setCreatedRequest(null);
        setError(null);
        setCurrentStep('form');
    };

    const handleCreateForDifferentUser = () => {
        setCreatedRequest(null);
        setSelectedUser(null);
        setError(null);
        setCurrentStep('search');
    };

    const handleClose = () => {
        setCreatedRequest(null);
        setSelectedUser(null);
        setError(null);
        setCurrentStep('search');
    };

    const handleBackToSearch = () => {
        setSelectedUser(null);
        setCurrentStep('search');
        setError(null);
    };

    return (
        <CollectionRequestErrorBoundary>
            <div className="space-y-6">
                {/* Progress Indicator */}
            <div className="flex items-center justify-center space-x-4 mb-8">
                <div className={`flex items-center space-x-2 ${currentStep === 'search' ? 'text-primary' :
                        currentStep === 'form' || currentStep === 'success' ? 'text-green-600' : 'text-muted-foreground'
                    }`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${currentStep === 'search' ? 'border-primary bg-primary text-primary-foreground' :
                            currentStep === 'form' || currentStep === 'success' ? 'border-green-600 bg-green-600 text-white' :
                                'border-muted-foreground'
                        }`}>
                        {currentStep === 'form' || currentStep === 'success' ? (
                            <CheckCircle className="w-4 h-4" />
                        ) : (
                            <Search className="w-4 h-4" />
                        )}
                    </div>
                    <span className="text-sm font-medium">Select User</span>
                </div>

                <div className={`w-12 h-0.5 ${currentStep === 'form' || currentStep === 'success' ? 'bg-green-600' : 'bg-muted'
                    }`} />

                <div className={`flex items-center space-x-2 ${currentStep === 'form' ? 'text-primary' :
                        currentStep === 'success' ? 'text-green-600' : 'text-muted-foreground'
                    }`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${currentStep === 'form' ? 'border-primary bg-primary text-primary-foreground' :
                            currentStep === 'success' ? 'border-green-600 bg-green-600 text-white' :
                                'border-muted-foreground'
                        }`}>
                        {currentStep === 'success' ? (
                            <CheckCircle className="w-4 h-4" />
                        ) : (
                            <FileText className="w-4 h-4" />
                        )}
                    </div>
                    <span className="text-sm font-medium">Create Request</span>
                </div>

                <div className={`w-12 h-0.5 ${currentStep === 'success' ? 'bg-green-600' : 'bg-muted'
                    }`} />

                <div className={`flex items-center space-x-2 ${currentStep === 'success' ? 'text-primary' : 'text-muted-foreground'
                    }`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${currentStep === 'success' ? 'border-primary bg-primary text-primary-foreground' :
                            'border-muted-foreground'
                        }`}>
                        <CheckCircle className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium">Success</span>
                </div>
            </div>

            {/* Offline Indicator */}
            {isOffline && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        <div className="flex items-center gap-2">
                            <span>You are currently offline. Please check your internet connection.</span>
                        </div>
                    </AlertDescription>
                </Alert>
            )}

            {/* Error Display */}
            {error && !isOffline && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        <div className="flex items-start justify-between gap-3">
                            <span className="flex-1">{error}</span>
                            <button
                                onClick={() => setError(null)}
                                className="text-xs underline hoact:no-underline"
                            >
                                Dismiss
                            </button>
                        </div>
                    </AlertDescription>
                </Alert>
            )}

            {/* Step Content */}
            {currentStep === 'search' && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Search className="w-5 h-5" />
                            Find User
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <UserSearchForRequest
                            onUserSelect={handleUserSelect}
                            selectedUser={selectedUser}
                        />
                    </CardContent>
                </Card>
            )}

            {currentStep === 'form' && selectedUser && (
                <div className="space-y-6">
                    {/* Selected User Summary */}
                    <Card className="border-primary/20 bg-primary/5">
                        <CardContent className="py-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-medium text-primary">Creating request for:</h3>
                                    <p className="text-sm">{selectedUser.name} ({selectedUser.email})</p>
                                </div>
                                <button
                                    onClick={handleBackToSearch}
                                    className="text-sm text-muted-foreground hoact:text-foreground underline"
                                >
                                    Change user
                                </button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Collection Request Form */}
                    <CollectionRequestFormForUser
                        selectedUser={selectedUser}
                        onRequestCreated={handleRequestCreated}
                        onError={handleError}
                    />
                </div>
            )}

            {currentStep === 'success' && createdRequest && (
                <RequestCreationSuccess
                    request={createdRequest}
                    onCreateAnother={handleCreateAnother}
                    onCreateForDifferentUser={handleCreateForDifferentUser}
                    onClose={handleClose}
                />
            )}
            </div>
        </CollectionRequestErrorBoundary>
    );
}