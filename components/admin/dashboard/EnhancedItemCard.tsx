"use client"

import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { 
  Edit, 
  ShoppingCart, 
  X, 
  DollarSign, 
  Printer,
  Image as ImageIcon,
  Eye
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
import ConfirmationDialog from './ConfirmationDialog'
import { ValidationIndicator } from './ValidationStatusTooltip'
import { generateAriaLabel, keyboardNavigation } from '@/lib/utils/accessibility'
import MarkAsSoldModal from '@/components/admin/modals/MarkAsSoldModal'

interface EnhancedItemCardProps {
  item: EnhancedScrapItem
  onEdit: (item: EnhancedScrapItem) => void
  onQuickAction: (itemId: string, action: QuickAction) => void
  loading: boolean
  validationErrors: string[]
  compact?: boolean
  pendingActions?: Partial<Record<QuickAction, boolean>>
  selected?: boolean
  onSelect?: (selected: boolean) => void
}

export default function EnhancedItemCard({
  item,
  onEdit,
  onQuickAction,
  loading,
  validationErrors,
  compact = false,
  pendingActions = {},
  selected = false,
  onSelect
}: EnhancedItemCardProps) {
  const { openModal } = useImageModal()
  const [confirmationDialog, setConfirmationDialog] = useState<{
    open: boolean
    action: QuickAction | null
  }>({ open: false, action: null })
  
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

  // Determine which actions need confirmation
  const needsConfirmation = (action: QuickAction): boolean => {
    return ['unlist', 'sold'].includes(action)
  }

  // Handle quick action click
  const handleQuickAction = (action: QuickAction) => {
    if (needsConfirmation(action)) {
      if (action === 'sold') {
        // Open mark-as-sold modal instead of generic confirm
        ;(document?.getElementById(`mark-sold-trigger-${item.id}`) as HTMLButtonElement | null)?.click()
        return
      }
      setConfirmationDialog({ open: true, action })
    } else {
      onQuickAction(item.id, action)
    }
  }

  // Handle confirmation
  const handleConfirmAction = () => {
    if (confirmationDialog.action) {
      onQuickAction(item.id, confirmationDialog.action)
      setConfirmationDialog({ open: false, action: null })
    }
  }

  return (
    <Card 
      className={`
        hover-lift hover-glow transition-all duration-300 ease-out
        ${hasValidationErrors ? 'border-red-200 dark:border-red-800' : ''} 
        ${selected ? 'ring-2 ring-primary shadow-lg animate-scale-in' : ''}
        ${loading ? 'animate-pulse opacity-70' : ''}
        group cursor-pointer focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2
      `}
      role="article"
      aria-label={generateAriaLabel(item.name, 'item card', 'clickable', 'Click to view details')}
      tabIndex={0}
      onKeyDown={(e) => keyboardNavigation.handleKeyDown(e, () => onEdit(item))}
    >
      <CardContent className={`p-4 ${compact ? 'space-y-2' : 'space-y-3'}`}>
        {/* Item header with optional selection */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {onSelect && (
              <Checkbox
                checked={selected}
                onCheckedChange={onSelect}
                className="mt-1 h-4 w-4"
                aria-label={`Select item ${item.name}`}
                aria-describedby={`${item.id}-description`}
              />
            )}
            <div className="flex-1 min-w-0">
              <h3 
                className={`font-medium text-gray-900 dark:text-gray-100 truncate ${compact ? 'text-sm' : 'text-base'}`}
                id={`${item.id}-title`}
              >
                {item.name}
              </h3>
              {item.marketplaceListing.description && !compact && (
                <p 
                  className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2"
                  id={`${item.id}-description`}
                >
                  {item.marketplaceListing.description}
                </p>
              )}
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onEdit(item)}
            disabled={loading}
            className="ml-2 flex-shrink-0 button-press hover-lift transition-all duration-200 opacity-0 group-hover:opacity-100 focus:opacity-100"
            aria-label={generateAriaLabel('Edit', item.name, 'button', 'Click to edit item')}
            aria-describedby={`${item.id}-title`}
          >
            <Edit className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
            <span className="sr-only">Edit item</span>
          </Button>
        </div>

        {/* Status badges */}
        <div className="flex items-center gap-2 flex-wrap" role="group" aria-label="Item status indicators">
          <Badge 
            className={`${statusColor} text-xs`}
            aria-label={generateAriaLabel(statusText, item.name, 'status badge')}
          >
            {statusText}
          </Badge>
          <Badge 
            variant="outline" 
            className={`${conditionColor} text-xs`}
            aria-label={`Condition: ${item.condition}`}
          >
            {item.condition}
          </Badge>
          <ValidationIndicator validation={item.validationStatus} size="xs" />
          {hasPhotos && compact && (
            <Badge 
              variant="outline" 
              className="text-xs cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 hover-scale" 
              onClick={() => openModal(allPhotos)}
              role="button"
              tabIndex={0}
              aria-label={`View ${allPhotos.length} photos for ${item.name}`}
              onKeyDown={(e) => keyboardNavigation.handleKeyDown(e, () => openModal(allPhotos))}
            >
              <ImageIcon className="h-3 w-3 mr-1 transition-transform duration-200 hover:scale-110" aria-hidden="true" />
              {allPhotos.length}
            </Badge>
          )}
        </div>

        {/* Price and photos info */}
        {!compact && (
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              {item.marketplaceListing.demandedPrice ? (
                <span className="font-medium text-green-600">
                  {formatCurrency(item.marketplaceListing.demandedPrice)}
                </span>
              ) : (
                <span className="text-red-600 text-xs">No price set</span>
              )}
              
              <div className="flex items-center gap-1 text-gray-500">
                <ImageIcon className="h-3 w-3" />
                <span className="text-xs">
                  {item.photos.before.length + item.photos.after.length}
                </span>
              </div>
            </div>
            
            {item.marketplaceListing.sold && item.marketplaceListing.salePrice && (
              <span className="text-xs text-gray-600">
                Sold: {formatCurrency(item.marketplaceListing.salePrice)}
              </span>
            )}
          </div>
        )}

        {/* Photo thumbnails */}
        {hasPhotos && !compact && (
          <div className="space-y-2" role="region" aria-label={`Photos for ${item.name}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300" id={`${item.id}-photos-label`}>
                Photos
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => openModal(allPhotos)}
                className="text-xs h-6 px-2 button-press hover-lift transition-all duration-200"
                aria-label={`View all ${allPhotos.length} photos for ${item.name}`}
              >
                <Eye className="h-3 w-3 mr-1 transition-transform duration-200 hover:scale-110" aria-hidden="true" />
                View All
              </Button>
            </div>
            <div 
              className="flex gap-2 overflow-x-auto pb-1" 
              role="group" 
              aria-labelledby={`${item.id}-photos-label`}
            >
              {allPhotos.slice(0, 4).map((photo, index) => (
                <div
                  key={index}
                  className="relative flex-shrink-0 w-12 h-12 rounded-md overflow-hidden bg-gray-100 dark:bg-gray-800 cursor-pointer hover-scale transition-all duration-200 animate-fade-in-up focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  style={{ animationDelay: `${index * 50}ms` }}
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
                  {index === 3 && allPhotos.length > 4 && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                      <span className="text-white text-xs font-medium" aria-label={`${allPhotos.length - 4} more photos`}>
                        +{allPhotos.length - 4}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Validation errors */}
        {hasValidationErrors && !compact && (
          <div 
            className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded animate-slide-in-up border-l-2 border-red-500"
            role="alert"
            aria-label="Validation errors"
            id={`${item.id}-validation-errors`}
          >
            {formatValidationErrors(item.validationStatus)}
          </div>
        )}

        {/* Quick actions */}
        <div 
          className="flex items-center gap-2 pt-2 border-t" 
          role="group" 
          aria-label={`Quick actions for ${item.name}`}
        >
          {quickActions
            .filter(action => availableActions.includes(action.action))
            .map(action => {
              const Icon = action.icon
              const isActionPending = pendingActions[action.action] || false
              const isDisabled = loading || 
                isActionPending || 
                (action.action === 'list' && !item.validationStatus.canList)
              
              const getTooltipContent = () => {
                if (isActionPending) return 'Action in progress...'
                if (loading) return 'Please wait...'
                if (action.action === 'list' && !item.validationStatus.canList) {
                  return 'Cannot list: ' + formatValidationErrors(item.validationStatus)
                }
                return null
              }

              const tooltipContent = getTooltipContent()
              
              const button = (
                <Button
                  key={action.action}
                  size="sm"
                  variant={action.variant || 'outline'}
                  onClick={() => handleQuickAction(action.action)}
                  disabled={isDisabled}
                  className={`
                    flex-1 text-xs button-press transition-all duration-200
                    ${isActionPending ? 'animate-pulse' : 'hover-lift'}
                    ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                  aria-label={generateAriaLabel(action.label, item.name, 'button', `Click to ${action.label.toLowerCase()}`)}
                  aria-describedby={hasValidationErrors ? `${item.id}-validation-errors` : undefined}
                >
                  <Icon 
                    className={`h-3 w-3 mr-1 transition-transform duration-200 ${isActionPending ? 'animate-spin' : 'hover:scale-110'}`} 
                    aria-hidden="true"
                  />
                  {isActionPending ? 'Processing...' : action.label}
                </Button>
              )

              if (tooltipContent && isDisabled) {
                return (
                  <Tooltip key={action.action}>
                    <TooltipTrigger asChild>
                      {button}
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">{tooltipContent}</p>
                    </TooltipContent>
                  </Tooltip>
                )
              }

              return button
            })}
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

        {/* Confirmation Dialog */}
        <ConfirmationDialog
          open={confirmationDialog.open}
          onOpenChange={(open) => setConfirmationDialog({ open, action: null })}
          action={confirmationDialog.action}
          itemName={item.name}
          onConfirm={handleConfirmAction}
          loading={loading}
        />
      </CardContent>
    </Card>
  )
}