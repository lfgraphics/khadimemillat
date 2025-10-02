"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Loading from "@/components/Loading";
import { Search, User, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseApiError, logError } from "@/lib/utils/errorHandling";

export interface SelectedUser {
  id: string; // Clerk ID
  name: string;
  email: string;
  phone?: string;
  address?: string;
  username?: string;
}

interface SearchResult {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  username?: string;
}

interface UserSearchForRequestProps {
  onUserSelect: (user: SelectedUser | null) => void;
  selectedUser: SelectedUser | null;
  disabled?: boolean;
}

interface SearchResponse {
  success: boolean;
  users: SearchResult[];
  total: number;
  error?: string;
  message?: string;
}

const UserSearchForRequest: React.FC<UserSearchForRequestProps> = ({
  onUserSelect,
  selectedUser,
  disabled = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [canRetry, setCanRetry] = useState(false);

  // Debounced search function
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowResults(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const url = new URL('/api/protected/users/search', window.location.origin);
      url.searchParams.set('q', query.trim());
      url.searchParams.set('limit', '10');

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Add timeout handling
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      const data: SearchResponse = await response.json();

      if (!response.ok) {
        // Enhanced error handling based on status codes
        switch (response.status) {
          case 401:
            setError('Session expired. Please refresh the page and try again.');
            break;
          case 403:
            setError('Unauthorized: Only admins and moderators can search users');
            break;
          case 429:
            setError('Too many search requests. Please wait a moment and try again.');
            break;
          case 500:
            setError('Search service temporarily unavailable. Please try again in a few moments.');
            break;
          case 502:
          case 503:
          case 504:
            setError('Service temporarily unavailable. Please try again.');
            break;
          default:
            setError(data.error || `Search failed with error ${response.status}. Please try again.`);
        }
        setSearchResults([]);
        setShowResults(false);
        return;
      }

      if (data.success) {
        setSearchResults(data.users);
        setShowResults(true);
        setError(null);
      } else {
        setError(data.error || 'Search failed. Please try again.');
        setSearchResults([]);
        setShowResults(false);
      }
    } catch (err: any) {
      logError(err, 'user-search', { query: query.substring(0, 50) }); // Log first 50 chars only
      
      const errorDetails = parseApiError(err, 'User search');
      setError(errorDetails.message);
      setCanRetry(errorDetails.retryable);
      
      setSearchResults([]);
      setShowResults(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(searchQuery);
    }, 350);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, performSearch]);

  const handleUserSelect = (user: SearchResult) => {
    // Validate user has minimum required information
    if (!user.name || user.name.trim() === '' || !user.email) {
      setError('Selected user is missing required information (name or email). Please select a different user.');
      return;
    }

    const selectedUser: SelectedUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      username: user.username
    };
    
    onUserSelect(selectedUser);
    setShowResults(false);
    setSearchQuery('');
    setError(null);
  };

  const handleClearSelection = () => {
    onUserSelect(null);
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
    setError(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    // Reset retry state when user types
    setRetryCount(0);
    setCanRetry(false);
    
    // If user clears the input, hide results
    if (!value.trim()) {
      setShowResults(false);
      setSearchResults([]);
      setError(null);
    }
  };

  const handleRetry = () => {
    if (retryCount < 3 && searchQuery.trim()) {
      setRetryCount(prev => prev + 1);
      setCanRetry(false);
      performSearch(searchQuery);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Input Section */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Search for User</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            type="text"
            placeholder="Search by name, email, or username..."
            value={searchQuery}
            onChange={handleInputChange}
            disabled={disabled}
            className="pl-10"
          />
          {isLoading && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <Loading size={4} label="" />
            </div>
          )}
        </div>
      </div>

      {/* Selected User Display */}
      {selectedUser && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  <span className="font-medium text-primary">Selected User</span>
                </div>
                <div className="space-y-1 text-sm">
                  <div><span className="font-medium">Name:</span> {selectedUser.name}</div>
                  <div><span className="font-medium">Email:</span> {selectedUser.email}</div>
                  {selectedUser.phone && (
                    <div><span className="font-medium">Phone:</span> {selectedUser.phone}</div>
                  )}
                  {selectedUser.address && (
                    <div><span className="font-medium">Address:</span> {selectedUser.address}</div>
                  )}
                  {selectedUser.username && (
                    <div><span className="font-medium">Username:</span> {selectedUser.username}</div>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearSelection}
                disabled={disabled}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <p className="text-sm text-destructive">{error}</p>
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
                  disabled={isLoading}
                  className="text-xs"
                >
                  {isLoading ? 'Retrying...' : 'Retry'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Results */}
      {showResults && !selectedUser && (
        <div className="space-y-2">
          {searchResults.length === 0 && !isLoading && searchQuery.trim() && (
            <Card className="border-muted">
              <CardContent className="py-4 text-center">
                <p className="text-sm text-muted-foreground">No users found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Try searching with a different name, email, or username
                </p>
              </CardContent>
            </Card>
          )}

          {searchResults.map((user) => {
            const hasRequiredInfo = user.name && user.name.trim() !== '' && user.email;
            const missingInfo = [];
            if (!user.phone) missingInfo.push('phone');
            if (!user.address) missingInfo.push('address');
            
            return (
              <Card 
                key={user.id} 
                className={cn(
                  "cursor-pointer transition-all hover:border-primary/40 hover:bg-primary/5",
                  disabled && "cursor-not-allowed opacity-50",
                  !hasRequiredInfo && "border-yellow-200 bg-yellow-50"
                )}
                onClick={() => !disabled && handleUserSelect(user)}
              >
                <CardContent className="py-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {user.name || 'Unnamed User'}
                        {!hasRequiredInfo && (
                          <span className="ml-2 text-xs text-yellow-600 font-normal">
                            (Missing required info)
                          </span>
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {hasRequiredInfo ? 'Click to select' : 'Incomplete profile'}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <div>{user.email || 'No email'}</div>
                      <div>Phone: {user.phone || 'Not provided'}</div>
                      <div>Address: {user.address || 'Not provided'}</div>
                      {user.username && <div>Username: {user.username}</div>}
                    </div>
                    {missingInfo.length > 0 && (
                      <div className="text-xs text-yellow-600 mt-2">
                        Note: Missing {missingInfo.join(' and ')} - you'll need to provide this information
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Helper Text */}
      {!selectedUser && !showResults && !error && searchQuery.trim() === '' && (
        <p className="text-xs text-muted-foreground">
          Start typing to search for users by name, email, or username
        </p>
      )}
    </div>
  );
};

export default UserSearchForRequest;