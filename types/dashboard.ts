// Enhanced TypeScript interfaces for dashboard state and item validation

import { Donor } from "@/components/UserSearchAndCreate"

export type ItemCondition = "new" | "good" | "repairable" | "scrap" | "not applicable"

export type QuickAction = 'list' | 'unlist' | 'sold' | 'print'

export type ActionType = QuickAction | 'edit' | 'delete'

export type ViewMode = 'table' | 'grid'

// Enhanced ScrapItem interface with validation status
export interface EnhancedScrapItem {
  id: string
  name: string
  description?: string
  condition: ItemCondition
  photos: {
    before: string[]
    after: string[]
  }
  marketplaceListing: {
    listed: boolean
    demandedPrice?: number
    salePrice?: number
    sold: boolean
    description?: string
  }
  repairingCost?: number
  validationStatus: ValidationStatus
  createdAt: string
  updatedAt: string
}

// Validation status for marketplace listing
export interface ValidationStatus {
  canList: boolean
  errors: string[]
  warnings: string[]
}

// Dashboard statistics
export interface DashboardStats {
  totalDonations: number
  pendingItems: number
  listedItems: number
  soldItems: number
  itemsWithoutPrice: number
  totalRevenue: number
}

// Enhanced donation filters state
export interface EnhancedDonationFiltersState {
  q?: string
  status?: string
  itemStatus?: string
  from?: Date
  to?: Date
  hasPrice?: boolean
  canList?: boolean
  condition?: ItemCondition
}

// Enhanced dashboard state
export interface DashboardState {
  // Existing state
  tab: 'scrap' | 'fund'
  filters: EnhancedDonationFiltersState
  page: number
  rows: DonationRow[]
  total: number
  loading: boolean
  
  // Enhanced state
  selectedDonation: DonationDetails | null
  editingItem: EnhancedScrapItem | null
  dashboardStats: DashboardStats
  viewMode: ViewMode
  
  // UI state
  savingItems: Record<string, boolean>
  pendingActions: Record<string, ActionType>
  validationErrors: Record<string, string[]>
  loadingStats: boolean
  refreshing: boolean
}

// Donation row type
export interface DonationRow {
  id: string
  donor?: {
    id: string
    name?: string
    email?: string
  }
  createdAt?: string
  status?: string
  itemsCount?: number
  validItemsCount?: number
  invalidItemsCount?: number
}

// Enhanced donation details
export interface DonationDetails {
  id: string
  donor?: Donor;
  status: string
  items: EnhancedScrapItem[]
  createdAt: string
  updatedAt: string
  collectionAddress?: string
  notes?: string
}

// Filter preset types
export interface FilterPreset {
  id: string
  name: string
  filters: EnhancedDonationFiltersState
  icon?: string
}

// UI state types
export interface UIState {
  sidebarCollapsed: boolean
  mobileMenuOpen: boolean
  currentBreakpoint: ResponsiveBreakpoint
}

// Responsive breakpoint type
export type ResponsiveBreakpoint = 'mobile' | 'tablet' | 'desktop'