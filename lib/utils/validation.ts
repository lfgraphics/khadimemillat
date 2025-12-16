// Validation utility functions for marketplace listing and forms

import { EnhancedScrapItem, ValidationStatus, ItemCondition } from '@/types/dashboard'

// Types for collection request validation
interface CollectionRequestFormData {
  address: string;
  phone: string;
  pickupTime: string;
  items?: string;
  notes?: string;
}

interface SelectedUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  username?: string;
}

interface ValidationErrors {
  address?: string;
  phone?: string;
  pickupTime?: string;
  items?: string;
  notes?: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationErrors;
}

// Calculate validation status for an item
export function calculateValidationStatus(item: EnhancedScrapItem): ValidationStatus {
  const errors: string[] = []
  const warnings: string[] = []
  
  // Required fields for marketplace listing
  if (!item.marketplaceListing.demandedPrice || item.marketplaceListing.demandedPrice <= 0) {
    errors.push('Price is required for marketplace listing')
  }
  
  // Photo validation
  if (item.photos.before.length === 0) {
    warnings.push('Before photos are recommended for better listings')
  }
  
  if (item.photos.after.length === 0 && item.condition === 'repairable') {
    warnings.push('After photos are recommended for repaired items')
  }
  
  // Description validation
  if (!item.marketplaceListing.description && item.marketplaceListing.listed) {
    warnings.push('Marketplace description is recommended for better sales')
  }
  
  // Condition validation
  if (item.condition === 'scrap' && item.marketplaceListing.listed) {
    errors.push('Scrap items cannot be listed on marketplace')
  }
  
  // Name validation
  if (!item.name || item.name.trim().length < 3) {
    errors.push('Item name must be at least 3 characters long')
  }
  
  // Price validation for sold items
  if (item.marketplaceListing.sold && !item.marketplaceListing.salePrice) {
    errors.push('Sale price is required for sold items')
  }
  
  // Logical validation
  if (item.marketplaceListing.sold && !item.marketplaceListing.listed) {
    warnings.push('Item is marked as sold but was never listed')
  }
  
  return {
    canList: errors.length === 0,
    errors,
    warnings
  }
}

// Validate multiple items
export function validateItems(items: EnhancedScrapItem[]): Record<string, ValidationStatus> {
  const validationResults: Record<string, ValidationStatus> = {}
  
  items.forEach(item => {
    validationResults[item.id] = calculateValidationStatus(item)
  })
  
  return validationResults
}

// Check if item can be listed on marketplace
export function canListItem(item: EnhancedScrapItem): boolean {
  const validation = calculateValidationStatus(item)
  return validation.canList
}

// Get validation summary for a collection of items
export function getValidationSummary(items: EnhancedScrapItem[]) {
  const validItems = items.filter(item => canListItem(item))
  const invalidItems = items.filter(item => !canListItem(item))
  const itemsWithoutPrice = items.filter(item => 
    !item.marketplaceListing.demandedPrice || item.marketplaceListing.demandedPrice <= 0
  )
  
  return {
    total: items.length,
    valid: validItems.length,
    invalid: invalidItems.length,
    withoutPrice: itemsWithoutPrice.length,
    validPercentage: items.length > 0 ? Math.round((validItems.length / items.length) * 100) : 0
  }
}

// Validation rules for different item conditions
export const CONDITION_RULES: Record<ItemCondition, {
  canList: boolean
  requiredFields: string[]
  recommendedFields: string[]
}> = {
  'new': {
    canList: true,
    requiredFields: ['name', 'demandedPrice'],
    recommendedFields: ['description', 'beforePhotos']
  },
  'good': {
    canList: true,
    requiredFields: ['name', 'demandedPrice'],
    recommendedFields: ['description', 'beforePhotos']
  },
  'repairable': {
    canList: true,
    requiredFields: ['name', 'demandedPrice'],
    recommendedFields: ['description', 'beforePhotos', 'afterPhotos', 'repairingCost']
  },
  'scrap': {
    canList: false,
    requiredFields: [],
    recommendedFields: []
  },
  'not applicable': {
    canList: false,
    requiredFields: [],
    recommendedFields: []
  }
}

// Get validation rules for a specific condition
export function getConditionRules(condition: ItemCondition) {
  return CONDITION_RULES[condition]
}

