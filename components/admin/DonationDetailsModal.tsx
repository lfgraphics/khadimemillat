"use client"

import React, { useState, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrapItem } from './ScrapItemCard'
import ItemGrid from './dashboard/ItemGrid'
import BulkActions from './dashboard/BulkActions'
import { EnhancedScrapItem, QuickAction } from '@/types/dashboard'
import { calculateValidationStatus } from '@/lib/utils/validation'
import { ImageModalProvider } from '@/components/marketplace/ImageModalProvider'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Calendar,
  User,
  Package,
  AlertCircle,
  ArrowLeft,
  Home,
  ChevronRight,
  ChevronDown,
  Phone,
  Mail,
  Info,
  BarChart3,
  Grid3X3,
  X
} from 'lucide-react'
import { useResponsiveBreakpoint } from '@/lib/utils/responsive'
import { generateAriaLabel } from '@/lib/utils/accessibility'

export type DonationDetails = {
  id: string
  donor?: { id: string; name?: string; email?: string; phone?: string }
  collectedBy?: { id: string; name?: string; email?: string }
  createdAt?: string
  status?: string
  items: ScrapItem[]
}

interface DonationDetailsModalProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  donation?: DonationDetails
  onItemAction?: (itemId: string, action: QuickAction) => void
  onBulkAction?: (action: QuickAction, itemIds: string[]) => void
  onItemEdit?: (item: EnhancedScrapItem) => void
  savingItems?: Record<string, boolean>
  pendingActions?: Record<string, QuickAction | undefined>
  validationErrors?: Record<string, string[]>
  onNavigateBack?: () => void
  breadcrumbContext?: {
    parentName: string
    parentPath?: string
  }
}

