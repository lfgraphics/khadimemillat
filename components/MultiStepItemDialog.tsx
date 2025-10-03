"use client"

import React, { useState, useCallback, useMemo } from 'react'
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ComboboxOption } from '@/components/searchable-dropdown-select'
import SearchableDropDownSelect from '@/components/searchable-dropdown-select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import EnhancedFileSelector from '@/components/file-selector'
import { UploadResult } from '@/components/file-selector/types'
import { toast } from 'sonner'
import { calculateValidationStatus, canListItem, formatValidationErrors } from '@/lib/utils/validation'

// Types and interfaces
interface LocalItem {
    tempId: string
    serverId?: string
    name: string
    description: string
    donorId: string
    donorName: string
    condition: Condition
    photos: {
        before: string[]
        after: string[]
    }
    marketplace: {
        listed: boolean
        demandedPrice?: number
        description?: string
    }
}

interface Donor {
    id: string
    mongoUserId?: string
    name: string
    email?: string
    phone?: string
    clerkUserId?: string
}

const CONDITIONS = ["new", "good", "repairable", "scrap", "not applicable"] as const
type Condition = typeof CONDITIONS[number]
type UserRole = 'scrapper' | 'moderator' | 'admin' | 'user'

interface MultiStepItemDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onItemAdd: (item: LocalItem) => void
    onItemUpdate?: (item: LocalItem) => void
    donor: Donor | null
    currentRole: UserRole
    presetItems: ComboboxOption[]
    editingItem?: LocalItem | null
    mode?: 'add' | 'edit'
}

interface MultiStepState {
    currentStep: number
    totalSteps: number
    formData: {
        item: {
            name: string
            condition: Condition
            description: string
        }
        photos: {
            before: string[]
            after: string[]
        }
        marketplace: {
            listed: boolean
            demandedPrice?: number
            description: string
        }
    }
    validation: {
        [stepIndex: number]: {
            isValid: boolean
            errors: string[]
        }
    }
    canNavigate: {
        next: boolean
        previous: boolean
    }
}

interface StepConfig {
    id: string
    title: string
    description: string
    requiredRoles: UserRole[]
}

// Step configurations with role-based filtering
const STEP_CONFIGS: StepConfig[] = [
    {
        id: 'item-selection',
        title: 'Select Item & Condition',
        description: 'Choose the item type and specify its condition',
        requiredRoles: ['scrapper', 'moderator', 'admin']
    },
    {
        id: 'photo-upload',
        title: 'Upload Photos',
        description: 'Add photos to document the item condition',
        requiredRoles: ['scrapper', 'moderator', 'admin']
    },
    {
        id: 'marketplace-listing',
        title: 'Marketplace Listing',
        description: 'Set pricing and listing details for the marketplace',
        requiredRoles: ['moderator', 'admin']
    },
    {
        id: 'preview',
        title: 'Review & Confirm',
        description: 'Review all details before adding the item',
        requiredRoles: ['scrapper', 'moderator', 'admin']
    }
]

// Validation summary component
interface ValidationSummaryProps {
    validation: MultiStepState['validation']
    currentStep: number
    totalSteps: number
    className?: string
}

const ValidationSummary: React.FC<ValidationSummaryProps> = ({
    validation,
    currentStep,
    totalSteps,
    className
}) => {
    const completedSteps = Object.entries(validation).filter(([_, v]) => v.isValid).length
    const totalErrors = Object.values(validation).reduce((sum, v) => sum + v.errors.length, 0)

    if (totalErrors === 0 && completedSteps === 0) return null

    return (
        <div className={cn("text-xs text-muted-foreground text-center", className)}>
            {completedSteps > 0 && (
                <span className="text-green-600">
                    {completedSteps} of {totalSteps} steps completed
                </span>
            )}
            {totalErrors > 0 && completedSteps > 0 && <span className="mx-2">•</span>}
            {totalErrors > 0 && (
                <span className="text-destructive">
                    {totalErrors} validation {totalErrors === 1 ? 'error' : 'errors'}
                </span>
            )}
        </div>
    )
}

// Item Selection Step Component
interface ItemSelectionStepProps {
    formData: MultiStepState['formData']['item']
    onUpdate: (data: Partial<MultiStepState['formData']['item']>) => void
    presetItems: ComboboxOption[]
    validation: { isValid: boolean; errors: string[] }
}

