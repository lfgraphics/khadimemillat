// Validation utility functions for marketplace listing

import { EnhancedScrapItem, ValidationStatus, ItemCondition } from '@/types/dashboard'

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