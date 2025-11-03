"use client"

import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { 
  Edit, 
  ShoppingCart, 
  X, 
  DollarSign, 
  Printer,
  Image as ImageIcon,
  Eye,
  ChevronDown,
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react'
import { EnhancedScrapItem, QuickAction } from '@/types/dashboard'
import { 
  getItemStatusColor, 
  getItemStatusText, 
  getConditionColor,
  formatCurrency 
} from '@/lib/utils/dashboard'
import { formatValidationErrors } from '@/lib/utils/validation'
import { useImageModal } from '@/components/marketplace/ImageModalProvider'
import { generateAriaLabel, keyboardNavigation } from '@/lib/utils/accessibility'
import MarkAsSoldModal from '@/components/admin/modals/MarkAsSoldModal'

interface MobileItemCardProps {
  item: EnhancedScrapItem
  onEdit: (item: EnhancedScrapItem) => void
  onQuickAction: (itemId: string, action: QuickAction) => void
  loading: boolean
  validationErrors: string[]
  pendingActions?: Partial<Record<QuickAction, boolean>>
  selected?: boolean
  onSelect?: (selected: boolean) => void
}

export default function MobileItemCard({
  item,
  onEdit,
  onQuickAction,
  loading,
  validationErrors,
  pendingActions = {},
  selected = false,
  onSelect
}: MobileItemCardProps) {
  const { openModal } = useImageModal()
  const [isExpanded, setIsExpanded] = useState(false)
  
  const statusColor = getItemStatusColor(item)
  const statusText = getItemStatusText(item)
  const conditionColor = getConditionColor(item.condition)
  const hasValidationErrors = validationErrors.length > 0 || !item.validationStatus.canList
  
  // Combine all photos for lightbox
  const allPhotos = [...item.photos.before, ...item.photos.after]
  const hasPhotos = allPhotos.length > 0
  
  const quickActions: { action: QuickAction; label: string; icon: any; variant?: any }[] = [
    {
      action: 'list',
      label: 'List',
      icon: ShoppingCart,
      variant: 'default'
    },
    {
      action: 'unlist',
      label: 'Unlist',
      icon: X,
      variant: 'outline'
    },
    {
      action: 'sold',
      label: 'Mark Sold',
      icon: DollarSign,
      variant: 'outline'
    },
    {
      action: 'print',
      label: 'Print',
      icon: Printer,
      variant: 'outline'
    }
  ]

  const getAvailableActions = (): QuickAction[] => {
    if (item.marketplaceListing.sold) return ['print']
    if (item.marketplaceListing.listed) return ['unlist', 'sold', 'print']
    if (item.validationStatus.canList) return ['list', 'print']
    return ['print']
  }

  const availableActions = getAvailableActions()
  const openSold = () => {
    ;(document?.getElementById(`mark-sold-trigger-${item.id}`) as HTMLButtonElement | null)?.click()
  }

  return (
    <Card 
      className={`
        transition-all duration-300 ease-out
        ${hasValidationErrors ? 'border-red-200 dark:border-red-800' : ''} 
        ${selected ? 'ring-2 ring-primary shadow-lg' : ''}
        ${loading ? 'animate-pulse opacity-70' : ''}
      `}
      role="article"
      aria-label={generateAriaLabel(item.name, 'item card', 'clickable', 'Click to view details')}
    >
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardContent className="p-4 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                {onSelect && (
                  <Checkbox
                    checked={selected}
                    onCheckedChange={onSelect}
                    className="mt-1 h-4 w-4"
                    aria-label={`Select item ${item.name}`}
                    onClick={(e) => e.stopPropagation()}
                  />
                )}
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <h3 
                      className="font-medium text-foreground truncate text-base"
                      id={`${item.id}-title`}
                    >
                      {item.name}
                    </h3>
                    <ChevronDown 
                      className={`h-4 w-4 transition-transform duration-200 flex-shrink-0 ml-2 ${
                        isExpanded ? 'rotate-180' : ''
                      }`} 
                      aria-hidden="true"
                    />
                  </div>
                  
                  {/* Status badges */}
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <Badge className={`${statusColor} text-xs`}>
                      {statusText}
                    </Badge>
                    <Badge variant="outline" className={`${conditionColor} text-xs`}>
                      {item.condition}
                    </Badge>
                    {hasValidationErrors && (
                      <Badge variant="outline" className="text-red-600 bg-red-50 dark:bg-red-900/20 text-xs">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Issues
                      </Badge>
                    )}
                    {hasPhotos && (
                      <Badge variant="outline" className="text-xs">
                        <ImageIcon className="h-3 w-3 mr-1" />
                        {allPhotos.length}
                      </Badge>
                    )}
                  </div>
                  
                  {/* Price info */}
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      {item.marketplaceListing.demandedPrice ? (
                        <span className="font-medium text-green-600">
                          {formatCurrency(item.marketplaceListing.demandedPrice)}
                        </span>
                      ) : (
                        <span className="text-red-600 text-xs">No price set</span>
                      )}
                    </div>
                    
                    {item.marketplaceListing.sold && item.marketplaceListing.salePrice && (
                      <span className="text-xs text-muted-foreground">
                        Sold: {formatCurrency(item.marketplaceListing.salePrice)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0 px-4 pb-4">
            <div className="space-y-4">
              {/* Description */}
              {item.marketplaceListing.description && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Description</div>
                  <p className="text-sm text-foreground">
                    {item.marketplaceListing.description}
                  </p>
                </div>
              )}
              
              {/* Photo gallery */}
              {hasPhotos && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">
                      Photos ({allPhotos.length})
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openModal(allPhotos)}
                      className="text-xs h-6 px-2"
                      aria-label={`View all ${allPhotos.length} photos for ${item.name}`}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View All
                    </Button>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {allPhotos.slice(0, 8).map((photo, index) => (
                      <div
                        key={index}
                        className="relative aspect-square rounded-md overflow-hidden bg-muted cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => openModal(allPhotos)}
                        role="button"
                        tabIndex={0}
                        aria-label={`View photo ${index + 1} of ${allPhotos.length} for ${item.name}`}
                        onKeyDown={(e) => keyboardNavigation.handleKeyDown(e, () => openModal(allPhotos))}
                      >
                        <img
                          src={photo}
                          alt={`${item.name} photo ${index + 1}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        {index === 7 && allPhotos.length > 8 && (
                          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                            <span className="text-white text-xs font-medium">
                              +{allPhotos.length - 8}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Validation errors */}
              {hasValidationErrors && (
                <div 
                  className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border-l-2 border-red-500"
                  role="alert"
                  aria-label="Validation errors"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-medium">Issues Found</span>
                  </div>
                  <div className="text-xs">
                    {formatValidationErrors(item.validationStatus)}
                  </div>
                </div>
              )}
              
              {/* Item details */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground mb-1">Created</div>
                  <div className="text-foreground">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">Updated</div>
                  <div className="text-foreground">
                    {new Date(item.updatedAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
              
              {/* Action buttons */}
              <div className="flex flex-col gap-2 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Actions</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onEdit(item)}
                    disabled={loading}
                    className="text-xs"
                    aria-label={generateAriaLabel('Edit', item.name, 'button', 'Click to edit item')}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  {quickActions
                    .filter(action => availableActions.includes(action.action))
                    .map(action => {
                      const Icon = action.icon
                      const isActionPending = pendingActions[action.action] || false
                      const isDisabled = loading || 
                        isActionPending || 
                        (action.action === 'list' && !item.validationStatus.canList)
                      
                      return (
                        <Button
                          key={action.action}
                          size="sm"
                          variant={action.variant || 'outline'}
                          onClick={() => (action.action === 'sold' ? openSold() : onQuickAction(item.id, action.action))}
                          disabled={isDisabled}
                          className="text-xs"
                          aria-label={generateAriaLabel(action.label, item.name, 'button', `Click to ${action.label.toLowerCase()}`)}
                        >
                          <Icon 
                            className={`h-3 w-3 mr-1 ${isActionPending ? 'animate-spin' : ''}`} 
                            aria-hidden="true"
                          />
                          {isActionPending ? 'Processing...' : action.label}
                        </Button>
                      )
                    })}
                </div>
                {/* Hidden trigger and modal for sold action */}
                {!item.marketplaceListing.sold && (
                  <>
                    <button id={`mark-sold-trigger-${item.id}`} className="hidden" />
                    <MarkAsSoldModal
                      itemId={item.id}
                      defaultSalePrice={item.marketplaceListing.salePrice}
                      trigger={<button id={`mark-sold-trigger-${item.id}-internal`} className="hidden" />}
                    />
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}