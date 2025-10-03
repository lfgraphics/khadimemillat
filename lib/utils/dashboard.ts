// Dashboard utility functions

import { DashboardStats, EnhancedScrapItem, DonationRow, FilterPreset, EnhancedDonationFiltersState } from '@/types/dashboard'
import { calculateValidationStatus } from './validation'

// Calculate dashboard statistics from donation data
export function calculateDashboardStats(
  donations: DonationRow[],
  allItems: EnhancedScrapItem[] = []
): DashboardStats {
  try {
    const listedItems = allItems.filter(item => 
      item.marketplaceListing?.listed && !item.marketplaceListing?.sold
    )
    
    const soldItems = allItems.filter(item => 
      item.marketplaceListing?.sold
    )
    
    const itemsWithoutPrice = allItems.filter(item => 
      !item.marketplaceListing?.demandedPrice || item.marketplaceListing.demandedPrice <= 0
    )
    
    const totalRevenue = soldItems.reduce((sum, item) => {
      const salePrice = item.marketplaceListing?.salePrice || 0
      return sum + salePrice
    }, 0)
    
    const pendingItems = allItems.filter(item => {
      try {
        const validation = calculateValidationStatus(item)
        return !validation.canList || (!item.marketplaceListing?.listed && validation.canList)
      } catch {
        // If validation fails, consider it pending
        return true
      }
    })
    
    return {
      totalDonations: donations?.length || 0,
      pendingItems: pendingItems.length,
      listedItems: listedItems.length,
      soldItems: soldItems.length,
      itemsWithoutPrice: itemsWithoutPrice.length,
      totalRevenue
    }
  } catch (error) {
    console.error('Error calculating dashboard stats:', error)
    
    // Return safe fallback values
    return {
      totalDonations: 0,
      pendingItems: 0,
      listedItems: 0,
      soldItems: 0,
      itemsWithoutPrice: 0,
      totalRevenue: 0
    }
  }
}

// Calculate statistics with additional metrics
export function calculateEnhancedDashboardStats(
  donations: DonationRow[],
  allItems: EnhancedScrapItem[] = []
): DashboardStats & { 
  averageItemValue: number
  profitMargin: number
  conversionRate: number
} {
  const baseStats = calculateDashboardStats(donations, allItems)
  
  try {
    // Calculate average item value from sold items
    const soldItems = allItems.filter(item => item.marketplaceListing?.sold)
    const averageItemValue = soldItems.length > 0 
      ? soldItems.reduce((sum, item) => sum + (item.marketplaceListing?.salePrice || 0), 0) / soldItems.length
      : 0
    
    // Calculate profit margin
    const totalCost = soldItems.reduce((sum, item) => sum + (item.repairingCost || 0), 0)
    const profitMargin = baseStats.totalRevenue > 0 
      ? ((baseStats.totalRevenue - totalCost) / baseStats.totalRevenue) * 100
      : 0
    
    // Calculate conversion rate (listed to sold)
    const totalListedItems = allItems.filter(item => 
      item.marketplaceListing?.listed || item.marketplaceListing?.sold
    ).length
    const conversionRate = totalListedItems > 0 
      ? (baseStats.soldItems / totalListedItems) * 100
      : 0
    
    return {
      ...baseStats,
      averageItemValue,
      profitMargin,
      conversionRate
    }
  } catch (error) {
    console.error('Error calculating enhanced stats:', error)
    return {
      ...baseStats,
      averageItemValue: 0,
      profitMargin: 0,
      conversionRate: 0
    }
  }
}

// Format currency for display
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

// Format large numbers with abbreviations
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

// Get status color for items
export function getItemStatusColor(item: EnhancedScrapItem): string {
  if (item.marketplaceListing.sold) return 'text-green-600 bg-green-50'
  if (item.marketplaceListing.listed) return 'text-blue-600 bg-blue-50'
  
  const validation = calculateValidationStatus(item)
  if (!validation.canList) return 'text-red-600 bg-red-50'
  
  return 'text-yellow-600 bg-yellow-50'
}

// Get status text for items
export function getItemStatusText(item: EnhancedScrapItem): string {
  if (item.marketplaceListing.sold) return 'Sold'
  if (item.marketplaceListing.listed) return 'Listed'
  
  const validation = calculateValidationStatus(item)
  if (!validation.canList) return 'Invalid'
  
  return 'Ready'
}

// Get condition color
export function getConditionColor(condition: string): string {
  switch (condition) {
    case 'new': return 'text-green-600 bg-green-50'
    case 'good': return 'text-blue-600 bg-blue-50'
    case 'repairable': return 'text-yellow-600 bg-yellow-50'
    case 'scrap': return 'text-red-600 bg-red-50'
    case 'not applicable': return 'text-gray-600 bg-gray-50'
    default: return 'text-gray-600 bg-gray-50'
  }
}