const ItemSelectionStep: React.FC<ItemSelectionStepProps> = ({
    formData,
    onUpdate,
    presetItems,
    validation
}) => {
    const [searchTerm, setSearchTerm] = useState('')

    // Handle item name change
    const handleItemNameChange = useCallback((value: string) => {
        onUpdate({ name: value })
    }, [onUpdate])

    // Handle condition change
    const handleConditionChange = useCallback((value: string) => {
        onUpdate({ condition: value as Condition })
    }, [onUpdate])

    // Handle description change
    const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value
        onUpdate({ description: value })
    }, [onUpdate])

    // Handle creating new item option
    const handleCreateOption = useCallback((label: string) => {
        onUpdate({ name: label })
        setSearchTerm('')
    }, [onUpdate])

    return (
        <div className="space-y-6">
            {/* Item Selection */}
            <div className="space-y-2">
                <Label htmlFor="item-name" className="text-sm font-medium">
                    Item Name <span className="text-destructive">*</span>
                </Label>
                <SearchableDropDownSelect
                    options={presetItems}
                    value={formData.name}
                    onChange={handleItemNameChange}
                    placeholder="Select or type item name..."
                    searchTerm={searchTerm}
                    onSearchTermChange={setSearchTerm}
                    onCreateOption={handleCreateOption}
                    className="w-full"
                    width="w-full"
                />

                <p className="text-xs text-muted-foreground">
                    Select from the list or type to create a new item
                </p>
            </div>

            {/* Condition Selection */}
            <div className="space-y-2">
                <Label htmlFor="item-condition" className="text-sm font-medium">
                    Condition <span className="text-destructive">*</span>
                </Label>
                <Select value={formData.condition} onValueChange={handleConditionChange}>
                    <SelectTrigger className="w-full min-h-[44px]">
                        <SelectValue placeholder="Select item condition" />
                    </SelectTrigger>
                    <SelectContent>
                        {CONDITIONS.map((condition) => (
                            <SelectItem key={condition} value={condition}>
                                {condition.charAt(0).toUpperCase() + condition.slice(1)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <p className="text-xs text-muted-foreground">
                    Specify the current condition of the item
                </p>
            </div>

            {/* Optional Description */}
            <div className="space-y-2">
                <Label htmlFor="item-description" className="text-sm font-medium">
                    Description <span className="text-muted-foreground">(Optional)</span>
                </Label>
                <Textarea
                    id="item-description"
                    placeholder="Add any additional details about the item..."
                    value={formData.description}
                    onChange={handleDescriptionChange}
                    className="min-h-[100px] resize-none"
                    maxLength={500}
                />

                <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Provide additional context or special notes</span>
                    <span>{formData.description.length}/500</span>
                </div>
            </div>

            {/* Validation Summary */}
            {validation.errors.length > 0 && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-destructive mb-2">
                        Please fix the following issues:
                    </h4>
                    <ul className="text-sm text-destructive space-y-1">
                        {validation.errors.map((error, index) => (
                            <li key={index} className="flex items-start gap-2">
                                <span className="text-destructive mt-0.5">•</span>
                                <span>{error}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    )
}

// Marketplace Listing Step Component
interface MarketplaceListingStepProps {
    formData: MultiStepState['formData']['marketplace']
    onUpdate: (data: Partial<MultiStepState['formData']['marketplace']>) => void
    validation: { isValid: boolean; errors: string[] }
    itemCondition?: Condition
}

const MarketplaceListingStep: React.FC<MarketplaceListingStepProps> = ({
    formData,
    onUpdate,
    validation,
    itemCondition = 'good'
}) => {
    // Handle listing toggle change
    const handleListingToggle = useCallback((checked: boolean) => {
        onUpdate({ listed: checked })
    }, [onUpdate])

    // Handle price change
    const handlePriceChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseFloat(e.target.value) || undefined
        onUpdate({ demandedPrice: value })
    }, [onUpdate])

    // Handle description change
    const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value
        onUpdate({ description: value })
    }, [onUpdate])

    return (
        <div className="space-y-6">
            {/* Role-based instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center mt-0.5">
                        <div className="w-2 h-2 bg-blue-600 rounded-full" />
                    </div>
                    <div className="flex-1">
                        <h4 className="text-sm font-medium text-blue-900 mb-1">
                            Marketplace Listing Options
                        </h4>
                        <p className="text-sm text-blue-800">
                            Choose whether to list this item in the marketplace for sale. Proceeds support welfare programs.
                        </p>
                    </div>
                </div>
            </div>

            {/* Condition-based validation guidance */}
            {(itemCondition === 'scrap' || itemCondition === 'not applicable') && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-yellow-100 flex items-center justify-center mt-0.5">
                            <div className="w-2 h-2 bg-yellow-600 rounded-full" />
                        </div>
                        <div className="flex-1">
                            <h4 className="text-sm font-medium text-yellow-900 mb-1">
                                Listing Restriction
                            </h4>
                            <p className="text-sm text-yellow-800">
                                Items with condition "{itemCondition}" cannot be listed on the marketplace. 
                                You can still add this item to the collection for record keeping.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Listing Toggle */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <Label htmlFor="marketplace-listing" className="text-sm font-medium">
                            List this item in the marketplace
                        </Label>
                        <p className="text-xs text-muted-foreground">
                            Enable this option to make the item available for purchase in the marketplace
                        </p>
                    </div>
                    <Switch
                        id="marketplace-listing"
                        checked={formData.listed}
                        onCheckedChange={handleListingToggle}
                        disabled={itemCondition === 'scrap' || itemCondition === 'not applicable'}
                    />
                </div>
            </div>

            {/* Conditional Fields - Only show when listing is enabled */}
            {formData.listed && (
                <div className="space-y-6 pl-4 border-l-2 border-primary/20">
                    {/* Price Input */}
                    <div className="space-y-2">
                        <Label htmlFor="marketplace-price" className="text-sm font-medium">
                            Price (₹) <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="marketplace-price"
                            type="number"
                            placeholder="Enter price in rupees"
                            value={formData.demandedPrice || ''}
                            onChange={handlePriceChange}
                            min="1"
                            max="1000000"
                            step="1"
                            className="min-h-[44px]"
                        />

                        <p className="text-xs text-muted-foreground">
                            Set a fair price for the item (₹1 - ₹10,00,000)
                        </p>
                    </div>

                    {/* Marketplace Description */}
                    <div className="space-y-2">
                        <Label htmlFor="marketplace-description" className="text-sm font-medium">
                            Marketplace Description <span className="text-destructive">*</span>
                        </Label>
                        <Textarea
                            id="marketplace-description"
                            placeholder="Describe the item for potential buyers..."
                            value={formData.description}
                            onChange={handleDescriptionChange}
                            className="min-h-[120px] resize-none"
                            maxLength={1000}
                        />

                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Provide details that will help buyers understand the item's value</span>
                            <span>{formData.description.length}/1000</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Validation Summary */}
            {validation.errors.length > 0 && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-destructive mb-2">
                        Please fix the following issues:
                    </h4>
                    <ul className="text-sm text-destructive space-y-1">
                        {validation.errors.map((error, index) => (
                            <li key={index} className="flex items-start gap-2">
                                <span className="text-destructive mt-0.5">•</span>
                                <span>{error}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    )
}

// Preview Step Component
interface PreviewStepProps {
    formData: MultiStepState['formData']
    donor: Donor | null
    onConfirm: () => void
}

const PreviewStep: React.FC<PreviewStepProps> = ({
    formData,
    donor,
    onConfirm
}) => {
    return (
        <div className="space-y-6">
            {/* Preview Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center mt-0.5">
                        <div className="w-2 h-2 bg-blue-600 rounded-full" />
                    </div>
                    <div className="flex-1">
                        <h4 className="text-sm font-medium text-blue-900 mb-1">
                            Review Item Details
                        </h4>
                        <p className="text-sm text-blue-800">
                            Please review all the information below before adding the item to your collection.
                        </p>
                    </div>
                </div>
            </div>

            {/* Item Preview Card */}
            <div className="border rounded-lg bg-card min-w-0 flex flex-col shadow-sm overflow-hidden">
                {/* Header Section */}
                <div className="p-4 pb-3 space-y-3">
                    <div className="flex justify-between items-start gap-3">
                        <div className="min-w-0 flex-1 space-y-2">
                            <h3 className="font-semibold text-base truncate leading-tight" title={formData.item.name}>
                                {formData.item.name}
                            </h3>
                            <p className="text-xs text-muted-foreground truncate" title={`Donor: ${donor?.name || 'Unknown'}`}>
                                <span className="font-medium">Donor:</span> {donor?.name || 'Unknown'}
                            </p>
                        </div>
                    </div>

                    {/* Status Indicators */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                            variant="outline"
                            className={`text-[10px] uppercase tracking-wide px-2.5 py-1 h-auto font-medium flex-shrink-0 border-2 ${formData.item.condition === 'new' ? 'border-green-400 text-green-700 bg-green-50/80' :
                                    formData.item.condition === 'good' ? 'border-blue-400 text-blue-700 bg-blue-50/80' :
                                        formData.item.condition === 'repairable' ? 'border-yellow-400 text-yellow-700 bg-yellow-50/80' :
                                            formData.item.condition === 'scrap' ? 'border-red-400 text-red-700 bg-red-50/80' :
                                                'border-gray-400 text-gray-700 bg-gray-50/80'
                                }`}
                        >
                            <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${formData.item.condition === 'new' ? 'bg-green-500' :
                                    formData.item.condition === 'good' ? 'bg-blue-500' :
                                        formData.item.condition === 'repairable' ? 'bg-yellow-500' :
                                            formData.item.condition === 'scrap' ? 'bg-red-500' :
                                                'bg-gray-500'
                                }`}></div>
                            {formData.item.condition}
                        </Badge>

                        {formData.marketplace.listed && (
                            <Badge
                                variant="default"
                                className="text-[10px] bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-800 border-2 border-emerald-300 px-2.5 py-1 h-auto font-semibold shadow-sm flex-shrink-0"
                            >
                                <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                </svg>
                                <span className="font-bold">₹{formData.marketplace.demandedPrice || 'TBD'}</span>
                            </Badge>
                        )}
                    </div>
                </div>

                {/* Photo Grid */}
                <div className="px-4 pb-3 flex-1 min-h-0">
                    <div className="grid grid-cols-3 gap-2.5 h-full">
                        {/* Before images */}
                        {formData.photos.before.slice(0, 2).map((photoUrl, i) => (
                            <div key={`before-${i}`} className="aspect-square min-w-0 relative group">
                                <img
                                    src={photoUrl}
                                    alt={`Before photo ${i + 1}`}
                                    className="w-full h-full object-cover rounded-lg border-2 border-border/40 hover:border-primary/50 transition-all duration-200 shadow-sm hover:shadow-md"
                                />
                                <div className="absolute top-1 left-1 bg-blue-500/90 text-white text-[8px] px-1.5 py-0.5 rounded font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                    BEFORE
                                </div>
                            </div>
                        ))}

                        {/* After images */}
                        {formData.photos.after.slice(0, 1).map((photoUrl, i) => (
                            <div key={`after-${i}`} className="aspect-square min-w-0 relative group">
                                <img
                                    src={photoUrl}
                                    alt={`After photo ${i + 1}`}
                                    className="w-full h-full object-cover rounded-lg border-2 border-border/40 hover:border-primary/50 transition-all duration-200 shadow-sm hover:shadow-md"
                                />
                                <div className="absolute top-1 left-1 bg-green-500/90 text-white text-[8px] px-1.5 py-0.5 rounded font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                    AFTER
                                </div>
                            </div>
                        ))}

                        {/* Additional images indicator */}
                        {(formData.photos.before.length + formData.photos.after.length) > 3 && (
                            <div className="aspect-square bg-gradient-to-br from-muted/40 to-muted/60 rounded-lg border-2 border-dashed border-muted-foreground/40 flex flex-col items-center justify-center min-w-0 hover:from-muted/60 hover:to-muted/80 transition-all duration-200">
                                <span className="text-sm font-bold text-muted-foreground">
                                    +{(formData.photos.before.length + formData.photos.after.length) - 3}
                                </span>
                                <span className="text-[8px] text-muted-foreground/80 font-medium">
                                    MORE
                                </span>
                            </div>
                        )}

                        {/* Fill empty slots with placeholder if less than 3 images */}
                        {Array.from({ length: Math.max(0, 3 - (formData.photos.before.length + formData.photos.after.length)) }).map((_, i) => (
                            <div key={`empty-${i}`} className="aspect-square bg-muted/20 rounded-lg border-2 border-dashed border-muted-foreground/20 flex items-center justify-center min-w-0">
                                <svg className="w-6 h-6 text-muted-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Item Details Section */}
                {(formData.item.description || formData.marketplace.description) && (
                    <div className="border-t border-border/50 bg-gradient-to-b from-muted/10 to-muted/20 px-4 py-3">
                        <div className="space-y-3">
                            {formData.item.description && (
                                <div>
                                    <h4 className="text-xs font-medium text-muted-foreground mb-1">Item Description</h4>
                                    <p className="text-sm text-foreground leading-relaxed">{formData.item.description}</p>
                                </div>
                            )}

                            {formData.marketplace.listed && formData.marketplace.description && (
                                <div>
                                    <h4 className="text-xs font-medium text-muted-foreground mb-1">Marketplace Description</h4>
                                    <p className="text-sm text-foreground leading-relaxed">{formData.marketplace.description}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Barcode Placeholder Section */}
                <div className="border-t border-border/50 bg-gradient-to-b from-muted/20 to-muted/40 px-4 py-3 mt-auto">
                    <div className="flex flex-col items-center gap-2.5">
                        <div className="w-full bg-white rounded-lg px-3 py-2 shadow-sm border border-border/30 flex justify-center items-center min-h-[40px]">
                            <div className="text-xs text-muted-foreground font-mono">
                                Barcode will be generated after adding
                            </div>
                        </div>
                        <p className="text-[10px] text-muted-foreground text-center">
                            A unique barcode will be created when the item is added
                        </p>
                    </div>
                </div>
            </div>

            {/* Summary Information */}
            <div className="bg-muted/30 rounded-lg p-4">
                <h4 className="text-sm font-medium mb-3">Summary</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Item:</span>
                            <span className="font-medium">{formData.item.name}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Condition:</span>
                            <span className="font-medium capitalize">{formData.item.condition}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Photos:</span>
                            <span className="font-medium">
                                {formData.photos.before.length + formData.photos.after.length} total
                                {formData.photos.before.length > 0 && ` (${formData.photos.before.length} before`}
                                {formData.photos.after.length > 0 && `, ${formData.photos.after.length} after)`}
                                {formData.photos.before.length > 0 && formData.photos.after.length === 0 && ')'}
                            </span>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Marketplace:</span>
                            <span className="font-medium">
                                {formData.marketplace.listed ? 'Listed' : 'Not listed'}
                            </span>
                        </div>
                        {formData.marketplace.listed && (
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Price:</span>
                                <span className="font-medium">₹{formData.marketplace.demandedPrice}</span>
                            </div>
                        )}
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Donor:</span>
                            <span className="font-medium">{donor?.name || 'Unknown'}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

// Photo Upload Step Component
interface PhotoUploadStepProps {
    formData: MultiStepState['formData']['photos']
    onUpdate: (data: Partial<MultiStepState['formData']['photos']>) => void
    userRole: UserRole
    validation: { isValid: boolean; errors: string[] }
}

const PhotoUploadStep: React.FC<PhotoUploadStepProps> = ({
    formData,
    onUpdate,
    userRole,
    validation
}) => {
    // Determine which photo types are visible based on role
    const isScrapper = userRole === 'scrapper'
    const isModeratorOrAdmin = userRole === 'moderator' || userRole === 'admin'

    // Handle before photo upload
    const handleBeforePhotoUpload = useCallback((uploadResult: UploadResult) => {
        const newBeforePhotos = [...formData.before, uploadResult.secureUrl]
        onUpdate({ before: newBeforePhotos })
    }, [formData.before, onUpdate])

    // Handle after photo upload
    const handleAfterPhotoUpload = useCallback((uploadResult: UploadResult) => {
        const newAfterPhotos = [...formData.after, uploadResult.secureUrl]
        onUpdate({ after: newAfterPhotos })
    }, [formData.after, onUpdate])

    // Handle photo removal with validation check
    const handlePhotoRemove = useCallback((photoUrl: string, photoType: 'before' | 'after') => {
        // Check if removing this photo would violate minimum requirements
        const wouldViolateMinimum =
            (photoType === 'before' && isScrapper && formData.before.length === 1) ||
            (photoType === 'after' && isModeratorOrAdmin && formData.after.length === 1)

        if (wouldViolateMinimum) {
            const roleText = isScrapper ? 'scrappers' : 'moderators and admins'
            const photoTypeText = photoType === 'before' ? 'before' : 'after'
            toast.error(`Cannot remove the last ${photoTypeText} photo. At least 1 ${photoTypeText} photo is required for ${roleText}.`)
            return
        }

        // Remove the photo
        if (photoType === 'before') {
            const newBeforePhotos = formData.before.filter(url => url !== photoUrl)
            onUpdate({ before: newBeforePhotos })
        } else {
            const newAfterPhotos = formData.after.filter(url => url !== photoUrl)
            onUpdate({ after: newAfterPhotos })
        }
    }, [formData, onUpdate, isScrapper, isModeratorOrAdmin])

    // Enhanced file selector error handling with role-specific messages
    const handleFileError = useCallback((error: any) => {
        console.error('Photo upload error:', error)

        let errorMessage = 'Failed to upload photo'

        // Handle different types of errors with role-specific context
        if (error.type === 'validation') {
            if (error.message.includes('file size')) {
                errorMessage = 'Photo file size exceeds 10MB limit. Please compress the image or choose a smaller file.'
            } else if (error.message.includes('file type')) {
                errorMessage = 'Invalid file type. Please upload JPEG, PNG, or WebP images only.'
            } else {
                errorMessage = error.message
            }
        } else if (error.type === 'upload') {
            errorMessage = 'Failed to upload photo to server. Please check your internet connection and try again.'
        } else if (error.type === 'network') {
            errorMessage = 'Network error occurred during upload. Please check your connection and retry.'
        } else if (error.type === 'camera') {
            errorMessage = 'Camera capture failed. Please ensure camera permissions are granted and try again.'
        } else {
            errorMessage = error.message || 'An unexpected error occurred during photo upload'
        }

        // Show error as toast
        toast.error(errorMessage)
    }, [isScrapper, isModeratorOrAdmin])

    return (
        <div className="space-y-6">
            {/* Role-based instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center mt-0.5">
                        <div className="w-2 h-2 bg-blue-600 rounded-full" />
                    </div>
                    <div className="flex-1">
                        <h4 className="text-sm font-medium text-blue-900 mb-1">
                            Photo Requirements for {userRole.charAt(0).toUpperCase() + userRole.slice(1)}s
                        </h4>
                        <p className="text-sm text-blue-800">
                            {isScrapper && 'Upload "before" photos to document the initial condition of collected items. At least 1 photo is required.'}
                            {isModeratorOrAdmin && 'Upload "before" and "after" photos to document both initial and processed conditions. At least 1 after photo is required.'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Before Photos Section - For All Roles */}
            {(isScrapper || isModeratorOrAdmin) && (
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">
                            Before Photos <span className="text-destructive">*</span>
                        </Label>
                        <p className="text-xs text-muted-foreground">
                            Document the initial condition of the item as received
                        </p>
                    </div>

                    <EnhancedFileSelector
                        onFileSelect={(file, previewUrl) => {
                            console.log('Before photo selected:', file.name)
                        }}
                        onUploadComplete={handleBeforePhotoUpload}
                        onError={handleFileError}
                        maxFileSize={10 * 1024 * 1024} // 10MB
                        acceptedTypes={['image/jpeg', 'image/png', 'image/webp']}
                        placeholder="Upload before photos - drag and drop or click to select"
                        className="w-full"
                        showPreview={true}
                        uploadToCloudinary={true}
                        cloudinaryOptions={{
                            folder: 'kmwf/items/before-photos',
                            tags: ['item-photo', 'before', userRole]
                        }}
                    />

                    {/* Before Photos Gallery */}
                    {formData.before.length > 0 && (
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">
                                Uploaded Before Photos ({formData.before.length})
                            </Label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                {formData.before.map((photoUrl, index) => (
                                    <div key={index} className="relative group">
                                        <img
                                            src={photoUrl}
                                            alt={`Before photo ${index + 1}`}
                                            className="w-full h-24 object-cover rounded-lg border border-border"
                                        />
                                        <button
                                            onClick={() => handlePhotoRemove(photoUrl, 'before')}
                                            className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/80"
                                            title={formData.before.length === 1 && isScrapper ? 'Cannot remove last before photo (required)' : 'Remove photo'}
                                            disabled={formData.before.length === 1 && isScrapper}
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* After Photos Section - Only for Moderators and Admins */}
            {isModeratorOrAdmin && (
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">
                            After Photos <span className="text-destructive">*</span>
                        </Label>
                        <p className="text-xs text-muted-foreground">
                            Document the processed condition of the item ready for marketplace
                        </p>
                    </div>

                    <EnhancedFileSelector
                        onFileSelect={(file, previewUrl) => {
                            console.log('After photo selected:', file.name)
                        }}
                        onUploadComplete={handleAfterPhotoUpload}
                        onError={handleFileError}
                        maxFileSize={10 * 1024 * 1024} // 10MB
                        acceptedTypes={['image/jpeg', 'image/png', 'image/webp']}
                        placeholder="Upload after photos - drag and drop or click to select"
                        className="w-full"
                        showPreview={true}
                        uploadToCloudinary={true}
                        cloudinaryOptions={{
                            folder: 'kmwf/items/after-photos',
                            tags: ['item-photo', 'after', userRole]
                        }}
                    />

                    {/* After Photos Gallery */}
                    {formData.after.length > 0 && (
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">
                                Uploaded After Photos ({formData.after.length})
                            </Label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                {formData.after.map((photoUrl, index) => (
                                    <div key={index} className="relative group">
                                        <img
                                            src={photoUrl}
                                            alt={`After photo ${index + 1}`}
                                            className="w-full h-24 object-cover rounded-lg border border-border"
                                        />
                                        <button
                                            onClick={() => handlePhotoRemove(photoUrl, 'after')}
                                            className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/80"
                                            title={formData.after.length === 1 && isModeratorOrAdmin ? 'Cannot remove last after photo (required)' : 'Remove photo'}
                                            disabled={formData.after.length === 1 && isModeratorOrAdmin}
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Upload Error Display */}




            {/* Validation Summary */}
            {validation.errors.length > 0 && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-destructive mb-2">
                        Please fix the following issues:
                    </h4>
                    <ul className="text-sm text-destructive space-y-1">
                        {validation.errors.map((error, index) => (
                            <li key={index} className="flex items-start gap-2">
                                <span className="text-destructive mt-0.5">•</span>
                                <span>{error}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Photo Upload Tips with Role-specific Guidance */}
            <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="text-sm font-medium mb-2">Photo Upload Tips:</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Use good lighting for clear, detailed photos</li>
                    <li>• Capture multiple angles to show item condition</li>
                    <li>• Maximum file size: 10MB per photo</li>
                    <li>• Supported formats: JPEG, PNG, WebP</li>
                    <li>• Maximum {isScrapper ? '10 before' : '10 before and 10 after'} photos allowed</li>
                    {isScrapper && (
                        <>
                            <li>• Focus on documenting the initial condition as received</li>
                            <li>• Include any damage, wear, or notable features</li>
                        </>
                    )}
                    {isModeratorOrAdmin && (
                        <>
                            <li>• Document the processed/cleaned condition</li>
                            <li>• Show the item ready for marketplace listing</li>
                            <li>• Highlight improvements made during processing</li>
                        </>
                    )}
                </ul>


            </div>
        </div>
    )
}

// Step indicator component
interface StepIndicatorProps {
    currentStep: number
    totalSteps: number
    steps: StepConfig[]
    validation: MultiStepState['validation']
    className?: string
}

const StepIndicator: React.FC<StepIndicatorProps> = ({
    currentStep,
    totalSteps,
    steps,
    validation,
    className
}) => {
    const progressPercentage = ((currentStep + 1) / totalSteps) * 100

    return (
        <div className={cn("space-y-4", className)}>
            {/* Progress bar */}
            <div className="space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Step {currentStep + 1} of {totalSteps}</span>
                    <span>{Math.round(progressPercentage)}%</span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
            </div>

            {/* Step indicators with validation status */}
            <div className="flex items-center justify-between">
                {steps.map((step, index) => {
                    const stepValidation = validation[index]
                    const isCompleted = stepValidation?.isValid
                    const hasErrors = stepValidation?.errors.length > 0

                    return (
                        <div key={step.id} className="flex flex-col items-center space-y-1">
                            <div
                                className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors relative",
                                    index < currentStep && isCompleted
                                        ? "bg-green-600 text-white"
                                        : index < currentStep && hasErrors
                                            ? "bg-destructive text-destructive-foreground"
                                            : index === currentStep && hasErrors
                                                ? "bg-destructive text-destructive-foreground ring-2 ring-destructive/20"
                                                : index === currentStep
                                                    ? "bg-primary text-primary-foreground ring-2 ring-primary/20"
                                                    : "bg-muted text-muted-foreground"
                                )}
                            >
                                {index < currentStep && isCompleted ? (
                                    <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-pulse" />
                                ) : index < currentStep && hasErrors ? (
                                    <X className="w-4 h-4" />
                                ) : (
                                    index + 1
                                )}
                            </div>
                            <span className={cn(
                                "text-xs text-center max-w-16 leading-tight",
                                index === currentStep ? "text-foreground font-medium" : "text-muted-foreground"
                            )}>
                                {step.title.split(' ')[0]}
                            </span>
                            {/* Error indicator */}
                            {hasErrors && (
                                <div className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
                            )}
                        </div>
                    )
                })}
            </div>

            {/* Validation summary */}
            <ValidationSummary
                validation={validation}
                currentStep={currentStep}
                totalSteps={totalSteps}
                className="pt-2"
            />
        </div>
    )
}

// Navigation controls component
interface NavigationControlsProps {
    currentStep: number
    totalSteps: number
    canGoNext: boolean
    canGoPrevious: boolean
    onNext: () => void
    onPrevious: () => void
    onCancel: () => void
    onAdd: () => void
    isLoading: boolean
    isPreviewStep: boolean
    validationErrors?: string[]
    mode?: 'add' | 'edit'
}

const NavigationControls: React.FC<NavigationControlsProps> = ({
    currentStep,
    totalSteps,
    canGoNext,
    canGoPrevious,
    onNext,
    onPrevious,
    onCancel,
    onAdd,
    isLoading,
    isPreviewStep,
    validationErrors = [],
    mode = 'add'
}) => {
    // Determine button text and state based on current step and validation
    const getNextButtonText = () => {
        if (isLoading) return 'Processing...'
        if (isPreviewStep) return mode === 'edit' ? 'Update Item' : 'Add Item'
        if (currentStep === totalSteps - 2) return 'Review'
        return 'Next'
    }

    const getNextButtonDisabledReason = () => {
        if (isLoading) return 'Processing request...'
        if (!canGoNext && validationErrors.length > 0) {
            return `Please fix: ${validationErrors.join(', ')}`
        }
        if (!canGoNext) return 'Please complete required fields'
        return null
    }

    const nextButtonDisabledReason = getNextButtonDisabledReason()

    return (
        <div className="flex items-center justify-between gap-3">
            {/* Left side - Back button */}
            <div className="flex items-center gap-2">
                {canGoPrevious && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onPrevious}
                        disabled={isLoading}
                        className="min-h-[44px] px-4 transition-all duration-200"
                        title={isLoading ? 'Cannot navigate while processing' : 'Go to previous step'}
                    >
                        {isLoading ? (
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
                        ) : (
                            <ChevronLeft className="w-4 h-4 mr-1" />
                        )}
                        Back
                    </Button>
                )}
            </div>

            {/* Right side - Cancel and Next/Add buttons */}
            <div className="flex items-center gap-2">
                <AlertDialogCancel asChild>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onCancel}
                        disabled={isLoading}
                        className="min-h-[44px] px-4 transition-all duration-200"
                        title={isLoading ? 'Cannot cancel while processing' : 'Cancel and close dialog'}
                    >
                        <X className="w-4 h-4 mr-1" />
                        Cancel
                    </Button>
                </AlertDialogCancel>

                {isPreviewStep ? (
                    <Button
                        onClick={onAdd}
                        disabled={isLoading || !canGoNext}
                        className="min-h-[44px] px-6 transition-all duration-200"
                        title={isLoading ? 'Adding item...' : canGoNext ? 'Add item to collection' : 'Please complete all required fields'}
                    >
                        {isLoading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                                Adding...
                            </>
                        ) : (
                            'Add Item'
                        )}
                    </Button>
                ) : (
                    <div className="relative">
                        <Button
                            onClick={onNext}
                            disabled={!canGoNext || isLoading}
                            className={cn(
                                "min-h-[44px] px-6 transition-all duration-200",
                                !canGoNext && !isLoading && "cursor-not-allowed"
                            )}
                            title={nextButtonDisabledReason || 'Continue to next step'}
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    {getNextButtonText()}
                                    <ChevronRight className="w-4 h-4 ml-1" />
                                </>
                            )}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    )
}

// Main MultiStepItemDialog component
export const MultiStepItemDialog: React.FC<MultiStepItemDialogProps> = ({
    open,
    onOpenChange,
    onItemAdd,
    onItemUpdate,
    donor,
    currentRole,
    presetItems,
    editingItem = null,
    mode = 'add'
}) => {
    // Filter steps based on user role
    const availableSteps = useMemo(() => {
        return STEP_CONFIGS.filter(step =>
            step.requiredRoles.includes(currentRole)
        )
    }, [currentRole])

    // Initialize form data
    const initializeFormData = useCallback(() => {
        if (mode === 'edit' && editingItem) {
            return {
                item: {
                    name: editingItem.name || '',
                    condition: editingItem.condition || 'good' as Condition,
                    description: editingItem.description || ''
                },
                photos: {
                    before: editingItem.photos?.before || [],
                    after: editingItem.photos?.after || []
                },
                marketplace: {
                    listed: editingItem.marketplace?.listed || false,
                    demandedPrice: editingItem.marketplace?.demandedPrice,
                    description: editingItem.marketplace?.description || ''
                }
            }
        }
        
        return {
            item: {
                name: '',
                condition: 'good' as Condition,
                description: ''
            },
            photos: {
                before: [],
                after: []
            },
            marketplace: {
                listed: false,
                demandedPrice: undefined,
                description: ''
            }
        }
    }, [mode, editingItem])

    // Initialize validation state
    const initializeValidation = useCallback(() => {
        const validation: { [stepIndex: number]: { isValid: boolean; errors: string[] } } = {}
        availableSteps.forEach((_, index) => {
            validation[index] = { isValid: false, errors: [] }
        })
        return validation
    }, [availableSteps])

    // Main state
    const [state, setState] = useState<MultiStepState>(() => ({
        currentStep: 0,
        totalSteps: availableSteps.length,
        formData: initializeFormData(),
        validation: initializeValidation(),
        canNavigate: {
            next: false,
            previous: false
        }
    }))

    const [isLoading, setIsLoading] = useState(false)

    // Reset state when dialog opens/closes
    React.useEffect(() => {
        if (open) {
            setState({
                currentStep: 0,
                totalSteps: availableSteps.length,
                formData: initializeFormData(),
                validation: initializeValidation(),
                canNavigate: {
                    next: false,
                    previous: false
                }
            })
        }
    }, [open, availableSteps.length, initializeFormData, initializeValidation])



    // Comprehensive step validation system
    const validateStep = useCallback((stepIndex: number, formData: MultiStepState['formData']) => {
        const step = availableSteps[stepIndex]
        if (!step) return { isValid: false, errors: ['Invalid step'] }

        switch (step.id) {
            case 'item-selection':
                const errors: string[] = []

                // Item name validation
                if (!formData.item.name.trim()) {
                    errors.push('Item name is required')
                } else if (formData.item.name.trim().length < 2) {
                    errors.push('Item name must be at least 2 characters long')
                }

                // Condition validation
                if (!formData.item.condition) {
                    errors.push('Item condition is required')
                }

                // Optional description validation (if provided)
                if (formData.item.description && formData.item.description.length > 500) {
                    errors.push('Description must be less than 500 characters')
                }

                return { isValid: errors.length === 0, errors }

            case 'photo-upload':
                const photoErrors: string[] = []
                const isScrapper = currentRole === 'scrapper'
                const isModeratorOrAdmin = currentRole === 'moderator' || currentRole === 'admin'

                // Role-based photo validation
                if (isScrapper) {
                    if (formData.photos.before.length === 0) {
                        photoErrors.push('At least 1 before photo is required for scrappers')
                    }
                    // Scrappers shouldn't have after photos
                    if (formData.photos.after.length > 0) {
                        photoErrors.push('Scrappers cannot upload after photos')
                    }
                }

                if (isModeratorOrAdmin) {
                    if (formData.photos.after.length === 0) {
                        photoErrors.push('At least 1 after photo is required for moderators and admins')
                    }
                    // Validate photo limits
                    if (formData.photos.before.length > 10) {
                        photoErrors.push('Maximum 10 before photos allowed')
                    }
                    if (formData.photos.after.length > 10) {
                        photoErrors.push('Maximum 10 after photos allowed')
                    }
                }

                return { isValid: photoErrors.length === 0, errors: photoErrors }

            case 'marketplace-listing':
                const marketplaceErrors: string[] = []

                // Check if item condition allows listing
                if (formData.marketplace.listed && (formData.item.condition === 'scrap' || formData.item.condition === 'not applicable')) {
                    marketplaceErrors.push(`Items with condition "${formData.item.condition}" cannot be listed on marketplace`)
                }

                if (formData.marketplace.listed) {
                    // Price validation when listing is enabled
                    if (!formData.marketplace.demandedPrice) {
                        marketplaceErrors.push('Price is required when marketplace listing is enabled')
                    } else if (formData.marketplace.demandedPrice <= 0) {
                        marketplaceErrors.push('Price must be greater than 0')
                    } else if (formData.marketplace.demandedPrice > 1000000) {
                        marketplaceErrors.push('Price must be less than ₹10,00,000')
                    }

                    // Description validation when listing is enabled
                    if (!formData.marketplace.description.trim()) {
                        marketplaceErrors.push('Marketplace description is required when listing is enabled')
                    } else if (formData.marketplace.description.trim().length < 10) {
                        marketplaceErrors.push('Marketplace description must be at least 10 characters long')
                    } else if (formData.marketplace.description.length > 1000) {
                        marketplaceErrors.push('Marketplace description must be less than 1000 characters')
                    }

                    // Additional validation using the validation utilities
                    const mockItem = {
                        id: 'temp',
                        name: formData.item.name,
                        description: formData.item.description,
                        condition: formData.item.condition,
                        photos: formData.photos,
                        marketplaceListing: {
                            listed: formData.marketplace.listed,
                            demandedPrice: formData.marketplace.demandedPrice,
                            description: formData.marketplace.description,
                            sold: false,
                            salePrice: undefined
                        },
                        validationStatus: { canList: true, errors: [], warnings: [] },
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    }

                    const validationResult = calculateValidationStatus(mockItem)
                    marketplaceErrors.push(...validationResult.errors)
                }

                return { isValid: marketplaceErrors.length === 0, errors: marketplaceErrors }

            case 'preview':
                // Final validation - ensure all previous steps are valid
                const previewErrors: string[] = []

                // Re-validate all previous steps
                for (let i = 0; i < stepIndex; i++) {
                    const stepValidation = validateStep(i, formData)
                    if (!stepValidation.isValid) {
                        previewErrors.push(...stepValidation.errors.map(error => `Step ${i + 1}: ${error}`))
                    }
                }

                // Additional final checks
                if (!formData.item.name.trim()) {
                    previewErrors.push('Item name is required')
                }

                if (!formData.item.condition) {
                    previewErrors.push('Item condition is required')
                }

                // Role-based photo validation
                const isScrapperRole = currentRole === 'scrapper'
                const isModeratorOrAdminRole = currentRole === 'moderator' || currentRole === 'admin'

                if (isScrapperRole && formData.photos.before.length === 0) {
                    previewErrors.push('At least 1 before photo is required')
                }

                if (isModeratorOrAdminRole && formData.photos.after.length === 0) {
                    previewErrors.push('At least 1 after photo is required')
                }

                // Marketplace validation if listing is enabled
                if (formData.marketplace.listed) {
                    if (!formData.marketplace.demandedPrice || formData.marketplace.demandedPrice <= 0) {
                        previewErrors.push('Valid price is required for marketplace listing')
                    }
                    if (!formData.marketplace.description.trim()) {
                        previewErrors.push('Marketplace description is required for listing')
                    }
                }

                return { isValid: previewErrors.length === 0, errors: previewErrors }

            default:
                return { isValid: false, errors: ['Unknown step type'] }
        }
    }, [availableSteps, currentRole, donor])

    // Real-time validation for form fields
    const validateField = useCallback((field: string, value: any, stepId: string) => {
        const errors: string[] = []

        switch (stepId) {
            case 'item-selection':
                if (field === 'name') {
                    if (!value || !value.trim()) {
                        errors.push('Item name is required')
                    } else if (value.trim().length < 2) {
                        errors.push('Item name must be at least 2 characters long')
                    }
                } else if (field === 'condition') {
                    if (!value) {
                        errors.push('Item condition is required')
                    }
                } else if (field === 'description' && value && value.length > 500) {
                    errors.push('Description must be less than 500 characters')
                }
                break

            case 'marketplace-listing':
                if (field === 'demandedPrice' && value) {
                    if (value <= 0) {
                        errors.push('Price must be greater than 0')
                    } else if (value > 1000000) {
                        errors.push('Price must be less than ₹10,00,000')
                    }
                } else if (field === 'description' && value) {
                    if (value.trim().length < 10) {
                        errors.push('Description must be at least 10 characters long')
                    } else if (value.length > 1000) {
                        errors.push('Description must be less than 1000 characters')
                    }
                }
                break
        }

        return errors
    }, [])

    // Update form data with real-time validation
    const updateFormData = useCallback((updates: Partial<MultiStepState['formData']>) => {
        setState(prev => {
            const newFormData = { ...prev.formData, ...updates }
            const validation = { ...prev.validation }

            // Revalidate current step
            const currentValidation = validateStep(prev.currentStep, newFormData)
            validation[prev.currentStep] = currentValidation

            // Update navigation state based on validation
            const canNavigate = {
                next: currentValidation.isValid,
                previous: prev.currentStep > 0
            }

            return {
                ...prev,
                formData: newFormData,
                validation,
                canNavigate
            }
        })
    }, [validateStep])

    // Debounced validation for real-time feedback
    const [validationTimeout, setValidationTimeout] = useState<NodeJS.Timeout | null>(null)

    const debouncedValidation = useCallback((stepIndex: number, formData: MultiStepState['formData']) => {
        if (validationTimeout) {
            clearTimeout(validationTimeout)
        }

        const timeout = setTimeout(() => {
            setState(prev => {
                const validation = { ...prev.validation }
                const stepValidation = validateStep(stepIndex, formData)
                validation[stepIndex] = stepValidation

                return {
                    ...prev,
                    validation,
                    canNavigate: {
                        ...prev.canNavigate,
                        next: stepValidation.isValid
                    }
                }
            })
        }, 300) // 300ms debounce

        setValidationTimeout(timeout)
    }, [validateStep, validationTimeout])

    // Cleanup timeout on unmount
    React.useEffect(() => {
        return () => {
            if (validationTimeout) {
                clearTimeout(validationTimeout)
            }
        }
    }, [validationTimeout])

    // Navigation handlers with enhanced state management
    const handleNext = useCallback(() => {
        setState(prev => {
            // Validate current step before proceeding
            const currentValidation = validateStep(prev.currentStep, prev.formData)

            if (!currentValidation.isValid) {
                // Update validation state to show errors
                const newValidation = { ...prev.validation }
                newValidation[prev.currentStep] = currentValidation
                return { ...prev, validation: newValidation }
            }

            // Proceed to next step if validation passes
            if (prev.currentStep < prev.totalSteps - 1) {
                const nextStep = prev.currentStep + 1
                const nextValidation = validateStep(nextStep, prev.formData)
                const newValidation = { ...prev.validation }
                newValidation[nextStep] = nextValidation

                return {
                    ...prev,
                    currentStep: nextStep,
                    validation: newValidation,
                    canNavigate: {
                        next: nextValidation.isValid,
                        previous: true
                    }
                }
            }
            return prev
        })
    }, [validateStep])

    const handlePrevious = useCallback(() => {
        setState(prev => {
            if (prev.currentStep > 0) {
                const prevStep = prev.currentStep - 1
                const prevValidation = validateStep(prevStep, prev.formData)

                return {
                    ...prev,
                    currentStep: prevStep,
                    canNavigate: {
                        next: prevValidation.isValid,
                        previous: prevStep > 0
                    }
                }
            }
            return prev
        })
    }, [validateStep])

    const handleCancel = useCallback(() => {
        // Reset form state when canceling
        setState({
            currentStep: 0,
            totalSteps: availableSteps.length,
            formData: initializeFormData(),
            validation: initializeValidation(),
            canNavigate: {
                next: false,
                previous: false
            }
        })
        onOpenChange(false)
    }, [availableSteps.length, initializeFormData, initializeValidation, onOpenChange])

    const handleSubmit = useCallback(async () => {
        if (!donor) {
            toast.error('No donor selected')
            return
        }

        setIsLoading(true)
        try {
            const itemData: LocalItem = {
                tempId: mode === 'edit' && editingItem ? editingItem.tempId : crypto.randomUUID(),
                serverId: mode === 'edit' && editingItem ? editingItem.serverId : undefined,
                name: state.formData.item.name.trim(),
                description: state.formData.item.description.trim(),
                donorId: donor.mongoUserId || donor.id,
                donorName: donor.name,
                condition: state.formData.item.condition,
                photos: state.formData.photos,
                marketplace: {
                    listed: state.formData.marketplace.listed,
                    demandedPrice: state.formData.marketplace.demandedPrice,
                    description: state.formData.marketplace.description.trim()
                }
            }

            if (mode === 'edit' && onItemUpdate) {
                onItemUpdate(itemData)
                toast.success(`Updated "${itemData.name}"`)
            } else {
                onItemAdd(itemData)
                toast.success(`Added "${itemData.name}" to the collection`)
            }
            
            onOpenChange(false)
        } catch (error) {
            console.error(`Error ${mode === 'edit' ? 'updating' : 'adding'} item:`, error)
            toast.error(`Failed to ${mode === 'edit' ? 'update' : 'add'} item. Please try again.`)
        } finally {
            setIsLoading(false)
        }
    }, [donor, state.formData, onItemAdd, onItemUpdate, onOpenChange, mode, editingItem])





    const currentStepConfig = availableSteps[state.currentStep]
    const isPreviewStep = currentStepConfig?.id === 'preview'

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <AlertDialogHeader className="space-y-4">
                    <AlertDialogTitle className="text-xl font-semibold">
                        {mode === 'edit' ? 'Edit Item' : 'Add New Item'}
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-sm text-muted-foreground">
                        {mode === 'edit' 
                            ? 'Update the item details below and save your changes.'
                            : 'Follow the steps below to add a new item to the donation collection.'
                        }
                    </AlertDialogDescription>

                    {/* Step Indicator */}
                    <StepIndicator
                        currentStep={state.currentStep}
                        totalSteps={state.totalSteps}
                        steps={availableSteps}
                        validation={state.validation}
                        className="pt-2"
                    />
                </AlertDialogHeader>

                {/* Step Content */}
                <div className="py-6 min-h-[300px]">
                    {currentStepConfig && (
                        <div className="space-y-4">
                            <div className="text-center space-y-2">
                                <h3 className="text-lg font-medium">{currentStepConfig.title}</h3>
                                <p className="text-sm text-muted-foreground">
                                    {currentStepConfig.id === 'preview' && mode === 'edit' 
                                        ? 'Review all details before updating the item'
                                        : currentStepConfig.description
                                    }
                                </p>
                            </div>

                            {/* Step content */}
                            <div className="space-y-4">
                                {currentStepConfig.id === 'item-selection' && (
                                    <ItemSelectionStep
                                        formData={state.formData.item}
                                        onUpdate={(updates) => updateFormData({ item: { ...state.formData.item, ...updates } })}
                                        presetItems={presetItems}
                                        validation={state.validation[state.currentStep] || { isValid: false, errors: [] }}

                                    />
                                )}

                                {currentStepConfig.id === 'photo-upload' && (
                                    <PhotoUploadStep
                                        formData={state.formData.photos}
                                        onUpdate={(updates) => updateFormData({ photos: { ...state.formData.photos, ...updates } })}
                                        userRole={currentRole}
                                        validation={state.validation[state.currentStep] || { isValid: false, errors: [] }}

                                    />
                                )}

                                {currentStepConfig.id === 'marketplace-listing' && (
                                    <MarketplaceListingStep
                                        formData={state.formData.marketplace}
                                        onUpdate={(updates) => updateFormData({ marketplace: { ...state.formData.marketplace, ...updates } })}
                                        validation={state.validation[state.currentStep] || { isValid: false, errors: [] }}
                                        itemCondition={state.formData.item.condition}
                                    />
                                )}

                                {currentStepConfig.id === 'preview' && (
                                    <PreviewStep
                                        formData={state.formData}
                                        donor={donor}
                                        onConfirm={handleSubmit}
                                    />
                                )}

                                {currentStepConfig.id !== 'item-selection' && currentStepConfig.id !== 'photo-upload' && currentStepConfig.id !== 'marketplace-listing' && currentStepConfig.id !== 'preview' && (
                                    <div className="bg-muted/20 rounded-lg p-6 text-center text-muted-foreground">
                                        <p>Step content for "{currentStepConfig.id}" will be implemented in subsequent tasks.</p>
                                    </div>
                                )}
                            </div>

                            {/* Validation Error Display */}
                            {state.validation[state.currentStep]?.errors.length > 0 && (
                                <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                                    <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-destructive/20 flex items-center justify-center mt-0.5">
                                            <X className="w-3 h-3 text-destructive" />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-sm font-medium text-destructive mb-2">
                                                Please fix the following issues:
                                            </h4>
                                            <ul className="text-sm text-destructive space-y-1">
                                                {state.validation[state.currentStep].errors.map((error, index) => (
                                                    <li key={index} className="flex items-start gap-2">
                                                        <span className="text-destructive/60 mt-1">•</span>
                                                        <span>{error}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Success indicator when step is valid */}
                            {state.validation[state.currentStep]?.isValid && state.validation[state.currentStep]?.errors.length === 0 && (
                                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                                    <div className="flex items-center gap-2 text-green-700">
                                        <div className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center">
                                            <div className="w-2 h-2 bg-green-600 rounded-full" />
                                        </div>
                                        <span className="text-sm font-medium">Step completed successfully</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <AlertDialogFooter>
                    <NavigationControls
                        currentStep={state.currentStep}
                        totalSteps={state.totalSteps}
                        canGoNext={state.canNavigate.next}
                        canGoPrevious={state.canNavigate.previous}
                        onNext={handleNext}
                        onPrevious={handlePrevious}
                        onCancel={handleCancel}
                        onAdd={handleSubmit}
                        isLoading={isLoading}
                        isPreviewStep={isPreviewStep}
                        validationErrors={state.validation[state.currentStep]?.errors || []}
                        mode={mode}
                    />
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}

export default MultiStepItemDialog