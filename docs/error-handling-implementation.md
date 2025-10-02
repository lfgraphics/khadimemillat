# Error Handling Implementation

This document outlines the comprehensive error handling implementation for the admin collection request creation feature.

## Overview

The error handling system provides:
- User-friendly error messages for all failure scenarios
- Network error handling with retry mechanisms
- Graceful error states for missing user data
- Comprehensive validation error display
- Offline detection and handling
- Error boundaries for component failures

## Components

### 1. UserSearchForRequest Component

**Error Scenarios Handled:**
- Network connection failures
- API timeout errors (10-second timeout)
- Authentication/authorization errors (401, 403)
- Rate limiting (429)
- Server errors (500, 502, 503, 504)
- Invalid user data (missing name/email)
- Empty search results

**Features:**
- Retry mechanism (up to 3 attempts)
- Debounced search (350ms delay)
- User-friendly error messages
- Visual indicators for incomplete user profiles
- Automatic error clearing on user input

**Error Display:**
```typescript
// Error card with retry button
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
        <Button variant="outline" size="sm" onClick={handleRetry}>
          {isLoading ? 'Retrying...' : 'Retry'}
        </Button>
      )}
    </div>
  </CardContent>
</Card>
```

### 2. CollectionRequestFormForUser Component

**Error Scenarios Handled:**
- Form validation errors (address, phone, pickup time)
- User not found/no longer available
- Missing user information
- Invalid pickup time (past dates)
- Network timeouts (30-second timeout)
- Server validation errors
- Duplicate request errors

**Features:**
- Real-time validation with field-specific error messages
- Input sanitization to prevent XSS
- Retry mechanism for transient failures
- Comprehensive server error parsing
- Loading states during submission

**Validation Implementation:**
```typescript
const validateForm = (): boolean => {
  const validation = validateCollectionRequestForm(formData, selectedUser);
  setValidationErrors(validation.errors);
  return validation.isValid;
};
```

### 3. CreateCollectionRequestClient Component

**Error Scenarios Handled:**
- Network connectivity issues
- Offline detection
- Component-level errors
- State management errors
- User selection validation

**Features:**
- Network status monitoring
- Offline indicator
- Error dismissal functionality
- Progress tracking with error states

**Network Monitoring:**
```typescript
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
  
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}, [error]);
```

### 4. RequestCreationSuccess Component

**Error Scenarios Handled:**
- Invalid request data display
- Date formatting errors
- Missing request information

**Features:**
- Data validation before display
- Graceful fallback for formatting errors
- Error state display for invalid data

### 5. CollectionRequestErrorBoundary Component

**Error Scenarios Handled:**
- React component crashes
- Rendering errors
- JavaScript exceptions

**Features:**
- Error boundary with fallback UI
- Retry mechanism
- Technical error details (expandable)
- Page reload option

## API Routes

### 1. User Search API (/api/protected/users/search)

**Error Scenarios Handled:**
- Authentication failures
- Authorization errors (role-based)
- Clerk API failures
- Rate limiting
- Network timeouts
- Invalid search queries

**Error Response Format:**
```typescript
{
  success: false,
  error: "User-friendly error message",
  users: [],
  total: 0
}
```

### 2. Collection Request Creation API (/api/protected/collection-requests/admin)

**Error Scenarios Handled:**
- Validation errors (Zod schema)
- User verification failures
- Database connection issues
- Duplicate request detection
- Notification failures

**Enhanced Error Handling:**
```typescript
// Fixed deprecated flatten() method
if (!parsed.success) {
  const fieldErrors: Record<string, string[]> = {}
  parsed.error.issues.forEach(issue => {
    const field = issue.path.join('.')
    if (!fieldErrors[field]) {
      fieldErrors[field] = []
    }
    fieldErrors[field].push(issue.message)
  })
  
  return NextResponse.json({ 
    error: 'Validation failed',
    details: fieldErrors
  }, { status: 400 })
}
```

## Services

### 1. Collection Request Service

**Error Scenarios Handled:**
- MongoDB connection failures
- Validation errors
- Duplicate key errors
- Network timeouts
- User lookup failures
- Notification failures

**Enhanced Error Handling:**
```typescript
// MongoDB specific error handling
if (error.code === 11000) {
  throw new Error('A similar collection request already exists for this user and time.')
}

if (error.name === 'ValidationError') {
  const validationErrors = Object.values(error.errors).map((err: any) => err.message).join(', ')
  throw new Error(`Validation failed: ${validationErrors}`)
}

if (error.name === 'MongoTimeoutError' || error.name === 'MongoNetworkTimeoutError') {
  throw new Error('Database connection timed out. Please try again in a few moments.')
}
```

## Utilities

### 1. Error Handling Utilities (lib/utils/errorHandling.ts)

**Features:**
- Centralized error parsing
- User-friendly message generation
- Retry logic determination
- Error logging with context
- Network error detection

**Key Functions:**
- `parseApiError()` - Parse and categorize errors
- `formatErrorMessage()` - Format for user display
- `isRetryableError()` - Determine if retry is appropriate
- `logError()` - Log with appropriate level
- `retryOperation()` - Retry with exponential backoff

### 2. Validation Utilities (lib/utils/validation.ts)

**Features:**
- Input sanitization (XSS prevention)
- Field-specific validation
- Comprehensive form validation
- User data validation

**Key Functions:**
- `validateAddress()` - Address validation with length and content checks
- `validatePhone()` - Phone number validation with digit extraction
- `validatePickupTime()` - Future date validation with reasonable limits
- `sanitizeString()` - XSS prevention
- `validateCollectionRequestForm()` - Complete form validation

## Error Message Standards

### User-Friendly Messages
- Clear, actionable language
- No technical jargon
- Specific guidance when possible
- Consistent tone and style

### Examples:
- ❌ "Network error: fetch failed"
- ✅ "Connection error. Please check your internet connection and try again."

- ❌ "Validation error: required field missing"
- ✅ "Address is required. Please enter a pickup address."

- ❌ "MongoDB timeout error"
- ✅ "Service temporarily unavailable. Please try again in a few moments."

## Retry Logic

### Automatic Retries
- Network errors: Up to 3 retries with exponential backoff
- Timeout errors: Up to 3 retries
- Server errors (5xx): Up to 3 retries

### Manual Retries
- User-initiated retry buttons
- Form resubmission after fixing validation errors
- Search retry after network issues

### Non-Retryable Errors
- Validation errors (400)
- Authentication errors (401)
- Authorization errors (403)
- Not found errors (404)
- Duplicate data errors (409)

## Testing Error Scenarios

### Network Errors
1. Disconnect internet during search
2. Slow network simulation
3. Server timeout simulation

### Validation Errors
1. Submit form with missing required fields
2. Enter invalid phone numbers
3. Select past pickup times

### Server Errors
1. Database connection failures
2. Invalid user data
3. Duplicate request creation

### Component Errors
1. Invalid props passed to components
2. Rendering errors with malformed data
3. JavaScript exceptions in event handlers

## Monitoring and Logging

### Error Logging
- Client-side errors logged to console with context
- Server-side errors logged with request details
- User actions tracked for debugging

### Error Metrics
- Error rates by component
- Most common error types
- User retry patterns
- Success rates after retries

## Future Enhancements

1. **Error Analytics**: Implement error tracking service
2. **Smart Retry**: Adaptive retry logic based on error patterns
3. **Offline Support**: Cache requests for offline submission
4. **Error Recovery**: Automatic data recovery from local storage
5. **User Feedback**: Allow users to report persistent errors