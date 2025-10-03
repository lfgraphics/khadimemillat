# Enhanced Admin Dashboard Components

This directory contains the enhanced components for the admin dashboard UI redesign. The components are built with responsive design, modern UI patterns, and comprehensive validation support.

## Component Structure

```
components/admin/dashboard/
├── index.ts                      # Main exports
├── DashboardHeader.tsx           # Header with stats and refresh
├── DashboardStats.tsx            # Statistics cards display
├── EnhancedItemCard.tsx          # Modern item card with actions
├── EnhancedDonationTable.tsx     # Responsive table/card layout
├── EnhancedDonationFilters.tsx   # Advanced filtering interface
├── ResponsivePagination.tsx      # Mobile-friendly pagination
├── ItemGrid.tsx                  # Grid layout for items
├── FilterPresets.tsx             # Quick filter presets
├── BulkActions.tsx               # Bulk selection and actions
├── LoadingStates.tsx             # Skeleton loaders
└── README.md                     # This file
```

## Key Features

### Responsive Design
- Mobile-first approach with breakpoint-specific layouts
- Touch-friendly controls and proper spacing
- Adaptive grid systems and collapsible elements

### Enhanced Item Management
- Visual validation indicators for marketplace listing
- Quick action buttons with confirmation dialogs
- Bulk operations with selection management
- Modern card design with status badges

### Advanced Filtering
- Multiple filter criteria with presets
- Date range selection with calendar picker
- Real-time search with debouncing
- Filter state persistence

### Loading States
- Skeleton loaders for all components
- Progressive loading with proper feedback
- Error handling with retry mechanisms

## Usage Examples

### Basic Dashboard Setup

```tsx
import { 
  DashboardHeader, 
  EnhancedDonationTable, 
  EnhancedDonationFilters 
} from '@/components/admin/dashboard'

function AdminDashboard() {
  const {
    dashboardStats,
    rows,
    filters,
    loading,
    refresh,
    updateFilters,
    loadDonationDetails
  } = useDashboard()

  return (
    <div className="space-y-6">
      <DashboardHeader 
        stats={dashboardStats}
        onRefresh={refresh}
        loading={loading}
        refreshing={refreshing}
      />
      
      <EnhancedDonationFilters
        value={filters}
        onChange={updateFilters}
        onClear={clearFilters}
      />
      
      <EnhancedDonationTable
        rows={rows}
        loading={loading}
        onViewDetails={loadDonationDetails}
      />
    </div>
  )
}
```

### Item Grid with Bulk Actions

```tsx
import { ItemGrid, BulkActions } from '@/components/admin/dashboard'
import { useSelectedItems } from '@/hooks/useDashboard'

function ItemManagement({ items, onEditItem, onQuickAction }) {
  const {
    selectedItems,
    toggleSelectAll,
    toggleItem,
    performBulkAction
  } = useSelectedItems()

  return (
    <div className="space-y-4">
      <BulkActions
        selectedItems={selectedItems}
        allItems={items}
        onSelectAll={toggleSelectAll}
        onSelectItem={toggleItem}
        onBulkAction={performBulkAction}
      />
      
      <ItemGrid
        items={items}
        onEditItem={onEditItem}
        onQuickAction={onQuickAction}
        savingItems={savingItems}
        validationErrors={validationErrors}
      />
    </div>
  )
}
```

## Component Props

### DashboardHeader
- `stats: DashboardStats` - Statistics to display
- `onRefresh: () => void` - Refresh callback
- `loading: boolean` - Loading state
- `refreshing: boolean` - Refresh in progress

### EnhancedItemCard
- `item: EnhancedScrapItem` - Item data
- `onEdit: (item) => void` - Edit callback
- `onQuickAction: (id, action) => void` - Quick action callback
- `loading: boolean` - Loading state
- `validationErrors: string[]` - Validation errors
- `compact?: boolean` - Compact display mode

### EnhancedDonationFilters
- `value: EnhancedDonationFiltersState` - Current filters
- `onChange: (filters) => void` - Filter change callback
- `onClear?: () => void` - Clear filters callback
- `activeFiltersCount?: number` - Number of active filters

## Responsive Breakpoints

The components use the following breakpoints:
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

## Validation System

Items are validated using the validation utility functions:
- Price validation for marketplace listing
- Condition-based validation rules
- Photo and description recommendations
- Visual indicators for validation status

## Styling Guidelines

- Uses Tailwind CSS with consistent spacing
- Dark mode support throughout
- Proper color contrast for accessibility
- Touch-friendly sizing (44px minimum)

## Performance Considerations

- Memoized components where appropriate
- Debounced search and filter inputs
- Virtual scrolling for large datasets
- Optimistic updates for better UX

## Accessibility Features

- Proper ARIA labels and roles
- Keyboard navigation support
- Screen reader compatibility
- High contrast mode support
- Focus management

## Testing

Components include:
- Unit tests for validation logic
- Integration tests for workflows
- Responsive design tests
- Accessibility compliance tests