export default function DonationDetailsModal({
  open,
  onOpenChange,
  donation,
  onItemAction,
  onBulkAction,
  onItemEdit,
  savingItems = {},
  pendingActions = {},
  validationErrors = {},
  onNavigateBack,
  breadcrumbContext
}: DonationDetailsModalProps) {

  // Responsive breakpoint
  const breakpoint = useResponsiveBreakpoint()
  const isMobile = breakpoint === 'mobile'

  // Bulk selection state
  const [selectedItems, setSelectedItems] = useState<string[]>([])

  // Accordion state for mobile
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    donorInfo: !isMobile,
    statistics: !isMobile,
    items: true, // Always open items section
  })

  // Toggle accordion section
  const toggleSection = (section: string) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  // Convert ScrapItems to EnhancedScrapItems
  const enhancedItems: EnhancedScrapItem[] = React.useMemo(() => {
    if (!donation?.items) return []

    return donation.items.map(item => {
      const enhancedItem: EnhancedScrapItem = {
        ...item,
        description: '', // ScrapItem doesn't have description field
        validationStatus: { canList: true, errors: [], warnings: [] },
        createdAt: donation.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      // Calculate proper validation status
      enhancedItem.validationStatus = calculateValidationStatus(enhancedItem)

      return enhancedItem
    })
  }, [donation])

  // Calculate donation statistics
  const stats = React.useMemo(() => {
    if (!enhancedItems.length) return null

    const totalItems = enhancedItems.length
    const listedItems = enhancedItems.filter(item => item.marketplaceListing.listed).length
    const soldItems = enhancedItems.filter(item => item.marketplaceListing.sold).length
    const itemsWithoutPrice = enhancedItems.filter(item => !item.marketplaceListing.demandedPrice).length
    const validItems = enhancedItems.filter(item => item.validationStatus.canList).length

    return {
      totalItems,
      listedItems,
      soldItems,
      itemsWithoutPrice,
      validItems,
      invalidItems: totalItems - validItems
    }
  }, [enhancedItems])

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const handleItemEdit = (item: EnhancedScrapItem) => {
    onItemEdit?.(item)
  }

  const handleQuickAction = (itemId: string, action: QuickAction) => {
    onItemAction?.(itemId, action)
  }

  // Bulk action handlers
  const handleSelectAll = useCallback((selected: boolean) => {
    if (selected) {
      setSelectedItems(enhancedItems.map(item => item.id))
    } else {
      setSelectedItems([])
    }
  }, [enhancedItems])

  const handleSelectItem = useCallback((itemId: string, selected: boolean) => {
    setSelectedItems(prev => {
      if (selected) {
        return [...prev, itemId]
      } else {
        return prev.filter(id => id !== itemId)
      }
    })
  }, [])

  const handleBulkAction = useCallback((action: QuickAction, itemIds: string[]) => {
    onBulkAction?.(action, itemIds)
    // Clear selection after bulk action
    setSelectedItems([])
  }, [onBulkAction])

  // Clear selection when modal closes
  React.useEffect(() => {
    if (!open) {
      setSelectedItems([])
    }
  }, [open])

  // Reset accordion state when breakpoint changes
  React.useEffect(() => {
    setOpenSections({
      donorInfo: !isMobile,
      statistics: !isMobile,
      items: true,
    })
  }, [isMobile])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`
        ${isMobile ? 'max-w-[95vw] max-h-[95vh] p-0' : 'max-w-6xl max-h-[90vh]'} 
        overflow-hidden flex flex-col
      `}>
        <ImageModalProvider>
          {/* Mobile Header */}
          {isMobile ? (
            <div className="flex-shrink-0 bg-background border-b p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {onNavigateBack && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onNavigateBack}
                      className="p-2"
                      aria-label="Go back"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                  )}
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    <h2 className="font-semibold text-lg">Donation Details</h2>
                  </div>
                </div>

              </div>
              {donation?.id && (
                <Badge variant="outline" className="text-xs">
                  ID: {donation.id.slice(-8)}
                </Badge>
              )}
            </div>
          ) : (
            <DialogHeader className="flex-shrink-0 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  <span className="text-sm text-muted-foreground">
                    {breadcrumbContext?.parentName || 'Dashboard'}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Donation Details</span>
                </div>

                {onNavigateBack && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onNavigateBack}
                    className="flex items-center gap-1"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Button>
                )}
              </div>

              <DialogTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Donation Details
                {donation?.id && (
                  <Badge variant="outline" className="text-xs">
                    ID: {donation.id.slice(-8)}
                  </Badge>
                )}
              </DialogTitle>
            </DialogHeader>
          )}

          {!donation ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <div className="text-sm text-muted-foreground">Loading donation details...</div>
              </div>
            </div>
          ) : (
            <div className={`flex-1 overflow-hidden flex flex-col ${isMobile ? 'p-0' : 'space-y-6'}`}>
              {/* Mobile Accordion Layout */}
              {isMobile ? (
                <div className="flex-1 overflow-y-auto">
                  <div className="space-y-1">
                    {/* Donor Information Accordion */}
                    <Collapsible
                      open={openSections.donorInfo}
                      onOpenChange={() => toggleSection('donorInfo')}
                    >
                      <CollapsibleTrigger asChild>
                        <Card className="cursor-pointer hoact:bg-muted/50 transition-colors">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-primary" />
                                <CardTitle className="text-base">Donor Information</CardTitle>
                              </div>
                              <ChevronDown
                                className={`h-4 w-4 transition-transform duration-200 ${openSections.donorInfo ? 'rotate-180' : ''
                                  }`}
                              />
                            </div>
                          </CardHeader>
                        </Card>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <Card className="mt-1">
                          <CardContent className="pt-4">
                            <div className="space-y-4">
                              <div>
                                <div className="text-sm font-medium text-muted-foreground mb-1">Name</div>
                                <div className="font-medium">
                                  {donation.donor?.name || donation.donor?.id || 'Unknown'}
                                </div>
                              </div>

                              {donation.donor?.email && (
                                <div>
                                  <div className="text-sm font-medium text-muted-foreground mb-1">Email</div>
                                  <div className="flex items-center gap-2">
                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">{donation.donor.email}</span>
                                  </div>
                                </div>
                              )}

                              {donation.donor?.phone && (
                                <div>
                                  <div className="text-sm font-medium text-muted-foreground mb-1">Phone</div>
                                  <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">{donation.donor.phone}</span>
                                  </div>
                                </div>
                              )}

                              <div>
                                <div className="text-sm font-medium text-muted-foreground mb-1">Status</div>
                                <Badge className={`text-xs ${getStatusColor(donation.status)}`}>
                                  {donation.status?.replace('_', ' ') || 'Unknown'}
                                </Badge>
                              </div>

                              <div>
                                <div className="text-sm font-medium text-muted-foreground mb-1">Created</div>
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm">
                                    {donation.createdAt
                                      ? new Date(donation.createdAt).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })
                                      : 'Unknown'
                                    }
                                  </span>
                                </div>
                              </div>

                              {donation.collectedBy && (
                                <div>
                                  <div className="text-sm font-medium text-muted-foreground mb-1">Collected By</div>
                                  <div className="text-sm">
                                    {donation.collectedBy.name || donation.collectedBy.id}
                                  </div>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </CollapsibleContent>
                    </Collapsible>

                    {/* Statistics Accordion */}
                    {stats && (
                      <Collapsible
                        open={openSections.statistics}
                        onOpenChange={() => toggleSection('statistics')}
                      >
                        <CollapsibleTrigger asChild>
                          <Card className="cursor-pointer hoact:bg-muted/50 transition-colors">
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <BarChart3 className="h-4 w-4 text-primary" />
                                  <CardTitle className="text-base">Statistics</CardTitle>
                                </div>
                                <ChevronDown
                                  className={`h-4 w-4 transition-transform duration-200 ${openSections.statistics ? 'rotate-180' : ''
                                    }`}
                                />
                              </div>
                            </CardHeader>
                          </Card>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <Card className="mt-1">
                            <CardContent className="pt-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div className="text-center p-3 bg-muted/30 rounded-lg">
                                  <div className="text-xl font-bold">{stats.totalItems}</div>
                                  <div className="text-xs text-muted-foreground">Total Items</div>
                                </div>
                                <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                  <div className="text-xl font-bold text-green-600">{stats.validItems}</div>
                                  <div className="text-xs text-muted-foreground">Valid</div>
                                </div>
                                <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                  <div className="text-xl font-bold text-red-600">{stats.invalidItems}</div>
                                  <div className="text-xs text-muted-foreground">Invalid</div>
                                </div>
                                <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                  <div className="text-xl font-bold text-blue-600">{stats.listedItems}</div>
                                  <div className="text-xs text-muted-foreground">Listed</div>
                                </div>
                                <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                                  <div className="text-xl font-bold text-purple-600">{stats.soldItems}</div>
                                  <div className="text-xs text-muted-foreground">Sold</div>
                                </div>
                                <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                                  <div className="text-xl font-bold text-orange-600">{stats.itemsWithoutPrice}</div>
                                  <div className="text-xs text-muted-foreground">No Price</div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </CollapsibleContent>
                      </Collapsible>
                    )}

                    {/* Items Accordion - Always expanded */}
                    <Collapsible open={openSections.items} onOpenChange={() => toggleSection('items')}>
                      <CollapsibleTrigger asChild>
                        <Card className="cursor-pointer hoact:bg-muted/50 transition-colors">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Grid3X3 className="h-4 w-4 text-primary" />
                                <CardTitle className="text-base">
                                  Items ({enhancedItems.length})
                                </CardTitle>
                              </div>
                              <ChevronDown
                                className={`h-4 w-4 transition-transform duration-200 ${openSections.items ? 'rotate-180' : ''
                                  }`}
                              />
                            </div>
                          </CardHeader>
                        </Card>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="mt-1">
                          {/* Bulk Actions for Mobile */}
                          {enhancedItems.length > 0 && onBulkAction && (
                            <Card className="mb-2">
                              <CardContent className="pt-4">
                                <BulkActions
                                  selectedItems={selectedItems}
                                  allItems={enhancedItems}
                                  onSelectAll={handleSelectAll}
                                  onSelectItem={handleSelectItem}
                                  onBulkAction={handleBulkAction}
                                  loading={Object.keys(savingItems).length > 0}
                                />
                              </CardContent>
                            </Card>
                          )}

                          {/* Items Grid */}
                          {enhancedItems.length > 0 ? (
                            <ItemGrid
                              items={enhancedItems}
                              onEditItem={handleItemEdit}
                              onQuickAction={handleQuickAction}
                              savingItems={savingItems}
                              validationErrors={validationErrors}
                              compact={true}
                              selectedItems={selectedItems}
                              onSelectItem={handleSelectItem}
                            />
                          ) : (
                            <Card>
                              <CardContent className="py-12">
                                <div className="text-center">
                                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                  <h3 className="text-lg font-medium mb-2">No Items Found</h3>
                                  <p className="text-sm text-muted-foreground">
                                    This donation doesn't contain any items yet.
                                  </p>
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                </div>
              ) : (
                /* Desktop Layout */
                <>
                  {/* Donation Information Header */}
                  <div className="flex-shrink-0 bg-muted/30 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-start gap-3">
                        <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-muted-foreground">Donor</div>
                          <div className="font-medium truncate">
                            {donation.donor?.name || donation.donor?.id || 'Unknown'}
                          </div>
                          {donation.donor?.email && (
                            <div className="text-xs text-muted-foreground truncate">
                              {donation.donor.email}
                            </div>
                          )}
                          {donation.donor?.phone && (
                            <div className="text-xs text-muted-foreground">
                              {donation.donor.phone}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="h-4 w-4 mt-0.5">
                          <Badge className={`text-xs ${getStatusColor(donation.status)}`}>
                            {donation.status?.replace('_', ' ') || 'Unknown'}
                          </Badge>
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-muted-foreground">Status</div>
                          <div className="text-sm">
                            {donation.collectedBy && (
                              <div className="text-xs text-muted-foreground">
                                Collected by: {donation.collectedBy.name || donation.collectedBy.id}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-muted-foreground">Created</div>
                          <div className="text-sm">
                            {donation.createdAt
                              ? new Date(donation.createdAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                              : 'Unknown'
                            }
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Statistics */}
                    {stats && (
                      <div className="mt-4 pt-4 border-t border-border/50">
                        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                          <div className="text-center">
                            <div className="text-lg font-semibold">{stats.totalItems}</div>
                            <div className="text-xs text-muted-foreground">Total Items</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-semibold text-green-600">{stats.validItems}</div>
                            <div className="text-xs text-muted-foreground">Valid</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-semibold text-red-600">{stats.invalidItems}</div>
                            <div className="text-xs text-muted-foreground">Invalid</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-semibold text-blue-600">{stats.listedItems}</div>
                            <div className="text-xs text-muted-foreground">Listed</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-semibold text-purple-600">{stats.soldItems}</div>
                            <div className="text-xs text-muted-foreground">Sold</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-semibold text-orange-600">{stats.itemsWithoutPrice}</div>
                            <div className="text-xs text-muted-foreground">No Price</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bulk Actions */}
                  {enhancedItems.length > 0 && onBulkAction && (
                    <div className="flex-shrink-0">
                      <BulkActions
                        selectedItems={selectedItems}
                        allItems={enhancedItems}
                        onSelectAll={handleSelectAll}
                        onSelectItem={handleSelectItem}
                        onBulkAction={handleBulkAction}
                        loading={Object.keys(savingItems).length > 0}
                      />
                    </div>
                  )}

                  {/* Items Grid */}
                  <div className="flex-1 overflow-y-auto">
                    {enhancedItems.length > 0 ? (
                      <ItemGrid
                        items={enhancedItems}
                        onEditItem={handleItemEdit}
                        onQuickAction={handleQuickAction}
                        savingItems={savingItems}
                        validationErrors={validationErrors}
                        compact={true}
                        selectedItems={selectedItems}
                        onSelectItem={handleSelectItem}
                      />
                    ) : (
                      <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                            No Items Found
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            This donation doesn't contain any items yet.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Footer - Only for desktop */}
              {!isMobile && (
                <div className="flex-shrink-0 pt-4 border-t border-border/50">
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-muted-foreground">
                      {enhancedItems.length > 0 && (
                        <>
                          Showing {enhancedItems.length} item{enhancedItems.length !== 1 ? 's' : ''}
                          {selectedItems.length > 0 && (
                            <span className="ml-2 text-blue-600">
                              • {selectedItems.length} selected
                            </span>
                          )}
                          {stats && stats.invalidItems > 0 && (
                            <span className="ml-2 text-red-600">
                              • {stats.invalidItems} item{stats.invalidItems !== 1 ? 's' : ''} need{stats.invalidItems === 1 ? 's' : ''} attention
                            </span>
                          )}
                        </>
                      )}
                    </div>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                      Close
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </ImageModalProvider>
      </DialogContent>
    </Dialog>
  )
}
