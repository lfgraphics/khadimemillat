// Export all dashboard components from this index file

export { default as DashboardHeader } from './DashboardHeader'
export { default as DashboardStatsComponent } from './DashboardStats'
export { default as EnhancedItemCard } from './EnhancedItemCard'
export { default as EnhancedDonationTable } from './EnhancedDonationTable'
export { default as EnhancedDonationFilters } from './EnhancedDonationFilters'
export { default as ResponsivePagination } from './ResponsivePagination'
export { default as ItemGrid } from './ItemGrid'
export { default as FilterPresets } from './FilterPresets'
export { default as BulkActions } from './BulkActions'
export { default as LoadingStates } from './LoadingStates'
export { default as ConfirmationDialog } from './ConfirmationDialog'
export { default as ValidationStatusTooltip, ValidationIndicator } from './ValidationStatusTooltip'

// Re-export types
export type {
  DashboardStats as DashboardStatsType,
  EnhancedScrapItem,
  ValidationStatus,
  QuickAction,
  ActionType,
  ViewMode,
  DashboardState,
  EnhancedDonationFiltersState,
  FilterPreset
} from '@/types/dashboard'