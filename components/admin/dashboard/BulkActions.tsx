"use client"

import React, { useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
    ShoppingCart,
    X,
    DollarSign,
    Printer,
    Trash2,
    MoreHorizontal
} from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { EnhancedScrapItem, QuickAction } from '@/types/dashboard'

interface BulkActionsProps {
    selectedItems: string[]
    allItems: EnhancedScrapItem[]
    onSelectAll: (selected: boolean) => void
    onSelectItem: (itemId: string, selected: boolean) => void
    onBulkAction: (action: QuickAction, itemIds: string[]) => void
    loading?: boolean
}

export default function BulkActions({
    selectedItems,
    allItems,
    onSelectAll,
    onSelectItem,
    onBulkAction,
    loading = false
}: BulkActionsProps) {
    const checkboxRef = useRef<HTMLButtonElement>(null)
    const selectedItemsData = allItems.filter(item => selectedItems.includes(item.id))
    const allSelected = allItems.length > 0 && selectedItems.length === allItems.length
    const someSelected = selectedItems.length > 0 && selectedItems.length < allItems.length

    // Handle indeterminate state
    useEffect(() => {
        if (checkboxRef.current) {
            const input = checkboxRef.current.querySelector('input[type="checkbox"]') as HTMLInputElement
            if (input) {
                input.indeterminate = someSelected && !allSelected
            }
        }
    }, [someSelected, allSelected])

    const canListCount = selectedItemsData.filter(item =>
        item.validationStatus.canList && !item.marketplaceListing.listed && !item.marketplaceListing.sold
    ).length

    const canUnlistCount = selectedItemsData.filter(item =>
        item.marketplaceListing.listed && !item.marketplaceListing.sold
    ).length

    const canMarkSoldCount = selectedItemsData.filter(item =>
        item.marketplaceListing.listed && !item.marketplaceListing.sold
    ).length

    if (allItems.length === 0) return null

    return (
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border">
            <div className="flex items-center gap-3">
                <Checkbox
                    ref={checkboxRef}
                    checked={allSelected}
                    onCheckedChange={(checked) => onSelectAll(!!checked)}
                    className="h-4 w-4"
                />

                <span className="text-sm font-medium">
                    {selectedItems.length === 0
                        ? `Select items (${allItems.length} total)`
                        : `${selectedItems.length} selected`
                    }
                </span>
            </div>

            {selectedItems.length > 0 && (
                <div className="flex items-center gap-2">
                    {/* Quick actions */}
                    {canListCount > 0 && (
                        <Button
                            size="sm"
                            onClick={() => onBulkAction('list', selectedItems)}
                            disabled={loading}
                            className="flex items-center gap-1"
                        >
                            <ShoppingCart className="h-4 w-4" />
                            List ({canListCount})
                        </Button>
                    )}

                    {canUnlistCount > 0 && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onBulkAction('unlist', selectedItems)}
                            disabled={loading}
                            className="flex items-center gap-1"
                        >
                            <X className="h-4 w-4" />
                            Unlist ({canUnlistCount})
                        </Button>
                    )}

                    {canMarkSoldCount > 0 && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onBulkAction('sold', selectedItems)}
                            disabled={loading}
                            className="flex items-center gap-1"
                        >
                            <DollarSign className="h-4 w-4" />
                            Mark Sold ({canMarkSoldCount})
                        </Button>
                    )}

                    {/* More actions dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="outline">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem
                                onClick={() => onBulkAction('print', selectedItems)}
                                disabled={loading}
                            >
                                <Printer className="h-4 w-4 mr-2" />
                                Print Barcodes ({selectedItems.length})
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                                onClick={() => {
                                    // Handle bulk delete - would need confirmation dialog
                                    console.log('Bulk delete:', selectedItems)
                                }}
                                disabled={loading}
                                className="text-red-600"
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Selected
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            )}
        </div>
    )
}