// Predefined filter presets
export const FILTER_PRESETS: FilterPreset[] = [
  {
    id: 'all',
    name: 'All Items',
    filters: {},
    icon: 'List'
  },
  {
    id: 'without-price',
    name: 'Without Price',
    filters: { hasPrice: false },
    icon: 'AlertCircle'
  },
  {
    id: 'ready-to-list',
    name: 'Ready to List',
    filters: { canList: true, itemStatus: 'unlisted' },
    icon: 'CheckCircle'
  },
  {
    id: 'listed',
    name: 'Listed Items',
    filters: { itemStatus: 'listed' },
    icon: 'ShoppingCart'
  },
  {
    id: 'sold',
    name: 'Sold Items',
    filters: { itemStatus: 'sold' },
    icon: 'DollarSign'
  },
  {
    id: 'repairable',
    name: 'Repairable Items',
    filters: { condition: 'repairable' },
    icon: 'Wrench'
  }
]

// Apply filters to items
export function applyFilters(
  items: EnhancedScrapItem[],
  filters: EnhancedDonationFiltersState
): EnhancedScrapItem[] {
  return items.filter(item => {
    // Search query filter
    if (filters.q) {
      const query = filters.q.toLowerCase()
      if (!item.name.toLowerCase().includes(query) &&
          !item.marketplaceListing.description?.toLowerCase().includes(query)) {
        return false
      }
    }
    
    // Condition filter
    if (filters.condition && item.condition !== filters.condition) {
      return false
    }
    
    // Item status filter
    if (filters.itemStatus) {
      switch (filters.itemStatus) {
        case 'listed':
          if (!item.marketplaceListing.listed || item.marketplaceListing.sold) return false
          break
        case 'unlisted':
          if (item.marketplaceListing.listed || item.marketplaceListing.sold) return false
          break
        case 'sold':
          if (!item.marketplaceListing.sold) return false
          break
      }
    }
    
    // Price filter
    if (filters.hasPrice !== undefined) {
      const hasPrice = item.marketplaceListing.demandedPrice && item.marketplaceListing.demandedPrice > 0
      if (filters.hasPrice !== hasPrice) return false
    }
    
    // Can list filter
    if (filters.canList !== undefined) {
      const validation = calculateValidationStatus(item)
      if (filters.canList !== validation.canList) return false
    }
    
    // Date filters (based on item creation date)
    if (filters.from) {
      const itemDate = new Date(item.createdAt)
      if (itemDate < filters.from) return false
    }
    
    if (filters.to) {
      const itemDate = new Date(item.createdAt)
      if (itemDate > filters.to) return false
    }
    
    return true
  })
}

// Sort items by various criteria
export function sortItems(
  items: EnhancedScrapItem[],
  sortBy: 'name' | 'condition' | 'price' | 'status' | 'created' = 'created',
  sortOrder: 'asc' | 'desc' = 'desc'
): EnhancedScrapItem[] {
  return [...items].sort((a, b) => {
    let comparison = 0
    
    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name)
        break
      case 'condition':
        comparison = a.condition.localeCompare(b.condition)
        break
      case 'price':
        const priceA = a.marketplaceListing.demandedPrice || 0
        const priceB = b.marketplaceListing.demandedPrice || 0
        comparison = priceA - priceB
        break
      case 'status':
        const statusA = getItemStatusText(a)
        const statusB = getItemStatusText(b)
        comparison = statusA.localeCompare(statusB)
        break
      case 'created':
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        break
    }
    
    return sortOrder === 'asc' ? comparison : -comparison
  })
}

// Group items by status
export function groupItemsByStatus(items: EnhancedScrapItem[]) {
  return items.reduce((groups, item) => {
    const status = getItemStatusText(item)
    if (!groups[status]) {
      groups[status] = []
    }
    groups[status].push(item)
    return groups
  }, {} as Record<string, EnhancedScrapItem[]>)
}

// Calculate profit for sold items
export function calculateProfit(item: EnhancedScrapItem): number {
  if (!item.marketplaceListing.sold || !item.marketplaceListing.salePrice) {
    return 0
  }
  
  return item.marketplaceListing.salePrice - (item.repairingCost || 0)
}

// Get profit margin percentage
export function getProfitMargin(item: EnhancedScrapItem): number {
  if (!item.marketplaceListing.sold || !item.marketplaceListing.salePrice) {
    return 0
  }
  
  const profit = calculateProfit(item)
  return (profit / item.marketplaceListing.salePrice) * 100
}

// Format relative time
export function formatRelativeTime(date: string | Date): string {
  const now = new Date()
  const itemDate = new Date(date)
  const diffInSeconds = Math.floor((now.getTime() - itemDate.getTime()) / 1000)
  
  if (diffInSeconds < 60) return 'Just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`
  
  return itemDate.toLocaleDateString()
}