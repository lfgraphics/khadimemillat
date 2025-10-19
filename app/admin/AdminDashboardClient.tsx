"use client"

import React from 'react'
import { useRouter } from 'next/navigation'
import { safeJson } from '@/lib/utils'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import DonationDetailsModal, { DonationDetails } from '@/components/admin/DonationDetailsModal'
import { MultiStepItemDialog } from '@/components/MultiStepItemDialog'
import { calculateValidationStatus } from '@/lib/utils/validation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  DashboardState,
  EnhancedDonationFiltersState,
  DonationRow,
  ViewMode,
  ActionType
} from '@/types/dashboard'
import { DEFAULT_DASHBOARD_STATE, DEFAULT_PAGE_SIZE } from '@/lib/constants/dashboard'
import { useResponsiveBreakpoint, RESPONSIVE_CLASSES } from '@/lib/utils/responsive'
import DashboardHeader from '@/components/admin/dashboard/DashboardHeader'
import EnhancedDonationFilters from '@/components/admin/dashboard/EnhancedDonationFilters'
import EnhancedDonationTable from '@/components/admin/dashboard/EnhancedDonationTable'
import ResponsivePagination from '@/components/admin/dashboard/ResponsivePagination'
import ErrorBoundary, { useErrorRecovery, InlineError } from '@/components/admin/dashboard/ErrorBoundary'
import { safeAsyncOperation, handleError, safeFetch } from '@/lib/services/errorHandling.service'
import {
  DashboardSkeleton,
  FiltersSkeleton,
  TableSkeleton,
  PaginationSkeleton,
  LoadingOverlay,
  Spinner
} from '@/components/admin/dashboard/LoadingStates'

