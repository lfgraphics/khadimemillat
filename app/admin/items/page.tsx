"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { useUser } from '@clerk/nextjs'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { safeJson } from '@/lib/utils'
import Link from 'next/link'
import { Eye, Search, Filter, Package, ShoppingCart, DollarSign, Calendar, User, Image as ImageIcon, Edit, Plus } from 'lucide-react'
import Image from 'next/image'
import { getCloudinaryUrl } from '@/lib/cloudinary-client'

interface ScrapItem {
    _id: string
    name: string
    condition: 'new' | 'good' | 'repairable' | 'scrap' | 'not applicable'
    quantity: number
    availableQuantity: number
    photos: { before: string[]; after: string[] }
    marketplaceListing: {
        listed: boolean
        demandedPrice?: number
        salePrice?: number
        sold: boolean
        soldToUserId?: string
        soldToName?: string
        soldVia?: 'online' | 'chat' | 'offline'
        soldAt?: string
        soldBy?: string
    }
    repairingCost?: number
    scrapEntry?: {
        _id: string
        collectionRequestId: string
        donor: string
        donorDetails?: {
            fullName?: string
            username?: string
        }
        createdAt: string
    }
    createdAt: string
    updatedAt: string
}

export default function ItemsPage() {
    const { user } = useUser()
    const [items, setItems] = useState<ScrapItem[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [conditionFilter, setConditionFilter] = useState<string>('all')
    const [listedFilter, setListedFilter] = useState<string>('all')
    const [soldFilter, setSoldFilter] = useState<string>('all')
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)

    const fetchItems = useCallback(async () => {
        try {
            setLoading(true)
            const params = new URLSearchParams({
                page: page.toString(),
                limit: '20'
            })

            if (conditionFilter !== 'all') params.append('condition', conditionFilter)
            if (listedFilter !== 'all') params.append('listed', listedFilter)
            if (soldFilter !== 'all') params.append('sold', soldFilter)
            if (searchTerm.trim()) params.append('search', searchTerm.trim())

            const res = await fetch(`/api/protected/scrap-items?${params}`)
            if (!res.ok) throw new Error('Failed to fetch items')

            const data = await safeJson<any>(res)
            setItems(data.items || [])
            setTotalPages(data.pagination?.pages || 1)
        } catch (error) {
            console.error('Error fetching items:', error)
            toast.error('Failed to load items')
        } finally {
            setLoading(false)
        }
    }, [page, conditionFilter, listedFilter, soldFilter, searchTerm])

    useEffect(() => {
        fetchItems()
    }, [fetchItems])

    // Auto-refresh every 30 seconds to show updated quantities
    useEffect(() => {
        const interval = setInterval(() => {
            fetchItems()
        }, 30000)
        return () => clearInterval(interval)
    }, [fetchItems])

    const handleSearch = () => {
        setPage(1)
        fetchItems()
    }

    const filteredItems = items.filter(item => {
        if (!searchTerm) return true
        const searchLower = searchTerm.toLowerCase()
        return (
            item.name.toLowerCase().includes(searchLower) ||
            item._id.toLowerCase().includes(searchLower) ||
            item.scrapEntry?.donorDetails?.fullName?.toLowerCase().includes(searchLower) ||
            item.scrapEntry?.donorDetails?.username?.toLowerCase().includes(searchLower)
        )
    })

    const getConditionColor = (condition: string) => {
        switch (condition) {
            case 'new': return 'bg-green-100 text-green-800 border-green-200'
            case 'good': return 'bg-blue-100 text-blue-800 border-blue-200'
            case 'repairable': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
            case 'scrap': return 'bg-red-100 text-red-800 border-red-200'
            case 'not applicable': return 'bg-gray-100 text-gray-800 border-gray-200'
            default: return 'bg-gray-100 text-gray-800 border-gray-200'
        }
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        })
    }

    const formatCurrency = (amount?: number) => {
        if (!amount) return 'N/A'
        return `₹${amount.toLocaleString('en-IN')}`
    }

    if (loading) {
        return (
            <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold">Scrap Items</h1>
                </div>
                <div className="grid gap-4">
                    {[1, 2, 3].map(i => (
                        <Card key={i} className="animate-pulse">
                            <CardContent className="p-6">
                                <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                                <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">Scrap Items Management</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Manage all donated items, set prices, and track sales
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-sm text-muted-foreground">
                        {items.length} items found
                    </div>
                    <Link href="/admin">
                        <Button variant="outline" size="sm">
                            Back to Dashboard
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-col lg:flex-row gap-4">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                                <Input
                                    placeholder="Search by item name, ID, or donor..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            <Select value={conditionFilter} onValueChange={setConditionFilter}>
                                <SelectTrigger className="w-40">
                                    <Filter className="h-4 w-4 mr-2" />
                                    <SelectValue placeholder="Condition" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Conditions</SelectItem>
                                    <SelectItem value="new">New</SelectItem>
                                    <SelectItem value="good">Good</SelectItem>
                                    <SelectItem value="repairable">Repairable</SelectItem>
                                    <SelectItem value="scrap">Scrap</SelectItem>
                                    <SelectItem value="not applicable">Not Applicable</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={listedFilter} onValueChange={setListedFilter}>
                                <SelectTrigger className="w-40">
                                    <ShoppingCart className="h-4 w-4 mr-2" />
                                    <SelectValue placeholder="Listed" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Items</SelectItem>
                                    <SelectItem value="true">Listed</SelectItem>
                                    <SelectItem value="false">Not Listed</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={soldFilter} onValueChange={setSoldFilter}>
                                <SelectTrigger className="w-40">
                                    <DollarSign className="h-4 w-4 mr-2" />
                                    <SelectValue placeholder="Sold" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Items</SelectItem>
                                    <SelectItem value="true">Sold</SelectItem>
                                    <SelectItem value="false">Available</SelectItem>
                                </SelectContent>
                            </Select>

                            <Button onClick={handleSearch} variant="outline">
                                <Search className="h-4 w-4 mr-2" />
                                Search
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Items List */}
            <div className="grid gap-6">
                {filteredItems.map(item => (
                    <Card key={item._id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                            {/* Header with title and actions */}
                            <div className="flex items-start justify-between mb-6">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3">
                                        <h3 className="font-semibold text-lg">{item.name}</h3>
                                        <Badge className={getConditionColor(item.condition)}>
                                            {item.condition.charAt(0).toUpperCase() + item.condition.slice(1)}
                                        </Badge>
                                        {item.marketplaceListing.listed && (
                                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                                Listed
                                            </Badge>
                                        )}
                                        {item.marketplaceListing.sold && item.availableQuantity === 0 && (
                                            <Badge className="bg-green-100 text-green-800 border-green-200">
                                                Sold Out
                                            </Badge>
                                        )}
                                        {item.marketplaceListing.sold && item.availableQuantity > 0 && (
                                            <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                                                Partially Sold
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        Item ID: {item._id}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Link href={`/admin/items/${item._id}`}>
                                        <Button variant="outline" size="sm">
                                            <Edit className="h-4 w-4 mr-2" />
                                            Edit
                                        </Button>
                                    </Link>
                                    <Link href={`/admin/items/${item._id}`}>
                                        <Button variant="outline" size="sm">
                                            <Eye className="h-4 w-4 mr-2" />
                                            View
                                        </Button>
                                    </Link>
                                </div>
                            </div>

                            {/* Main content grid */}
                            <div className="grid lg:grid-cols-4 gap-6">
                                {/* Photos Section */}
                                <div className="lg:col-span-1">
                                    <div className="space-y-3">
                                        <h4 className="font-medium text-sm flex items-center gap-2">
                                            <ImageIcon className="h-4 w-4" />
                                            Photos
                                        </h4>

                                        {/* Before Photos */}
                                        {item.photos.before.length > 0 && (
                                            <div>
                                                <div className="text-xs text-muted-foreground mb-2">Before ({item.photos.before.length})</div>
                                                <div className="grid grid-cols-2 gap-1">
                                                    {item.photos.before.slice(0, 4).map((photo, index) => (
                                                        <div key={index} className="relative aspect-square">
                                                            <Image
                                                                src={getCloudinaryUrl(photo, { width: 100, height: 100, crop: 'fill' })}
                                                                alt={`Before photo ${index + 1}`}
                                                                fill
                                                                className="object-cover rounded-md"
                                                                sizes="100px"
                                                            />
                                                        </div>
                                                    ))}
                                                    {item.photos.before.length > 4 && (
                                                        <div className="relative aspect-square bg-gray-100 rounded-md flex items-center justify-center">
                                                            <span className="text-xs text-gray-500">+{item.photos.before.length - 4}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* After Photos */}
                                        {item.photos.after.length > 0 && (
                                            <div>
                                                <div className="text-xs text-muted-foreground mb-2">After ({item.photos.after.length})</div>
                                                <div className="grid grid-cols-2 gap-1">
                                                    {item.photos.after.slice(0, 4).map((photo, index) => (
                                                        <div key={index} className="relative aspect-square">
                                                            <Image
                                                                src={getCloudinaryUrl(photo, { width: 100, height: 100, crop: 'fill' })}
                                                                alt={`After photo ${index + 1}`}
                                                                fill
                                                                className="object-cover rounded-md"
                                                                sizes="100px"
                                                            />
                                                        </div>
                                                    ))}
                                                    {item.photos.after.length > 4 && (
                                                        <div className="relative aspect-square bg-gray-100 rounded-md flex items-center justify-center">
                                                            <span className="text-xs text-gray-500">+{item.photos.after.length - 4}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* No photos placeholder */}
                                        {item.photos.before.length === 0 && item.photos.after.length === 0 && (
                                            <div className="text-center py-4 text-muted-foreground">
                                                <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                                <div className="text-xs">No photos</div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Item Details */}
                                <div className="lg:col-span-3">
                                    <div className="grid md:grid-cols-3 gap-6">
                                        {/* Quantity & Donor Info */}
                                        <div className="space-y-3">
                                            <h4 className="font-medium text-sm">Item Info</h4>
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Package className="h-4 w-4 text-gray-500" />
                                                    <span className="font-medium">Quantity:</span>
                                                    <span className="text-muted-foreground">
                                                        {item.availableQuantity}/{item.quantity}
                                                        {item.availableQuantity < item.quantity && (
                                                            <span className="text-orange-600 ml-1">
                                                                ({item.quantity - item.availableQuantity} sold)
                                                            </span>
                                                        )}
                                                    </span>
                                                </div>

                                                {item.scrapEntry?.donorDetails && (
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <User className="h-4 w-4 text-gray-500" />
                                                        <span className="font-medium">Donor:</span>
                                                        <span className="text-muted-foreground">
                                                            {item.scrapEntry.donorDetails.fullName || item.scrapEntry.donorDetails.username}
                                                        </span>
                                                    </div>
                                                )}

                                                <div className="flex items-center gap-2 text-sm">
                                                    <Calendar className="h-4 w-4 text-gray-500" />
                                                    <span className="font-medium">Added:</span>
                                                    <span className="text-muted-foreground">
                                                        {formatDate(item.createdAt)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Pricing Info */}
                                        <div className="space-y-3">
                                            <h4 className="font-medium text-sm">Pricing</h4>
                                            <div className="space-y-2">
                                                {item.marketplaceListing.demandedPrice && (
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <DollarSign className="h-4 w-4 text-blue-500" />
                                                        <span className="font-medium">Demanded:</span>
                                                        <span className="text-blue-600 font-medium">
                                                            {formatCurrency(item.marketplaceListing.demandedPrice)}
                                                        </span>
                                                    </div>
                                                )}

                                                {item.marketplaceListing.salePrice && (
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <DollarSign className="h-4 w-4 text-green-600" />
                                                        <span className="font-medium">Sale Price:</span>
                                                        <span className="text-green-600 font-medium">
                                                            {formatCurrency(item.marketplaceListing.salePrice)}
                                                        </span>
                                                    </div>
                                                )}

                                                {item.repairingCost && (
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <DollarSign className="h-4 w-4 text-orange-500" />
                                                        <span className="font-medium">Repair Cost:</span>
                                                        <span className="text-orange-600">
                                                            {formatCurrency(item.repairingCost)}
                                                        </span>
                                                    </div>
                                                )}

                                                {!item.marketplaceListing.demandedPrice && !item.marketplaceListing.salePrice && !item.repairingCost && (
                                                    <div className="text-sm text-muted-foreground">No pricing set</div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Status & Sales Info */}
                                        <div className="space-y-3">
                                            <h4 className="font-medium text-sm">Status</h4>
                                            <div className="space-y-2">
                                                {item.marketplaceListing.listed && (
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <ShoppingCart className="h-4 w-4 text-blue-500" />
                                                        <span className="text-blue-600 font-medium">Listed on marketplace</span>
                                                    </div>
                                                )}

                                                {item.marketplaceListing.sold && item.marketplaceListing.soldAt && (
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <Calendar className="h-4 w-4 text-green-600" />
                                                        <span className="font-medium">Sold:</span>
                                                        <span className="text-green-600">
                                                            {formatDate(item.marketplaceListing.soldAt)}
                                                        </span>
                                                    </div>
                                                )}

                                                {!item.marketplaceListing.listed && !item.marketplaceListing.sold && (
                                                    <div className="text-sm text-muted-foreground">Not listed</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Sale Information */}
                                    {item.marketplaceListing.sold && item.marketplaceListing.soldToName && (
                                        <div className="mt-4 p-3 bg-green-50 rounded-md">
                                            <div className="text-sm">
                                                <span className="font-medium text-green-800">Sold to:</span>
                                                <span className="text-green-700 ml-2">{item.marketplaceListing.soldToName}</span>
                                                {item.marketplaceListing.soldVia && (
                                                    <Badge variant="outline" className="ml-2 bg-green-100 text-green-800 border-green-200">
                                                        via {item.marketplaceListing.soldVia}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {filteredItems.length === 0 && !loading && (
                <Card>
                    <CardContent className="p-8 text-center">
                        <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <div className="text-muted-foreground">
                            {searchTerm || conditionFilter !== 'all' || listedFilter !== 'all' || soldFilter !== 'all'
                                ? 'No items match your search criteria'
                                : 'No items found'
                            }
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center gap-2">
                    <Button
                        variant="outline"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                    >
                        Previous
                    </Button>
                    <span className="flex items-center px-4 text-sm text-muted-foreground">
                        Page {page} of {totalPages}
                    </span>
                    <Button
                        variant="outline"
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                    >
                        Next
                    </Button>
                </div>
            )}
        </div>
    )
}
