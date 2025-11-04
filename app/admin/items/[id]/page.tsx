"use client"

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { safeJson } from '@/lib/utils'
import Link from 'next/link'
import { ArrowLeft, Calendar, MapPin, Phone, User, Edit, Save, X, Package, DollarSign, ShoppingCart, Eye, Upload, Trash2, Plus } from 'lucide-react'
import Image from 'next/image'
import { getCloudinaryUrl } from '@/lib/cloudinary-client'

interface ScrapItem {
  _id: string
  name: string
  description?: string
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
      primaryEmailAddress?: { emailAddress: string }
    }
    createdAt: string
  }
  createdAt: string
  updatedAt: string
}

export default function ItemDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useUser()
  const [item, setItem] = useState<ScrapItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editData, setEditData] = useState({
    name: '',
    description: '',
    condition: '',
    quantity: 1,
    repairingCost: '',
    listed: false,
    demandedPrice: '',
    salePrice: '',
    sold: false,
    soldToName: '',
    soldVia: 'offline' as 'online' | 'chat' | 'offline',
    saleQuantity: 1
  })

  const fetchItemDetails = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/protected/scrap-items/${params.id}`)
      if (!res.ok) throw new Error('Failed to fetch item details')
      
      const data = await safeJson<any>(res)
      setItem(data.item)
      
      // Initialize edit data
      setEditData({
        name: data.item.name || '',
        description: data.item.description || '',
        condition: data.item.condition || 'good',
        quantity: data.item.quantity || 1,
        repairingCost: data.item.repairingCost?.toString() || '',
        listed: data.item.marketplaceListing?.listed || false,
        demandedPrice: data.item.marketplaceListing?.demandedPrice?.toString() || '',
        salePrice: data.item.marketplaceListing?.salePrice?.toString() || '',
        sold: data.item.marketplaceListing?.sold || false,
        soldToName: data.item.marketplaceListing?.soldToName || '',
        soldVia: data.item.marketplaceListing?.soldVia || 'offline',
        saleQuantity: 1
      })
    } catch (error) {
      console.error('Error fetching item details:', error)
      toast.error('Failed to load item details')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (params.id) {
      fetchItemDetails()
    }
  }, [params.id])

  const handleSave = async () => {
    try {
      setSaving(true)
      
      // Validate quantity changes
      if (editData.quantity < (item?.quantity || 1) - (item?.availableQuantity || 0)) {
        toast.error('Cannot reduce quantity below already sold items')
        return
      }

      // Validate sale quantity
      if (editData.sold && editData.saleQuantity > (item?.availableQuantity || 0)) {
        toast.error(`Cannot sell ${editData.saleQuantity} items. Only ${item?.availableQuantity || 0} available`)
        return
      }

      if (editData.sold && editData.saleQuantity < 1) {
        toast.error('Sale quantity must be at least 1')
        return
      }

      // Calculate new available quantity
      const soldQuantity = (item?.quantity || 1) - (item?.availableQuantity || 0)
      const newAvailableQuantity = editData.quantity - soldQuantity

      const updateData = {
        name: editData.name.trim(),
        description: editData.description.trim(),
        condition: editData.condition,
        quantity: editData.quantity,
        availableQuantity: newAvailableQuantity,
        repairingCost: editData.repairingCost ? parseFloat(editData.repairingCost) : undefined,
        marketplaceListing: {
          listed: editData.listed,
          demandedPrice: editData.demandedPrice ? parseFloat(editData.demandedPrice) : undefined,
          salePrice: editData.salePrice ? parseFloat(editData.salePrice) : undefined,
          sold: editData.sold,
          soldToName: editData.soldToName.trim() || undefined,
          soldVia: editData.soldVia,
          quantity: editData.saleQuantity
        }
      }

      const res = await fetch(`/api/protected/scrap-items/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || 'Failed to update item')
      }

      const data = await safeJson<any>(res)
      setItem(data.item)
      setEditing(false)
      toast.success('Item updated successfully')
    } catch (error: any) {
      console.error('Error updating item:', error)
      toast.error(error.message || 'Failed to update item')
    } finally {
      setSaving(false)
    }
  }

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
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatCurrency = (amount?: number) => {
    if (!amount) return 'N/A'
    return `₹${amount.toLocaleString('en-IN')}`
  }

  const calculateProfit = () => {
    if (!item?.marketplaceListing.salePrice) return null
    const salePrice = item.marketplaceListing.salePrice
    const repairCost = item.repairingCost || 0
    return salePrice - repairCost
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <Card>
            <CardContent className="p-6">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-3 bg-gray-200 rounded w-3/4"></div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <div className="text-muted-foreground mb-4">Item not found</div>
            <Link href="/admin/items">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Items
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/items">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <h1 className="text-2xl font-semibold">Item Details</h1>
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <Button variant="outline" onClick={() => setEditing(false)} disabled={saving}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Item
            </Button>
          )}
        </div>
      </div>

      {/* Item Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Item Information</span>
            <div className="flex gap-2">
              <Badge className={getConditionColor(item.condition)}>
                {item.condition.charAt(0).toUpperCase() + item.condition.slice(1)}
              </Badge>
              {item.marketplaceListing.listed && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  Listed
                </Badge>
              )}
              {item.marketplaceListing.sold && (
                <Badge className="bg-green-100 text-green-800 border-green-200">
                  Sold
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Item Name</Label>
                {editing ? (
                  <Input
                    value={editData.name}
                    onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                    className="mt-1"
                    placeholder="Enter item name"
                  />
                ) : (
                  <div className="mt-1 text-lg font-semibold">{item.name}</div>
                )}
              </div>

              <div>
                <Label className="text-sm font-medium">Description</Label>
                {editing ? (
                  <Textarea
                    value={editData.description}
                    onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                    className="mt-1"
                    placeholder="Enter item description"
                    rows={3}
                  />
                ) : (
                  <div className="mt-1 text-sm text-muted-foreground">
                    {item.description || 'No description provided'}
                  </div>
                )}
              </div>

              <div>
                <Label className="text-sm font-medium">Condition</Label>
                {editing ? (
                  <Select value={editData.condition} onValueChange={(value) => setEditData(prev => ({ ...prev, condition: value }))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="good">Good</SelectItem>
                      <SelectItem value="repairable">Repairable</SelectItem>
                      <SelectItem value="scrap">Scrap</SelectItem>
                      <SelectItem value="not applicable">Not Applicable</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="mt-1">
                    <Badge className={getConditionColor(item.condition)}>
                      {item.condition.charAt(0).toUpperCase() + item.condition.slice(1)}
                    </Badge>
                  </div>
                )}
              </div>

              <div>
                <Label className="text-sm font-medium">Quantity</Label>
                {editing ? (
                  <div className="mt-1">
                    <Input
                      type="number"
                      min="1"
                      value={editData.quantity}
                      onChange={(e) => setEditData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                    />
                    <div className="text-xs text-muted-foreground mt-1">
                      Currently sold: {item.quantity - item.availableQuantity}
                    </div>
                  </div>
                ) : (
                  <div className="mt-1 flex items-center gap-2">
                    <Package className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">{item.availableQuantity}/{item.quantity}</span>
                    {item.availableQuantity < item.quantity && (
                      <span className="text-orange-600 text-sm">
                        ({item.quantity - item.availableQuantity} sold)
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Repairing Cost</Label>
                {editing ? (
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editData.repairingCost}
                    onChange={(e) => setEditData(prev => ({ ...prev, repairingCost: e.target.value }))}
                    placeholder="0.00"
                    className="mt-1"
                  />
                ) : (
                  <div className="mt-1 flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-orange-500" />
                    <span>{formatCurrency(item.repairingCost)}</span>
                  </div>
                )}
              </div>

              <div>
                <Label className="text-sm font-medium">Created</Label>
                <div className="mt-1 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span>{formatDate(item.createdAt)}</span>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Last Updated</Label>
                <div className="mt-1 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span>{formatDate(item.updatedAt)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="text-xs text-muted-foreground pt-2 border-t">
            <div>Item ID: {item._id}</div>
            {item.scrapEntry && (
              <div>Donation Entry ID: {item.scrapEntry._id}</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Marketplace Listing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Marketplace Listing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            {editing ? (
              <>
                <Checkbox
                  id="listed"
                  checked={editData.listed}
                  onCheckedChange={(checked) => setEditData(prev => ({ ...prev, listed: !!checked }))}
                />
                <Label htmlFor="listed">List on marketplace</Label>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <span className="font-medium">Listed:</span>
                <Badge variant={item.marketplaceListing.listed ? "default" : "outline"}>
                  {item.marketplaceListing.listed ? "Yes" : "No"}
                </Badge>
              </div>
            )}
          </div>

          {(editing && editData.listed) || (!editing && item.marketplaceListing.listed) ? (
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Demanded Price</Label>
                {editing ? (
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editData.demandedPrice}
                    onChange={(e) => setEditData(prev => ({ ...prev, demandedPrice: e.target.value }))}
                    placeholder="0.00"
                    className="mt-1"
                  />
                ) : (
                  <div className="mt-1 flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">{formatCurrency(item.marketplaceListing.demandedPrice)}</span>
                  </div>
                )}
              </div>

              <div>
                <Label className="text-sm font-medium">Sale Price</Label>
                {editing ? (
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editData.salePrice}
                    onChange={(e) => setEditData(prev => ({ ...prev, salePrice: e.target.value }))}
                    placeholder="0.00"
                    className="mt-1"
                  />
                ) : item.marketplaceListing.salePrice ? (
                  <div className="mt-1 flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-500" />
                    <span className="font-medium text-green-600">{formatCurrency(item.marketplaceListing.salePrice)}</span>
                  </div>
                ) : (
                  <div className="mt-1 text-muted-foreground">Not sold yet</div>
                )}
              </div>
            </div>
          ) : null}

          {/* Sale Information */}
          {editing ? (
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sold"
                  checked={editData.sold}
                  onCheckedChange={(checked) => setEditData(prev => ({ ...prev, sold: !!checked }))}
                />
                <Label htmlFor="sold">Mark as sold</Label>
              </div>

              {editData.sold && (
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Quantity to Sell</Label>
                    <Input
                      type="number"
                      min="1"
                      max={item?.availableQuantity || 1}
                      value={editData.saleQuantity}
                      onChange={(e) => setEditData(prev => ({ ...prev, saleQuantity: parseInt(e.target.value) || 1 }))}
                      className="mt-1"
                    />
                    <div className="text-xs text-muted-foreground mt-1">
                      Available: {item?.availableQuantity || 0}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Buyer Name</Label>
                    <Input
                      value={editData.soldToName}
                      onChange={(e) => setEditData(prev => ({ ...prev, soldToName: e.target.value }))}
                      placeholder="Buyer name"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Sold Via</Label>
                    <Select value={editData.soldVia} onValueChange={(value: 'online' | 'chat' | 'offline') => setEditData(prev => ({ ...prev, soldVia: value }))}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="offline">Offline</SelectItem>
                        <SelectItem value="chat">Chat</SelectItem>
                        <SelectItem value="online">Online</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          ) : item.marketplaceListing.sold ? (
            <div className="border-t pt-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-medium text-green-600">✓ Sold</span>
                {item.marketplaceListing.soldAt && (
                  <span className="text-sm text-muted-foreground">
                    on {formatDate(item.marketplaceListing.soldAt)}
                  </span>
                )}
              </div>
              
              {item.marketplaceListing.soldToName && (
                <div className="text-sm">
                  <span className="font-medium">Buyer:</span> {item.marketplaceListing.soldToName}
                </div>
              )}
              
              {item.marketplaceListing.soldVia && (
                <div className="text-sm">
                  <span className="font-medium">Sold via:</span>
                  <Badge variant="outline" className="ml-2">
                    {item.marketplaceListing.soldVia}
                  </Badge>
                </div>
              )}

              {calculateProfit() !== null && (
                <div className="text-sm">
                  <span className="font-medium">Profit:</span>
                  <span className={`ml-2 font-medium ${calculateProfit()! >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(calculateProfit()!)}
                  </span>
                </div>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Donor Information */}
      {item.scrapEntry && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Donor Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Donor Name</Label>
                <div className="mt-1">
                  {item.scrapEntry.donorDetails?.fullName || 
                   item.scrapEntry.donorDetails?.username || 
                   'Unknown Donor'}
                </div>
              </div>

              {item.scrapEntry.donorDetails?.primaryEmailAddress && (
                <div>
                  <Label className="text-sm font-medium">Email</Label>
                  <div className="mt-1">{item.scrapEntry.donorDetails.primaryEmailAddress.emailAddress}</div>
                </div>
              )}

              <div>
                <Label className="text-sm font-medium">Donation Date</Label>
                <div className="mt-1 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span>{formatDate(item.scrapEntry.createdAt)}</span>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Collection Request</Label>
                <div className="mt-1">
                  <Link href={`/admin/requests/${item.scrapEntry.collectionRequestId}`}>
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      View Request
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Photos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Photos
            </div>
            {editing && (
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Photos
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3 flex items-center justify-between">
                <span>Before Photos ({item.photos.before.length})</span>
                {editing && item.photos.before.length > 0 && (
                  <Button variant="ghost" size="sm" className="text-red-600 hoact:text-red-700">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </h4>
              {item.photos.before.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {item.photos.before.map((photo, index) => (
                    <div key={index} className="relative aspect-square group">
                      <Image
                        src={getCloudinaryUrl(photo, { width: 200, height: 200, crop: 'fill' })}
                        alt={`Before photo ${index + 1}`}
                        fill
                        className="object-cover rounded-md"
                        sizes="200px"
                      />
                      {editing && (
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hoact:bg-opacity-30 transition-all rounded-md flex items-center justify-center">
                          <Button
                            variant="destructive"
                            size="sm"
                            className="opacity-0 group-hoact:opacity-100 transition-opacity"
                            onClick={() => {
                              // TODO: Implement photo removal
                              toast.info('Photo removal coming soon')
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <div className="text-sm text-muted-foreground">No before photos</div>
                  {editing && (
                    <Button variant="outline" size="sm" className="mt-2">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Before Photos
                    </Button>
                  )}
                </div>
              )}
            </div>

            <div>
              <h4 className="font-medium mb-3 flex items-center justify-between">
                <span>After Photos ({item.photos.after.length})</span>
                {editing && item.photos.after.length > 0 && (
                  <Button variant="ghost" size="sm" className="text-red-600 hoact:text-red-700">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </h4>
              {item.photos.after.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {item.photos.after.map((photo, index) => (
                    <div key={index} className="relative aspect-square group">
                      <Image
                        src={getCloudinaryUrl(photo, { width: 200, height: 200, crop: 'fill' })}
                        alt={`After photo ${index + 1}`}
                        fill
                        className="object-cover rounded-md"
                        sizes="200px"
                      />
                      {editing && (
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hoact:bg-opacity-30 transition-all rounded-md flex items-center justify-center">
                          <Button
                            variant="destructive"
                            size="sm"
                            className="opacity-0 group-hoact:opacity-100 transition-opacity"
                            onClick={() => {
                              // TODO: Implement photo removal
                              toast.info('Photo removal coming soon')
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <div className="text-sm text-muted-foreground">No after photos</div>
                  {editing && (
                    <Button variant="outline" size="sm" className="mt-2">
                      <Plus className="h-4 w-4 mr-2" />
                      Add After Photos
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          {editing && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <div className="text-sm text-blue-800">
                <strong>Photo Management:</strong> Upload new photos or remove existing ones. 
                Before photos show the item's original condition, while after photos show it after any repairs or cleaning.
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}