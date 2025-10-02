/**
 * Validation utilities for collection request creation
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Sanitize and validate address input
 */
export function validateAddress(address: string): ValidationResult {
  if (!address || typeof address !== 'string') {
    return { isValid: false, error: 'Address is required' };
  }

  const sanitized = address.trim();
  
  if (sanitized.length === 0) {
    return { isValid: false, error: 'Address is required' };
  }

  if (sanitized.length < 10) {
    return { isValid: false, error: 'Address must be at least 10 characters' };
  }

  if (sanitized.length > 500) {
    return { isValid: false, error: 'Address must be less than 500 characters' };
  }

  // Check for potentially malicious content
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i
  ];

  if (suspiciousPatterns.some(pattern => pattern.test(sanitized))) {
    return { isValid: false, error: 'Address contains invalid characters' };
  }

  return { isValid: true };
}

/**
 * Sanitize and validate phone number input
 */
export function validatePhone(phone: string): ValidationResult {
  if (!phone || typeof phone !== 'string') {
    return { isValid: false, error: 'Phone number is required' };
  }

  const sanitized = phone.trim();
  
  if (sanitized.length === 0) {
    return { isValid: false, error: 'Phone number is required' };
  }

  // Extract digits only
  const digits = sanitized.replace(/[^0-9]/g, '');
  
  if (digits.length < 10) {
    return { isValid: false, error: 'Phone number must contain at least 10 digits' };
  }

  if (digits.length > 15) {
    return { isValid: false, error: 'Phone number must contain less than 15 digits' };
  }

  // Check for valid phone number pattern (basic validation)
  const phonePattern = /^[\+]?[1-9][\d]{0,15}$/;
  if (!phonePattern.test(digits)) {
    return { isValid: false, error: 'Invalid phone number format' };
  }

  return { isValid: true };
}

/**
 * Validate pickup time
 */
export function validatePickupTime(pickupTime: string | Date): ValidationResult {
  if (!pickupTime) {
    return { isValid: false, error: 'Pickup time is required' };
  }

  let date: Date;
  
  if (typeof pickupTime === 'string') {
    date = new Date(pickupTime);
  } else {
    date = pickupTime;
  }

  if (isNaN(date.getTime())) {
    return { isValid: false, error: 'Invalid pickup time format' };
  }

  const now = new Date();
  const minTime = new Date(now.getTime() + 60 * 60 * 1000); // At least 1 hour from now
  const maxTime = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // Max 1 year from now

  if (date <= now) {
    return { isValid: false, error: 'Pickup time must be in the future' };
  }

  if (date < minTime) {
    return { isValid: false, error: 'Pickup time must be at least 1 hour from now' };
  }

  if (date > maxTime) {
    return { isValid: false, error: 'Pickup time cannot be more than 1 year from now' };
  }

  return { isValid: true };
}

/**
 * Sanitize and validate text input (items, notes)
 */
export function validateTextInput(text: string, fieldName: string, minLength = 0, maxLength = 1000): ValidationResult {
  if (!text || typeof text !== 'string') {
    if (minLength > 0) {
      return { isValid: false, error: `${fieldName} is required` };
    }
    return { isValid: true };
  }

  const sanitized = text.trim();
  
  if (minLength > 0 && sanitized.length === 0) {
    return { isValid: false, error: `${fieldName} is required` };
  }

  if (minLength > 0 && sanitized.length < minLength) {
    return { isValid: false, error: `${fieldName} must be at least ${minLength} characters` };
  }

  if (sanitized.length > maxLength) {
    return { isValid: false, error: `${fieldName} must be less than ${maxLength} characters` };
  }

  // Check for potentially malicious content
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i
  ];

  if (suspiciousPatterns.some(pattern => pattern.test(sanitized))) {
    return { isValid: false, error: `${fieldName} contains invalid characters` };
  }

  return { isValid: true };
}

/**
 * Validate user selection
 */
export function validateSelectedUser(user: any): ValidationResult {
  if (!user) {
    return { isValid: false, error: 'Please select a user' };
  }

  if (!user.id || typeof user.id !== 'string' || user.id.trim().length === 0) {
    return { isValid: false, error: 'Selected user has invalid ID' };
  }

  if (!user.name || typeof user.name !== 'string' || user.name.trim().length === 0) {
    return { isValid: false, error: 'Selected user is missing name information' };
  }

  if (!user.email || typeof user.email !== 'string' || user.email.trim().length === 0) {
    return { isValid: false, error: 'Selected user is missing email information' };
  }

  // Basic email validation
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(user.email.trim())) {
    return { isValid: false, error: 'Selected user has invalid email format' };
  }

  return { isValid: true };
}

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeString(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Comprehensive form validation for collection request
 */
export interface CollectionRequestFormData {
  address: string;
  phone: string;
  pickupTime: string;
  items?: string;
  notes?: string;
}

export interface FormValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export function validateCollectionRequestForm(
  data: CollectionRequestFormData,
  selectedUser: any
): FormValidationResult {
  const errors: Record<string, string> = {};

  // Validate selected user
  const userValidation = validateSelectedUser(selectedUser);
  if (!userValidation.isValid) {
    errors.user = userValidation.error!;
  }

  // Validate address
  const addressValidation = validateAddress(data.address);
  if (!addressValidation.isValid) {
    errors.address = addressValidation.error!;
  }

  // Validate phone
  const phoneValidation = validatePhone(data.phone);
  if (!phoneValidation.isValid) {
    errors.phone = phoneValidation.error!;
  }

  // Validate pickup time
  const pickupTimeValidation = validatePickupTime(data.pickupTime);
  if (!pickupTimeValidation.isValid) {
    errors.pickupTime = pickupTimeValidation.error!;
  }

  // Validate items (optional)
  if (data.items) {
    const itemsValidation = validateTextInput(data.items, 'Items description', 5, 500);
    if (!itemsValidation.isValid) {
      errors.items = itemsValidation.error!;
    }
  }

  // Validate notes (optional)
  if (data.notes) {
    const notesValidation = validateTextInput(data.notes, 'Notes', 5, 1000);
    if (!notesValidation.isValid) {
      errors.notes = notesValidation.error!;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}