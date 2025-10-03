// Dashboard configuration constants

import { ItemCondition } from '@/types/dashboard'

// Default pagination settings
export const DEFAULT_PAGE_SIZE = 20
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

// Default dashboard state
export const DEFAULT_DASHBOARD_STATE = {
  tab: 'scrap' as const,
  filters: {},
  page: 1,
  rows: [],
  total: 0,
  loading: false,
  selectedDonation: null,
  editingItem: null,
  dashboardStats: {
    totalDonations: 0,
    pendingItems: 0,
    listedItems: 0,
    soldItems: 0,
    itemsWithoutPrice: 0,
    totalRevenue: 0
  },
  viewMode: 'table' as const,
  savingItems: {},
  pendingActions: {},
  validationErrors: {},
  loadingStats: false,
  refreshing: false
}

// Item condition options
export const ITEM_CONDITIONS: { value: ItemCondition; label: string; color: string }[] = [
  { value: 'new', label: 'New', color: 'text-green-600 bg-green-50' },
  { value: 'good', label: 'Good', color: 'text-blue-600 bg-blue-50' },
  { value: 'repairable', label: 'Repairable', color: 'text-yellow-600 bg-yellow-50' },
  { value: 'scrap', label: 'Scrap', color: 'text-red-600 bg-red-50' },
  { value: 'not applicable', label: 'Not Applicable', color: 'text-gray-600 bg-gray-50' }
]

// Donation status options
export const DONATION_STATUSES = [
  { value: 'pending', label: 'Pending', color: 'text-yellow-600 bg-yellow-50' },
  { value: 'verified', label: 'Verified', color: 'text-blue-600 bg-blue-50' },
  { value: 'collected', label: 'Collected', color: 'text-purple-600 bg-purple-50' },
  { value: 'done', label: 'Done', color: 'text-green-600 bg-green-50' },
  { value: 'completed', label: 'Completed', color: 'text-green-600 bg-green-50' }
]

// Item status options
export const ITEM_STATUSES = [
  { value: 'listed', label: 'Listed', color: 'text-blue-600 bg-blue-50' },
  { value: 'unlisted', label: 'Unlisted', color: 'text-gray-600 bg-gray-50' },
  { value: 'sold', label: 'Sold', color: 'text-green-600 bg-green-50' }
]

// Quick action configurations
export const QUICK_ACTIONS = {
  list: {
    label: 'List',
    icon: 'ShoppingCart',
    variant: 'default',
    color: 'text-blue-600',
    requiresValidation: true
  },
  unlist: {
    label: 'Unlist',
    icon: 'X',
    variant: 'outline',
    color: 'text-gray-600',
    requiresValidation: false
  },
  sold: {
    label: 'Mark Sold',
    icon: 'DollarSign',
    variant: 'outline',
    color: 'text-green-600',
    requiresValidation: false
  },
  print: {
    label: 'Print',
    icon: 'Printer',
    variant: 'outline',
    color: 'text-gray-600',
    requiresValidation: false
  }
} as const

// Validation error messages
export const VALIDATION_MESSAGES = {
  PRICE_REQUIRED: 'Price is required for marketplace listing',
  PRICE_INVALID: 'Price must be greater than 0',
  NAME_REQUIRED: 'Item name is required',
  NAME_TOO_SHORT: 'Item name must be at least 3 characters long',
  CONDITION_INVALID: 'Items with this condition cannot be listed',
  SALE_PRICE_REQUIRED: 'Sale price is required for sold items',
  PHOTOS_RECOMMENDED: 'Photos are recommended for better listings',
  DESCRIPTION_RECOMMENDED: 'Description is recommended for better sales'
} as const

// Dashboard refresh intervals (in milliseconds)
export const REFRESH_INTERVALS = {
  STATS: 30000, // 30 seconds
  DONATIONS: 60000, // 1 minute
  ITEMS: 30000 // 30 seconds
} as const

// Animation durations (in milliseconds)
export const ANIMATION_DURATIONS = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500
} as const

// Debounce delays (in milliseconds)
export const DEBOUNCE_DELAYS = {
  SEARCH: 300,
  FILTER: 500,
  SAVE: 1000
} as const

// Local storage keys
export const STORAGE_KEYS = {
  DASHBOARD_FILTERS: 'admin_dashboard_filters',
  DASHBOARD_VIEW_MODE: 'admin_dashboard_view_mode',
  DASHBOARD_PAGE_SIZE: 'admin_dashboard_page_size',
  SIDEBAR_COLLAPSED: 'admin_sidebar_collapsed'
} as const

// API endpoints
export const API_ENDPOINTS = {
  DONATIONS: '/api/protected/donation-entries',
  DONATION_DETAILS: (id: string) => `/api/protected/donation-entries/${id}`,
  SCRAP_ITEMS: '/api/protected/scrap-items',
  SCRAP_ITEM: (id: string) => `/api/protected/scrap-items/${id}`,
  DASHBOARD_STATS: '/api/protected/dashboard/stats'
} as const

// Error retry configuration
export const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  INITIAL_DELAY: 1000,
  BACKOFF_MULTIPLIER: 2,
  MAX_DELAY: 10000
} as const

// Toast notification durations
export const TOAST_DURATIONS = {
  SUCCESS: 3000,
  ERROR: 5000,
  WARNING: 4000,
  INFO: 3000
} as const