function AdminDashboardClientContent() {
  const router = useRouter()
  const breakpoint = useResponsiveBreakpoint()
  const isMobile = breakpoint === 'mobile'
  const { recover, reset: resetErrorRecovery, isRecovering } = useErrorRecovery()

  // Enhanced dashboard state management
  const [dashboardState, setDashboardState] = React.useState<DashboardState>({
    ...DEFAULT_DASHBOARD_STATE,
    filters: {} as EnhancedDonationFiltersState
  })

  // UI state for responsive behavior
  const [uiState, setUIState] = React.useState({
    sidebarCollapsed: isMobile,
    mobileMenuOpen: false,
    currentBreakpoint: breakpoint
  })

  // MultiStepItemDialog state
  const [itemDialogState, setItemDialogState] = React.useState<{
    open: boolean
    editingItem: any | null
    mode: 'add' | 'edit'
    updating: boolean
  }>({
    open: false,
    editingItem: null,
    mode: 'add',
    updating: false
  })

  // Error state management
  const [errorState, setErrorState] = React.useState<{
    hasError: boolean
    errorMessage?: string
    retryOperation?: () => Promise<void>
  }>({
    hasError: false
  })

  // Helper function to safely update pending actions
  const updatePendingActions = (itemId: string, action: ActionType | undefined) => {
    setDashboardState(prev => {
      const newPendingActions = { ...prev.pendingActions }
      if (action === undefined) {
        delete newPendingActions[itemId]
      } else {
        newPendingActions[itemId] = action
      }
      return {
        ...prev,
        pendingActions: newPendingActions
      }
    })
  }

  const pageSize = DEFAULT_PAGE_SIZE

  // Update UI state when breakpoint changes
  React.useEffect(() => {
    setUIState(prev => ({
      ...prev,
      currentBreakpoint: breakpoint,
      sidebarCollapsed: breakpoint === 'mobile' ? true : prev.sidebarCollapsed
    }))
  }, [breakpoint])

  // Load donations data with enhanced error handling
  const loadDonations = React.useCallback(async () => {
    const params = new URLSearchParams()
    params.set('page', String(dashboardState.page))
    params.set('limit', String(pageSize))
    if (dashboardState.filters.q) params.set('q', dashboardState.filters.q)
    if (dashboardState.filters.status) params.set('status', dashboardState.filters.status)
    if (dashboardState.filters.itemStatus) params.set('itemStatus', dashboardState.filters.itemStatus)
    if (dashboardState.filters.from) params.set('from', dashboardState.filters.from.toISOString())
    if (dashboardState.filters.to) params.set('to', dashboardState.filters.to.toISOString())
    if (dashboardState.filters.hasPrice !== undefined) params.set('hasPrice', String(dashboardState.filters.hasPrice))
    if (dashboardState.filters.canList !== undefined) params.set('canList', String(dashboardState.filters.canList))
    if (dashboardState.filters.condition) params.set('condition', dashboardState.filters.condition)

    const response = await safeFetch(`/api/protected/donation-entries?${params.toString()}`, {
      timeout: 15000,
      retryConfig: {
        maxRetries: 2,
        baseDelay: 1000
      },
      errorHandling: {
        context: 'Loading donations',
        showToast: false // We'll handle this manually
      }
    })

    const json = await safeJson<any>(response)

    const mapped = (json.entries || []).map((e: any) => ({
      id: e._id || e.id,
      donor: e.donor,
      createdAt: e.createdAt,
      status: e.status,
      itemsCount: e.itemsCount || (e.items?.length ?? 0),
      validItemsCount: e.validItemsCount,
      invalidItemsCount: e.invalidItemsCount
    }))

    setDashboardState(prev => ({
      ...prev,
      rows: mapped,
      total: json.total || 0,
      loading: false
    }))

    // Clear any previous errors
    setErrorState({ hasError: false })
  }, [dashboardState.page, dashboardState.filters, pageSize])

  React.useEffect(() => {
    let cancelled = false

    const load = async () => {
      if (cancelled) return

      setDashboardState(prev => ({ ...prev, loading: true }))

      const result = await safeAsyncOperation(
        loadDonations,
        {
          context: 'Loading donations',
          showToast: false, // We'll handle errors manually
          retryConfig: {
            maxRetries: 2,
            baseDelay: 1000
          },
          onError: (error) => {
            if (!cancelled) {
              setErrorState({
                hasError: true,
                errorMessage: error.userMessage || error.message,
                retryOperation: loadDonations
              })
              setDashboardState(prev => ({ ...prev, loading: false }))
            }
          }
        }
      )

      // If operation failed, try automatic recovery
      if (result === null && !cancelled) {
        try {
          await recover(loadDonations)
        } catch (recoveryError) {
          console.error('Recovery failed:', recoveryError)
          const enhancedError = handleError(recoveryError as Error, {
            context: 'Donation recovery',
            showToast: true
          })

          setErrorState({
            hasError: true,
            errorMessage: enhancedError.userMessage || 'Failed to load donations',
            retryOperation: loadDonations
          })
        }
      }
    }

    load()
    return () => { cancelled = true }
  }, [dashboardState.page, dashboardState.filters, loadDonations, recover])

  // Load dashboard statistics with enhanced error handling
  const loadStats = React.useCallback(async () => {
    const response = await safeFetch('/api/protected/dashboard/stats', {
      timeout: 10000,
      retryConfig: {
        maxRetries: 2,
        baseDelay: 1000
      },
      errorHandling: {
        context: 'Loading dashboard stats',
        showToast: false // Stats are not critical, don't show toast
      }
    })

    const json = await safeJson<any>(response)

    setDashboardState(prev => ({
      ...prev,
      dashboardStats: json.stats || DEFAULT_DASHBOARD_STATE.dashboardStats,
      loadingStats: false
    }))
  }, [])

  React.useEffect(() => {
    let cancelled = false

    const load = async () => {
      if (cancelled) return

      setDashboardState(prev => ({ ...prev, loadingStats: true }))

      const result = await safeAsyncOperation(
        loadStats,
        {
          context: 'Loading dashboard stats',
          showToast: false, // Stats are not critical
          retryConfig: {
            maxRetries: 2,
            baseDelay: 1000
          },
          onError: (error) => {
            if (!cancelled) {
              console.warn('Failed to load dashboard stats:', error.message)
              setDashboardState(prev => ({
                ...prev,
                loadingStats: false,
                dashboardStats: DEFAULT_DASHBOARD_STATE.dashboardStats
              }))
            }
          }
        }
      )

      // If stats loading failed, try silent recovery
      if (result === null && !cancelled) {
        try {
          await recover(loadStats)
        } catch (recoveryError) {
          console.warn('Stats recovery failed:', recoveryError)
          // Use default stats if recovery fails
          setDashboardState(prev => ({
            ...prev,
            loadingStats: false,
            dashboardStats: DEFAULT_DASHBOARD_STATE.dashboardStats
          }))
        }
      }
    }

    load()
    return () => { cancelled = true }
  }, [loadStats, recover])

  const openDetails = async (id: string) => {
    setDashboardState(prev => ({ ...prev, selectedDonation: null }))
    try {
      const res = await fetch(`/api/protected/donation-entries/${id}`)
      const json = await safeJson<any>(res)
      setDashboardState(prev => ({
        ...prev,
        selectedDonation: json.donation
      }))
    } catch (e) {
      console.error(e)
      toast.error('Failed to load donation details')
    }
  }

  const handleItemChange = async (itemId: string, patch: any) => {
    if (!dashboardState.selectedDonation) return

    setDashboardState(prev => ({
      ...prev,
      savingItems: { ...prev.savingItems, [itemId]: true }
    }))

    const result = await safeAsyncOperation(
      async () => {
        const response = await safeFetch(`/api/protected/scrap-items/${itemId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
          timeout: 10000,
          retryConfig: {
            maxRetries: 2,
            baseDelay: 1000
          },
          errorHandling: {
            context: 'Updating item',
            showToast: false // We'll handle success/error manually
          }
        })

        const json = await safeJson<any>(response)
        return json.item || patch
      },
      {
        context: 'Item update',
        showToast: false,
        onError: (error) => {
          setDashboardState(prev => ({
            ...prev,
            savingItems: { ...prev.savingItems, [itemId]: false }
          }))

          // Show specific error message based on error type
          let errorMessage = 'Failed to update item'
          if (error.type === 'validation') {
            errorMessage = 'Invalid item data. Please check your input.'
          } else if (error.type === 'network') {
            errorMessage = 'Network error. Please check your connection and try again.'
          } else if (error.type === 'permission') {
            errorMessage = 'You don\'t have permission to update this item.'
          }

          toast.error(errorMessage)
        }
      }
    )

    if (result) {
      setDashboardState(prev => ({
        ...prev,
        selectedDonation: prev.selectedDonation ? {
          ...prev.selectedDonation,
          items: prev.selectedDonation.items.map(it =>
            it.id === itemId
              ? { ...it, ...result, marketplaceListing: result.marketplaceListing ?? it.marketplaceListing }
              : it
          )
        } : null,
        savingItems: { ...prev.savingItems, [itemId]: false }
      }))

      toast.success('Item updated successfully')

      // Refresh stats after successful item update
      await safeAsyncOperation(loadStats, {
        showToast: false,
        context: 'Refreshing stats after item update'
      })
    }
  }

  const handleItemAction = async (itemId: string, action: 'list' | 'unlist' | 'sold') => {
    if (!dashboardState.selectedDonation) return
    updatePendingActions(itemId, action as ActionType)
    try {
      const body: any = {}
      if (action === 'list') body.marketplaceListing = { listed: true }
      if (action === 'unlist') body.marketplaceListing = { listed: false }
      if (action === 'sold') body.marketplaceListing = { sold: true }
      const res = await fetch(`/api/protected/scrap-items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      if (!res.ok) throw new Error(await res.text())
      const json = await safeJson<any>(res)
      const updated = json.item || body
      setDashboardState(prev => ({
        ...prev,
        selectedDonation: prev.selectedDonation ? {
          ...prev.selectedDonation,
          items: prev.selectedDonation.items.map(it =>
            it.id === itemId
              ? { ...it, ...updated, marketplaceListing: updated.marketplaceListing ?? it.marketplaceListing }
              : it
          )
        } : null
      }))
      updatePendingActions(itemId, undefined)
      toast.success(action === 'list' ? 'Item listed' : action === 'unlist' ? 'Item unlisted' : 'Marked as sold')

      // Refresh stats after successful action
      try {
        await loadStats()
      } catch (statsError) {
        console.error('Failed to refresh stats after item action:', statsError)
        // Don't show error for stats refresh failure
      }
    } catch (e: any) {
      toast.error(e.message || 'Action failed')
      updatePendingActions(itemId, undefined)
    }
  }

  // MultiStepItemDialog functions
  const handleEditItem = (item: any) => {
    // Convert EnhancedScrapItem to LocalItem format for the dialog
    const localItem = {
      tempId: item.id,
      serverId: item.id,
      name: item.name,
      description: item.description || '',
      donorId: dashboardState.selectedDonation?.donor?.id || '',
      donorName: dashboardState.selectedDonation?.donor?.name || '',
      condition: item.condition,
      photos: item.photos,
      marketplace: {
        listed: item.marketplaceListing.listed,
        demandedPrice: item.marketplaceListing.demandedPrice,
        description: item.marketplaceListing.description || ''
      }
    }

    setItemDialogState({
      open: true,
      editingItem: localItem,
      mode: 'edit',
      updating: false
    })
  }

  const handleItemUpdate = async (updatedItem: any) => {
    if (!dashboardState.selectedDonation || !updatedItem.serverId) return

    const itemId = updatedItem.serverId

    // Set updating state
    setItemDialogState(prev => ({ ...prev, updating: true }))

    // Store original item for rollback
    const originalItem = dashboardState.selectedDonation.items.find(item => item.id === itemId)
    if (!originalItem) {
      setItemDialogState(prev => ({ ...prev, updating: false }))
      return
    }

    const patch = {
      name: updatedItem.name,
      description: updatedItem.description,
      condition: updatedItem.condition,
      photos: updatedItem.photos,
      marketplaceListing: {
        listed: updatedItem.marketplace.listed,
        demandedPrice: updatedItem.marketplace.demandedPrice,
        description: updatedItem.marketplace.description
      }
    }

    // Optimistic update - immediately update the UI
    setDashboardState(prev => ({
      ...prev,
      selectedDonation: prev.selectedDonation ? {
        ...prev.selectedDonation,
        items: prev.selectedDonation.items.map(item => {
          if (item.id === itemId) {
            const updatedItem = {
              ...item,
              ...patch,
              marketplaceListing: {
                ...item.marketplaceListing,
                ...patch.marketplaceListing
              }
            }

            // Recalculate validation status for the updated item
            updatedItem.validationStatus = calculateValidationStatus(updatedItem)

            return updatedItem
          }
          return item
        })
      } : null
    }))

    try {
      // Perform the actual update
      await handleItemChange(itemId, patch)

      // Close dialog on success
      setItemDialogState({ open: false, editingItem: null, mode: 'add', updating: false })

      toast.success(`Updated "${updatedItem.name}" successfully`)
    } catch (error: any) {
      // Rollback on failure
      setDashboardState(prev => ({
        ...prev,
        selectedDonation: prev.selectedDonation ? {
          ...prev.selectedDonation,
          items: prev.selectedDonation.items.map(item =>
            item.id === itemId ? originalItem : item
          )
        } : null
      }))

      // Reset updating state
      setItemDialogState(prev => ({ ...prev, updating: false }))

      console.error('Failed to update item:', error)

      // Provide specific error messages based on error type
      let errorMessage = `Failed to update "${updatedItem.name}". Changes have been reverted.`

      if (error.message?.includes('validation')) {
        errorMessage = `Validation failed for "${updatedItem.name}". Please check the item details.`
      } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
        errorMessage = `Network error while updating "${updatedItem.name}". Please check your connection and try again.`
      } else if (error.message?.includes('permission') || error.message?.includes('unauthorized')) {
        errorMessage = `You don't have permission to update "${updatedItem.name}".`
      }

      toast.error(errorMessage)
    }
  }

  const clearFilters = () => {
    setDashboardState(prev => ({
      ...prev,
      filters: {},
      page: 1
    }))
  }

  const handlePrint = (itemId: string) => {
    if (!dashboardState.selectedDonation) return
    // Navigate to donation print page (prints all items under donation)
    toast.message('Opening barcode print sheet…')
    router.push(`/list-donation/print/${dashboardState.selectedDonation.id}`)
  }

  const handleQuickAction = async (donationId: string, action: 'archive' | 'complete') => {
    try {
      const res = await fetch(`/api/protected/donation-entries/${donationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: action === 'complete' ? 'completed' : 'archived'
        })
      })

      if (!res.ok) throw new Error(await res.text())

      // Update the row in the table
      setDashboardState(prev => ({
        ...prev,
        rows: prev.rows.map(row =>
          row.id === donationId
            ? { ...row, status: action === 'complete' ? 'completed' : 'archived' }
            : row
        )
      }))

      toast.success(action === 'complete' ? 'Donation marked as complete' : 'Donation archived')

      // Refresh stats
      try {
        await loadStats()
      } catch (statsError) {
        console.error('Failed to refresh stats after quick action:', statsError)
      }
    } catch (e: any) {
      toast.error(e.message || `Failed to ${action} donation`)
    }
  }

  const handleRefresh = async () => {
    setDashboardState(prev => ({ ...prev, refreshing: true }))

    try {
      // Reset error recovery state
      resetErrorRecovery()
      setErrorState({ hasError: false })

      // Reload both donations and stats with error recovery
      await Promise.all([
        recover(loadDonations),
        recover(loadStats)
      ])

      setDashboardState(prev => ({ ...prev, refreshing: false }))
      toast.success('Dashboard refreshed')
    } catch (e: any) {
      console.error('Refresh failed:', e)
      toast.error('Failed to refresh dashboard')
      setDashboardState(prev => ({ ...prev, refreshing: false }))

      setErrorState({
        hasError: true,
        errorMessage: 'Failed to refresh dashboard',
        retryOperation: handleRefresh
      })
    }
  }

  const updateFilters = (newFilters: EnhancedDonationFiltersState) => {
    setDashboardState(prev => ({
      ...prev,
      filters: newFilters,
      page: 1 // Reset to first page when filters change
    }))
  }

  const updatePage = (newPage: number) => {
    setDashboardState(prev => ({ ...prev, page: newPage }))
  }

  const totalPages = Math.max(1, Math.ceil(dashboardState.total / pageSize))
  const activeFiltersCount = Object.values(dashboardState.filters).filter(v => v !== undefined && v !== '').length

  // Show loading skeleton on initial load
  if (dashboardState.loading && dashboardState.rows.length === 0) {
    return <DashboardSkeleton />
  }

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 ${RESPONSIVE_CLASSES.container.mobile} ${RESPONSIVE_CLASSES.container.tablet} ${RESPONSIVE_CLASSES.container.desktop}`}>
      {/* Main dashboard container with responsive grid */}
      <div className={`${RESPONSIVE_CLASSES.spacing.mobile} ${RESPONSIVE_CLASSES.spacing.tablet} ${RESPONSIVE_CLASSES.spacing.desktop}`}>

        {/* Dashboard Header with stats */}
        <div className="mb-6">
          <DashboardHeader
            stats={dashboardState.dashboardStats}
            onRefresh={handleRefresh}
            loading={dashboardState.loadingStats}
            refreshing={dashboardState.refreshing}
          />
        </div>

        {/* Main content area with responsive layout */}
        <div className="space-y-6">
          <Tabs
            value={dashboardState.tab}
            onValueChange={v => setDashboardState(prev => ({ ...prev, tab: v as 'scrap' | 'fund' }))}
            className="w-full"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <TabsList className='h-max'>
                <TabsTrigger value="scrap">
                  Scrap Donations
                </TabsTrigger>
                <TabsTrigger value="fund">
                  Fund Donations
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="scrap" className="space-y-6 mt-0">
              {/* Enhanced Filters with responsive design */}
              {dashboardState.loading && dashboardState.rows.length === 0 ? (
                <FiltersSkeleton />
              ) : (
                <EnhancedDonationFilters
                  value={dashboardState.filters}
                  onChange={updateFilters}
                  onClear={clearFilters}
                  activeFiltersCount={activeFiltersCount}
                  itemCounts={{
                    'all': dashboardState.total,
                    'without-price': dashboardState.dashboardStats.itemsWithoutPrice,
                    'ready-to-list': dashboardState.dashboardStats.pendingItems,
                    'listed': dashboardState.dashboardStats.listedItems,
                    'sold': dashboardState.dashboardStats.soldItems
                  }}
                />
              )}

              {/* Enhanced Donation Table with responsive layout */}
              {dashboardState.loading && dashboardState.rows.length === 0 ? (
                <TableSkeleton />
              ) : (
                <LoadingOverlay
                  loading={dashboardState.loading && dashboardState.rows.length > 0}
                  message="Updating donations..."
                >
                  <EnhancedDonationTable
                    rows={dashboardState.rows}
                    loading={dashboardState.loading}
                    onViewDetails={openDetails}
                    selectedId={dashboardState.selectedDonation?.id}
                    onQuickAction={handleQuickAction}
                  />
                </LoadingOverlay>
              )}

              {/* Responsive Pagination */}
              {dashboardState.total > 0 && (
                dashboardState.loading && dashboardState.rows.length === 0 ? (
                  <PaginationSkeleton />
                ) : (
                  <ResponsivePagination
                    currentPage={dashboardState.page}
                    totalPages={totalPages}
                    onPageChange={updatePage}
                    totalItems={dashboardState.total}
                    pageSize={pageSize}
                  />
                )
              )}

              {/* Error state display */}
              {errorState.hasError && (
                <InlineError
                  error={errorState.errorMessage || 'An error occurred'}
                  onRetry={errorState.retryOperation}
                  retrying={isRecovering}
                />
              )}
            </TabsContent>

            <TabsContent value="fund" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Fund Donations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Fund donation management coming soon.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Enhanced Donation Details Modal */}
      <DonationDetailsModal
        open={!!dashboardState.selectedDonation}
        onOpenChange={(v) => {
          if (!v) {
            setDashboardState(prev => ({ ...prev, selectedDonation: null }))
          }
        }}
        donation={dashboardState.selectedDonation || undefined}
        onItemAction={(itemId, action) => {
          action === 'print' ? handlePrint(itemId) : handleItemAction(itemId, action as 'list' | 'unlist' | 'sold')
        }}
        onBulkAction={async (action, itemIds) => {
          // Handle bulk actions for multiple items
          for (const itemId of itemIds) {
            if (action === 'print') {
              handlePrint(itemId)
            } else {
              await handleItemAction(itemId, action as 'list' | 'unlist' | 'sold')
            }
          }
        }}
        onItemEdit={handleEditItem}
        savingItems={dashboardState.savingItems}
        pendingActions={Object.fromEntries(
          Object.entries(dashboardState.pendingActions).map(([key, value]) => [
            key,
            value === 'print' || value === 'edit' || value === 'delete' ? undefined : value
          ])
        )}
        validationErrors={dashboardState.validationErrors}
        onNavigateBack={() => {
          setDashboardState(prev => ({ ...prev, selectedDonation: null }))
        }}
        breadcrumbContext={{
          parentName: 'Admin Dashboard',
          parentPath: '/admin'
        }}
      />

      {/* MultiStepItemDialog for editing items */}
      <MultiStepItemDialog
        open={itemDialogState.open}
        onOpenChange={(open) => {
          if (!open && itemDialogState.updating) {
            // Prevent closing while updating
            return
          }
          setItemDialogState(prev => ({ ...prev, open }))
        }}
        onItemAdd={() => { }} // Not used in edit mode
        onItemUpdate={handleItemUpdate}
        donor={dashboardState.selectedDonation?.donor || null}
        currentRole="admin"
        presetItems={[]}
        editingItem={itemDialogState.editingItem}
        mode={itemDialogState.mode}
      />
    </div>
  )
}

// Main component with error boundary
export default function AdminDashboardClient() {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('Dashboard Error:', error, errorInfo)
        // Could send to error reporting service here
      }}
    >
      <AdminDashboardClientContent />
    </ErrorBoundary>
  )
}