// Validate item based on its condition
export function validateItemByCondition(item: EnhancedScrapItem): ValidationStatus {
  const rules = getConditionRules(item.condition)
  const errors: string[] = []
  const warnings: string[] = []
  
  if (!rules.canList) {
    errors.push(`Items with condition "${item.condition}" cannot be listed on marketplace`)
    return { canList: false, errors, warnings }
  }
  
  // Check required fields
  if (rules.requiredFields.includes('name') && (!item.name || item.name.trim().length < 3)) {
    errors.push('Item name is required and must be at least 3 characters')
  }
  
  if (rules.requiredFields.includes('demandedPrice') && 
      (!item.marketplaceListing.demandedPrice || item.marketplaceListing.demandedPrice <= 0)) {
    errors.push('Price is required for marketplace listing')
  }
  
  // Check recommended fields
  if (rules.recommendedFields.includes('description') && !item.marketplaceListing.description) {
    warnings.push('Description is recommended for better listings')
  }
  
  if (rules.recommendedFields.includes('beforePhotos') && item.photos.before.length === 0) {
    warnings.push('Before photos are recommended')
  }
  
  if (rules.recommendedFields.includes('afterPhotos') && item.photos.after.length === 0) {
    warnings.push('After photos are recommended for repaired items')
  }
  
  if (rules.recommendedFields.includes('repairingCost') && !item.repairingCost) {
    warnings.push('Repairing cost helps track profitability')
  }
  
  return {
    canList: errors.length === 0,
    errors,
    warnings
  }
}

// Format validation errors for display
export function formatValidationErrors(validation: ValidationStatus): string {
  if (validation.errors.length === 0) return ''
  
  if (validation.errors.length === 1) {
    return validation.errors[0]
  }
  
  return `${validation.errors.length} issues: ${validation.errors.join(', ')}`
}

// Format validation warnings for display
export function formatValidationWarnings(validation: ValidationStatus): string {
  if (validation.warnings.length === 0) return ''
  
  if (validation.warnings.length === 1) {
    return validation.warnings[0]
  }
  
  return `${validation.warnings.length} suggestions: ${validation.warnings.join(', ')}`
}

// Sanitize string to prevent XSS attacks
export function sanitizeString(input: string): string {
  if (!input) return input;
  
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
}

// Validate phone number format (with country code)
function validatePhone(phone: string): string | undefined {
  if (!phone || !phone.trim()) {
    return 'Phone number is required';
  }
  
  // Check if phone number has country code format (+XX XXXXXXXXXX)
  const countryCodeFormat = /^\+\d{1,4}\s\d{4,15}$/;
  if (countryCodeFormat.test(phone.trim())) {
    return undefined; // Valid format with country code
  }
  
  // Fallback: check if it's just digits (legacy format)
  const cleanPhone = phone.replace(/\D/g, '');
  
  if (cleanPhone.length < 10) {
    return 'Phone number must be at least 10 digits';
  }
  
  if (cleanPhone.length > 15) {
    return 'Phone number cannot exceed 15 digits';
  }
  
  return undefined;
}

// Validate pickup time
function validatePickupTime(pickupTime: string): string | undefined {
  if (!pickupTime || !pickupTime.trim()) {
    return 'Pickup time is required';
  }
  
  const pickupDate = new Date(pickupTime);
  const now = new Date();
  
  if (isNaN(pickupDate.getTime())) {
    return 'Invalid pickup time format';
  }
  
  // Only validate that it's not in the past
  if (pickupDate <= now) {
    return 'Pickup time must be in the future';
  }
  
  return undefined;
}

// Validate address
function validateAddress(address: string): string | undefined {
  if (!address || !address.trim()) {
    return 'Address is required';
  }
  
  if (address.trim().length < 10) {
    return 'Address must be at least 10 characters long';
  }
  
  if (address.trim().length > 500) {
    return 'Address cannot exceed 500 characters';
  }
  
  return undefined;
}

// Validate optional items description
function validateItemsDescription(items?: string): string | undefined {
  if (!items) return undefined;
  
  if (items.trim().length > 1000) {
    return 'Items description cannot exceed 1000 characters';
  }
  
  return undefined;
}

// Validate optional notes
function validateNotes(notes?: string): string | undefined {
  if (!notes) return undefined;
  
  if (notes.trim().length > 1000) {
    return 'Notes cannot exceed 1000 characters';
  }
  
  return undefined;
}

// Main validation function for collection request form
export function validateCollectionRequestForm(
  formData: CollectionRequestFormData,
  selectedUser: SelectedUser | null
): ValidationResult {
  const errors: ValidationErrors = {};
  
  // Validate user selection
  if (!selectedUser) {
    return {
      isValid: false,
      errors: { address: 'Please select a user first' }
    };
  }
  
  // Validate address
  const addressError = validateAddress(formData.address);
  if (addressError) {
    errors.address = addressError;
  }
  
  // Validate phone
  const phoneError = validatePhone(formData.phone);
  if (phoneError) {
    errors.phone = phoneError;
  }
  
  // Validate pickup time
  const pickupTimeError = validatePickupTime(formData.pickupTime);
  if (pickupTimeError) {
    errors.pickupTime = pickupTimeError;
  }
  
  // Validate optional fields
  const itemsError = validateItemsDescription(formData.items);
  if (itemsError) {
    errors.items = itemsError;
  }
  
  const notesError = validateNotes(formData.notes);
  if (notesError) {
    errors.notes = notesError;
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}