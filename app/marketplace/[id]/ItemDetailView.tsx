"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { IScrapItem } from "@/models/ScrapItem"
import { useImageModal } from "@/components/marketplace/ImageModalProvider"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ArrowLeft, Package, ShoppingCart, Minus, Plus, Edit, ChevronLeft, ChevronRight, X } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useUser } from "@clerk/nextjs"
import { toast } from "sonner"
import Link from "next/link"

interface ItemDetailViewProps {
  itemId: string
}

export function ItemDetailView({ itemId }: ItemDetailViewProps) {
  const { user } = useUser()
  const router = useRouter()
  const [item, setItem] = useState<IScrapItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [purchasing, setPurchasing] = useState(false)
  const [selectedQuantity, setSelectedQuantity] = useState(1)
  const [showQuantitySelector, setShowQuantitySelector] = useState(false)

  // Fallback modal state
  const [fallbackModalOpen, setFallbackModalOpen] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  const { openModal } = useImageModal()

  // Fetch item data
  useEffect(() => {
    const fetchItem = async () => {
      try {
        setLoading(true)
        const res = await fetch(`/api/public/items/${itemId}`)
        if (!res.ok) {
          if (res.status === 404) {
            setError("Item not found")
          } else {
            throw new Error("Failed to fetch item")
          }
          return
        }
        const data = await res.json()
        setItem(data.item)
      } catch (err: any) {
        setError(err.message || "An error occurred")
      } finally {
        setLoading(false)
      }
    }

    fetchItem()
  }, [itemId])

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-8 bg-muted rounded w-1/3 mb-4" />
            <div className="h-4 bg-muted rounded w-1/2" />
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="aspect-square bg-muted rounded-lg" />
              <div className="space-y-4">
                <div className="h-4 bg-muted rounded w-full" />
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !item) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-destructive">
          <CardContent className="p-6 text-center">
            <p className="text-destructive mb-4">{error || "Item not found"}</p>
            <Button onClick={() => router.push("/marketplace")} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Marketplace
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Item data processing
  const rawAvailableQuantity = (item as any).availableQuantity
  const totalQuantity = (item as any).quantity || 1
  const availableQuantity = rawAvailableQuantity !== undefined ? rawAvailableQuantity : totalQuantity
  const unitPrice = item.marketplaceListing.demandedPrice || 0
  const totalPrice = unitPrice * selectedQuantity
  const isSoldOut = rawAvailableQuantity !== undefined && rawAvailableQuantity <= 0

  const userRole = user?.publicMetadata?.role as string
  const isAdminOrModerator = userRole === 'admin' || userRole === 'moderator'

  const allImages = [
    ...(item.photos?.before || []),
    ...(item.photos?.after || [])
  ].filter(Boolean)

  const handleImageClick = (index: number) => {
    if (allImages.length > 0) {
      if (typeof openModal === 'function') {
        openModal(allImages, index)
      } else {
        setCurrentImageIndex(index)
        setFallbackModalOpen(true)
      }
    }
  }

  const navigateImage = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setCurrentImageIndex(currentImageIndex > 0 ? currentImageIndex - 1 : allImages.length - 1)
    } else {
      setCurrentImageIndex(currentImageIndex < allImages.length - 1 ? currentImageIndex + 1 : 0)
    }
  }

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity >= 1 && newQuantity <= availableQuantity) {
      setSelectedQuantity(newQuantity)
    }
  }

  const handlePurchaseClick = () => {
    if (availableQuantity > 1) {
      setShowQuantitySelector(true)
    } else {
      handlePurchase()
    }
  }

  const handlePurchase = async () => {
    if (!user) {
      router.push('/sign-in?redirectTo=' + encodeURIComponent(`/marketplace/${itemId}`))
      return
    }
    try {
      setPurchasing(true)
      const res = await fetch('/api/protected/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scrapItemId: (item as any)._id,
          buyerName: user.fullName || 'User',
          requestedQuantity: selectedQuantity,
          totalAmount: totalPrice
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to start conversation')
      toast.success(`Conversation started for ${selectedQuantity} item(s)`)
      router.push(`/conversations/${data.conversation._id}`)
    } catch (e: any) {
      toast.error(e.message || 'Could not start conversation')
    } finally {
      setPurchasing(false)
    }
  }

  return (
    <div className="container mx-auto p-6">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => router.push("/marketplace")}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Marketplace
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-3xl mb-2">{item.name}</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-sm">
                  {item.condition}
                </Badge>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Package className="h-4 w-4" />
                  <span>{availableQuantity} available</span>
                  {totalQuantity > 1 && (
                    <span className="text-xs">({availableQuantity}/{totalQuantity})</span>
                  )}
                </div>
              </div>
            </div>
            {isAdminOrModerator && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link href={`/admin/items/${(item as any)._id}`}>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Edit item details</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid md:grid-cols-2 gap-8">
            {/* Image Gallery */}
            <div className="space-y-4">
              {/* Main Image */}
              {allImages.length > 0 ? (
                <div
                  className="relative cursor-zoom-in rounded-lg overflow-hidden border aspect-square"
                  onClick={() => handleImageClick(0)}
                >
                  <img
                    src={allImages[0]}
                    alt={item.name}
                    className="w-full h-full object-cover hoact:opacity-90 transition-opacity"
                  />
                  <div className="absolute inset-0 bg-black/0 hoact:bg-black/10 transition-colors flex items-center justify-center opacity-0 hoact:opacity-100">
                    <div className="bg-white/90 text-black px-3 py-1 rounded-full text-sm font-medium">
                      View {allImages.length} image{allImages.length > 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="aspect-square rounded-lg bg-muted flex items-center justify-center border">
                  <span className="text-muted-foreground">No image available</span>
                </div>
              )}

              {/* Thumbnail Grid */}
              {allImages.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {allImages.slice(0, 4).map((img, idx) => (
                    <div
                      key={idx}
                      className="relative aspect-square rounded-md overflow-hidden border cursor-pointer hoact:border-primary transition-colors"
                      onClick={() => handleImageClick(idx)}
                    >
                      <img
                        src={img}
                        alt={`${item.name} ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {idx === 3 && allImages.length > 4 && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-medium">
                          +{allImages.length - 4}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Item Details */}
            <div className="space-y-6">
              {/* Description */}
              {(item as any).description && (item as any).description.trim() && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">Description</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {(item as any).description}
                  </p>
                </div>
              )}

              {!isSoldOut && item.marketplaceListing.listed && (
                <>
                  <Separator />

                  {/* Pricing */}
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Pricing</h3>
                    <div className="space-y-2">
                      <p className="text-3xl font-bold text-primary">
                        ₹{unitPrice.toLocaleString()}
                        <span className="text-base font-normal text-muted-foreground ml-2">per item</span>
                      </p>
                      {showQuantitySelector && selectedQuantity > 1 && (
                        <p className="text-xl text-muted-foreground">
                          Total: ₹{totalPrice.toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Quantity Selector */}
                  {showQuantitySelector && (
                    <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
                      <Label className="text-sm font-medium">Select Quantity</Label>
                      <div className="flex items-center gap-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleQuantityChange(selectedQuantity - 1)}
                          disabled={selectedQuantity <= 1}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Input
                          type="number"
                          min="1"
                          max={availableQuantity}
                          value={selectedQuantity}
                          onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                          className="w-20 text-center"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleQuantityChange(selectedQuantity + 1)}
                          disabled={selectedQuantity >= availableQuantity}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Maximum: {availableQuantity} items
                      </p>
                    </div>
                  )}

                  {/* Purchase Buttons */}
                  <div className="flex gap-3">
                    {!showQuantitySelector ? (
                      <Button
                        size="lg"
                        onClick={handlePurchaseClick}
                        disabled={purchasing}
                        className="flex-1"
                      >
                        <ShoppingCart className="h-5 w-5 mr-2" />
                        {purchasing ? 'Starting…' : 'Purchase'}
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          size="lg"
                          onClick={() => {
                            setShowQuantitySelector(false)
                            setSelectedQuantity(1)
                          }}
                          disabled={purchasing}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="lg"
                          onClick={handlePurchase}
                          disabled={purchasing}
                          className="flex-1"
                        >
                          {purchasing ? 'Starting…' : `Purchase ${selectedQuantity} item${selectedQuantity > 1 ? 's' : ''}`}
                        </Button>
                      </>
                    )}
                  </div>
                </>
              )}

              {/* Sold Out State */}
              {isSoldOut && item.marketplaceListing.listed && (
                <div className="text-center py-8">
                  <Badge variant="secondary" className="bg-destructive/10 text-destructive text-lg px-4 py-2">
                    Sold Out
                  </Badge>
                </div>
              )}

              {/* Not Listed State */}
              {!item.marketplaceListing.listed && (
                <div className="text-center py-8">
                  <Badge variant="secondary" className="bg-muted text-muted-foreground text-lg px-4 py-2">
                    Not Available for Purchase
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fallback Image Modal */}
      <Dialog open={fallbackModalOpen} onOpenChange={setFallbackModalOpen}>
        <DialogContent className="max-w-6xl max-h-[95vh] p-0 overflow-hidden bg-black/95 border-0">
          <DialogHeader className="p-6 pb-0">
            <div className="flex justify-between items-center">
              <DialogTitle className="text-white">
                Photo {currentImageIndex + 1} of {allImages.length}
              </DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                className="text-white hoact:bg-white/20"
                onClick={() => setFallbackModalOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          {allImages.length > 0 && (
            <div className="relative p-6 pt-0">
              <img
                src={allImages[currentImageIndex]}
                alt={`${item.name} - Photo ${currentImageIndex + 1}`}
                className="w-full h-auto max-h-[75vh] object-contain rounded-lg"
              />

              {/* Navigation Buttons */}
              {allImages.length > 1 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute left-8 top-1/2 transform -translate-y-1/2 bg-white/90 hoact:bg-white"
                    onClick={() => navigateImage('prev')}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute right-8 top-1/2 transform -translate-y-1/2 bg-white/90 hoact:bg-white"
                    onClick={() => navigateImage('next')}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </>
              )}

              {/* Image Counter */}
              <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                {currentImageIndex + 1} / {allImages.length}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
