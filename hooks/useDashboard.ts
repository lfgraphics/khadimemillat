"use client"

import { useState, useEffect, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import { 
  DashboardState, 
  EnhancedDonationFiltersState, 
  DashboardStats,
  EnhancedScrapItem,
  DonationRow,
  QuickAction
} from '@/types/dashboard'
import { 
  DEFAULT_DASHBOARD_STATE, 
  DEFAULT_PAGE_SIZE,
  API_ENDPOINTS,
  DEBOUNCE_DELAYS,
  STORAGE_KEYS
} from '@/lib/constants/dashboard'
import { calculateDashboardStats } from '@/lib/utils/dashboard'
import { validateItems } from '@/lib/utils/validation'
import { safeJson } from '@/lib/utils'

// Custom hook for dashboard state management
export function useDashboard() {
  const [state, setState] = useState<DashboardState>(DEFAULT_DASHBOARD_STATE)

  // Update specific parts of state
  const updateState = useCallback((updates: Partial<DashboardState>) => {
    setState(prev => ({ ...prev, ...updates }))
  }, [])

  // Load donations with filters
  const loadDonations = useCallback(async (
    page: number = 1,
    filters: EnhancedDonationFiltersState = {}
  ) => {
    updateState({ loading: true })
    
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', String(DEFAULT_PAGE_SIZE))
      
      if (filters.q) params.set('q', filters.q)
      if (filters.status) params.set('status', filters.status)
      if (filters.itemStatus) params.set('itemStatus', filters.itemStatus)
      if (filters.condition) params.set('condition', filters.condition)
      if (filters.hasPrice !== undefined) params.set('hasPrice', String(filters.hasPrice))
      if (filters.canList !== undefined) params.set('canList', String(filters.canList))
      if (filters.from) params.set('from', filters.from.toISOString())
      if (filters.to) params.set('to', filters.to.toISOString())

      const response = await fetch(`${API_ENDPOINTS.DONATIONS}?${params.toString()}`)
      const data = await safeJson<any>(response)
      
      const mappedRows: DonationRow[] = (data.entries || []).map((entry: any) => ({
        id: entry._id || entry.id,
        donor: entry.donor,
        createdAt: entry.createdAt,
        status: entry.status,
        itemsCount: entry.itemsCount || (entry.items?.length ?? 0),
        validItemsCount: entry.validItemsCount,
        invalidItemsCount: entry.invalidItemsCount
      }))

      updateState({
        rows: mappedRows,
        total: data.total || 0,
        page,
        filters,
        loading: false
      })
    } catch (error: any) {
      console.error('Failed to load donations:', error)
      toast.error(error.message || 'Failed to load donations')
      updateState({ loading: false })
    }
  }, [updateState])

  // Load dashboard statistics with retry logic
  const loadStats = useCallback(async (retryCount: number = 0) => {
    updateState({ loadingStats: true })
    
    try {
      const response = await fetch(API_ENDPOINTS.DASHBOARD_STATS, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Add timeout for better error handling
        signal: AbortSignal.timeout(10000) // 10 second timeout
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const stats = await safeJson<DashboardStats>(response)
      
      // Validate stats structure
      if (!stats || typeof stats !== 'object') {
        throw new Error('Invalid stats response format')
      }
      
      updateState({
        dashboardStats: {
          totalDonations: stats.totalDonations || 0,
          pendingItems: stats.pendingItems || 0,
          listedItems: stats.listedItems || 0,
          soldItems: stats.soldItems || 0,
          itemsWithoutPrice: stats.itemsWithoutPrice || 0,
          totalRevenue: stats.totalRevenue || 0
        },
        loadingStats: false
      })
    } catch (error: any) {
      console.error('Failed to load dashboard stats:', error)
      
      // Retry logic for network errors
      if (retryCount < 2 && (
        error.name === 'TypeError' || 
        error.name === 'AbortError' ||
        error.message.includes('fetch')
      )) {
        console.log(`Retrying dashboard stats load (attempt ${retryCount + 1})`)
        setTimeout(() => loadStats(retryCount + 1), 1000 * (retryCount + 1))
        return
      }
      
      // Don't show error toast for stats, just use default values
      updateState({
        dashboardStats: DEFAULT_DASHBOARD_STATE.dashboardStats,
        loadingStats: false
      })
    }
  }, [updateState])

  // Refresh all data
  const refresh = useCallback(async () => {
    updateState({ refreshing: true })
    
    try {
      await Promise.all([
        loadDonations(state.page, state.filters),
        loadStats()
      ])
    } finally {
      updateState({ refreshing: false })
    }
  }, [loadDonations, loadStats, state.page, state.filters, updateState])

  // Load donation details
  const loadDonationDetails = useCallback(async (donationId: string) => {
    try {
      const response = await fetch(API_ENDPOINTS.DONATION_DETAILS(donationId))
      const data = await safeJson<any>(response)
      
      // Enhance items with validation status
      const enhancedItems: EnhancedScrapItem[] = (data.donation?.items || []).map((item: any) => ({
        ...item,
        validationStatus: { canList: true, errors: [], warnings: [] } // Will be calculated
      }))
      
      // Calculate validation status for all items
      const validationResults = validateItems(enhancedItems)
      const itemsWithValidation = enhancedItems.map(item => ({
        ...item,
        validationStatus: validationResults[item.id]
      }))
      
      const donationDetails = {
        ...data.donation,
        items: itemsWithValidation
      }
      
      updateState({ selectedDonation: donationDetails })
      return donationDetails
    } catch (error: any) {
      console.error('Failed to load donation details:', error)
      toast.error(error.message || 'Failed to load donation details')
      throw error
    }
  }, [updateState])

  // Update item
  const updateItem = useCallback(async (itemId: string, updates: Partial<EnhancedScrapItem>) => {
    setState(prev => ({
      ...prev,
      savingItems: { ...prev.savingItems, [itemId]: true }
    }))
    
    try {
      const response = await fetch(API_ENDPOINTS.SCRAP_ITEM(itemId), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      
      if (!response.ok) {
        throw new Error(await response.text())
      }
      
      const data = await safeJson<any>(response)
      const updatedItem = data.item || updates
      
      // Update the item in selected donation
      setState(prev => ({
        ...prev,
        selectedDonation: prev.selectedDonation ? {
          ...prev.selectedDonation,
          items: prev.selectedDonation.items.map(item =>
            item.id === itemId 
              ? { ...item, ...updatedItem, marketplaceListing: updatedItem.marketplaceListing ?? item.marketplaceListing }
              : item
          )
        } : null,
        savingItems: { ...prev.savingItems, [itemId]: false }
      }))
      
      toast.success('Item updated successfully')
    } catch (error: any) {
      console.error('Failed to update item:', error)
      toast.error(error.message || 'Failed to update item')
      
      setState(prev => ({
        ...prev,
        savingItems: { ...prev.savingItems, [itemId]: false }
      }))
    }
  }, [updateState])

  // Perform quick action on item
  const performQuickAction = useCallback(async (itemId: string, action: QuickAction) => {
    setState(prev => ({
      ...prev,
      pendingActions: { ...prev.pendingActions, [itemId]: action }
    }))
    
    try {
      let updates: any = {}
      
      switch (action) {
        case 'list':
          updates.marketplaceListing = { listed: true }
          break
        case 'unlist':
          updates.marketplaceListing = { listed: false }
          break
        case 'sold':
          updates.marketplaceListing = { sold: true }
          break
        case 'print':
          // Handle print action differently - navigate to print page
          if (state.selectedDonation) {
            toast.message('Opening barcode print sheet...')
            // Navigation would be handled by the component
            return
          }
          break
      }
      
      if (action !== 'print') {
        await updateItem(itemId, updates)
      }
      
      const actionMessages = {
        list: 'Item listed successfully',
        unlist: 'Item unlisted successfully',
        sold: 'Item marked as sold',
        print: 'Print initiated'
      }
      
      if (action !== 'list' && action !== 'unlist' && action !== 'sold') {
        toast.success(actionMessages[action])
      }
    } catch (error: any) {
      console.error(`Failed to ${action} item:`, error)
      toast.error(error.message || `Failed to ${action} item`)
    } finally {
      setState(prev => {
        const newPendingActions = { ...prev.pendingActions }
        delete newPendingActions[itemId]
        return {
          ...prev,
          pendingActions: newPendingActions
        }
      })
    }
  }, [updateItem, state.selectedDonation, updateState])

  // Bulk actions
  const performBulkAction = useCallback(async (action: QuickAction, itemIds: string[]) => {
    const promises = itemIds.map(itemId => performQuickAction(itemId, action))
    
    try {
      await Promise.all(promises)
      toast.success(`${action} completed for ${itemIds.length} items`)
    } catch (error) {
      toast.error(`Some items failed to ${action}`)
    }
  }, [performQuickAction])

  // Clear filters
  const clearFilters = useCallback(() => {
    const clearedFilters = {}
    updateState({ filters: clearedFilters, page: 1 })
    loadDonations(1, clearedFilters)
  }, [loadDonations, updateState])

  // Change page
  const changePage = useCallback((newPage: number) => {
    updateState({ page: newPage })
    loadDonations(newPage, state.filters)
  }, [loadDonations, state.filters, updateState])

  // Update filters
  const updateFilters = useCallback((newFilters: EnhancedDonationFiltersState) => {
    updateState({ filters: newFilters, page: 1 })
    loadDonations(1, newFilters)
  }, [loadDonations, updateState])

  // Close donation details
  const closeDonationDetails = useCallback(() => {
    updateState({ 
      selectedDonation: null,
      editingItem: null
    })
  }, [updateState])

  // Set editing item
  const setEditingItem = useCallback((item: EnhancedScrapItem | null) => {
    updateState({ editingItem: item })
  }, [updateState])

  // Initialize dashboard
  useEffect(() => {
    loadDonations()
    loadStats()
  }, []) // Only run on mount

  return {
    // State
    ...state,
    
    // Actions
    loadDonations,
    loadStats,
    refresh,
    loadDonationDetails,
    updateItem,
    performQuickAction,
    performBulkAction,
    clearFilters,
    changePage,
    updateFilters,
    closeDonationDetails,
    setEditingItem,
    updateState
  }
}

// Hook for managing selected items (for bulk actions)
export function useSelectedItems() {
  const [selectedItems, setSelectedItems] = useState<string[]>([])

  const selectAll = useCallback((items: EnhancedScrapItem[]) => {
    setSelectedItems(items.map(item => item.id))
  }, [])

  const selectNone = useCallback(() => {
    setSelectedItems([])
  }, [])

  const toggleSelectAll = useCallback((items: EnhancedScrapItem[]) => {
    if (selectedItems.length === items.length) {
      selectNone()
    } else {
      selectAll(items)
    }
  }, [selectedItems.length, selectAll, selectNone])

  const toggleItem = useCallback((itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    )
  }, [])

  const isSelected = useCallback((itemId: string) => {
    return selectedItems.includes(itemId)
  }, [selectedItems])

  const isAllSelected = useCallback((items: EnhancedScrapItem[]) => {
    return items.length > 0 && selectedItems.length === items.length
  }, [selectedItems])

  const isSomeSelected = useCallback((items: EnhancedScrapItem[]) => {
    return selectedItems.length > 0 && selectedItems.length < items.length
  }, [selectedItems])

  return {
    selectedItems,
    selectAll,
    selectNone,
    toggleSelectAll,
    toggleItem,
    isSelected,
    isAllSelected,
    isSomeSelected,
    setSelectedItems
  }
}