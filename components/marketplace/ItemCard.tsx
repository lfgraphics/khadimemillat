"use client"
import { IScrapItem } from '@/models/ScrapItem';
import { useImageModal } from './ImageModalProvider';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Package, ShoppingCart, Minus, Plus, Edit } from 'lucide-react';
import Link from 'next/link';

interface ItemCardProps {
    item: IScrapItem
}

export function ItemCard({ item }: ItemCardProps) {
    const { user } = useUser();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [selectedQuantity, setSelectedQuantity] = useState(1);
    const [showQuantitySelector, setShowQuantitySelector] = useState(false);
    
    // Fallback modal state in case ImageModalProvider is not available
    const [fallbackModalOpen, setFallbackModalOpen] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    
    // Get the modal from context
    const { openModal } = useImageModal();

    // Handle legacy items that don't have availableQuantity field
    const rawAvailableQuantity = (item as any).availableQuantity;
    const totalQuantity = (item as any).quantity || 1;

    // If availableQuantity is undefined, treat as legacy item with full quantity available
    // If availableQuantity is defined, use it (could be 0 for sold out)
    const availableQuantity = rawAvailableQuantity !== undefined ? rawAvailableQuantity : totalQuantity;

    const unitPrice = item.marketplaceListing.demandedPrice || 0;
    const totalPrice = unitPrice * selectedQuantity;

    // Check if item is actually sold out
    const isSoldOut = rawAvailableQuantity !== undefined && rawAvailableQuantity <= 0;

    // Check if user is admin or moderator
    const userRole = user?.publicMetadata?.role as string;
    const isAdminOrModerator = userRole === 'admin' || userRole === 'moderator';

    // Get all available images for the carousel
    const allImages = [
        ...(item.photos?.before || []),
        ...(item.photos?.after || [])
    ].filter(Boolean);

    const handleImageClick = () => {
        if (allImages.length > 0) {
            if (typeof openModal === 'function') {
                openModal(allImages, 0);
            } else {
                setCurrentImageIndex(0);
                setFallbackModalOpen(true);
            }
        }
    };

    const navigateImage = (direction: 'prev' | 'next') => {
        if (direction === 'prev') {
            setCurrentImageIndex(currentImageIndex > 0 ? currentImageIndex - 1 : allImages.length - 1);
        } else {
            setCurrentImageIndex(currentImageIndex < allImages.length - 1 ? currentImageIndex + 1 : 0);
        }
    };

    const handleQuantityChange = (newQuantity: number) => {
        if (newQuantity >= 1 && newQuantity <= availableQuantity) {
            setSelectedQuantity(newQuantity);
        }
    };

    const handlePurchaseClick = () => {
        if (availableQuantity > 1) {
            setShowQuantitySelector(true);
        } else {
            handlePurchase();
        }
    };

    const handlePurchase = async () => {
        if (!user) {
            router.push('/sign-in?redirectTo=' + encodeURIComponent('/marketplace'));
            return;
        }
        try {
            setLoading(true);
            const res = await fetch('/api/protected/conversations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    scrapItemId: (item as any)._id,
                    buyerName: user.fullName || 'User',
                    requestedQuantity: selectedQuantity,
                    totalAmount: totalPrice
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to start conversation');
            toast.success(`Conversation started for ${selectedQuantity} item(s)`);
            router.push(`/conversations/${data.conversation._id}`);
        } catch (e: any) {
            toast.error(e.message || 'Could not start conversation');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="rounded-2xl shadow-md p-4 bg-card hover:shadow-lg transition">
            {/* Image */}
            {item.photos?.before?.[0] ? (
                <div 
                    className="relative cursor-zoom-in"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('Container click handler');
                        handleImageClick();
                    }}
                >
                    <img
                        src={item.photos.before[0]}
                        alt={item.name}
                        className="w-full h-48 object-cover rounded-lg hover:opacity-90 transition-opacity pointer-events-none"
                    />
                    {allImages.length > 1 && (
                        <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded-full text-xs pointer-events-none">
                            +{allImages.length - 1} more
                        </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors rounded-lg flex items-center justify-center opacity-0 hover:opacity-100 pointer-events-none">
                        <div className="bg-white/90 text-black px-3 py-1 rounded-full text-sm font-medium">
                            View {allImages.length} image{allImages.length > 1 ? 's' : ''}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="w-full h-48 rounded-lg bg-muted flex items-center justify-center text-sm text-muted-foreground">
                    No image
                </div>
            )}

            {/* Item Info */}
            <div className="mt-3 space-y-2">
                <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-lg">{item.name}</h3>
                    {isAdminOrModerator && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Link href={`/admin/items/${(item as any)._id}`}>
                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-blue-50 transition-colors">
                                            <Edit className="h-4 w-4 text-blue-600" />
                                            <span className="sr-only">Edit item</span>
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

                {/* Description */}
                {(item as any).description && (item as any).description.trim() && (
                    <p className="text-sm text-muted-foreground overflow-hidden" style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical'
                    }}>
                        {(item as any).description}
                    </p>
                )}



                {/* Condition and Quantity */}
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                        {item.condition}
                    </Badge>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Package className="h-3 w-3" />
                        <span>{availableQuantity} available</span>
                        {totalQuantity > 1 && (
                            <span className="text-xs">({availableQuantity}/{totalQuantity})</span>
                        )}
                    </div>
                </div>

                {/* Pricing and Purchase */}
                {item.marketplaceListing.listed && !isSoldOut && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-green-600 font-medium">
                                    ₹{unitPrice} <span className="text-xs text-muted-foreground">per item</span>
                                </p>
                                {showQuantitySelector && selectedQuantity > 1 && (
                                    <p className="text-sm text-muted-foreground">
                                        Total: ₹{totalPrice.toLocaleString()}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Quantity Selector */}
                        {showQuantitySelector && (
                            <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                                <Label className="text-sm font-medium">Select Quantity</Label>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleQuantityChange(selectedQuantity - 1)}
                                        disabled={selectedQuantity <= 1}
                                    >
                                        <Minus className="h-3 w-3" />
                                    </Button>
                                    <Input
                                        type="number"
                                        min="1"
                                        max={availableQuantity}
                                        value={selectedQuantity}
                                        onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                                        className="w-16 text-center"
                                    />
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleQuantityChange(selectedQuantity + 1)}
                                        disabled={selectedQuantity >= availableQuantity}
                                    >
                                        <Plus className="h-3 w-3" />
                                    </Button>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    Max: {availableQuantity} items
                                </div>
                            </div>
                        )}

                        {/* Purchase Buttons */}
                        <div className="flex gap-2">
                            {!showQuantitySelector ? (
                                <Button
                                    size="sm"
                                    onClick={handlePurchaseClick}
                                    disabled={loading}
                                    className="flex-1"
                                >
                                    <ShoppingCart className="h-4 w-4 mr-2" />
                                    {loading ? 'Starting…' : 'Purchase'}
                                </Button>
                            ) : (
                                <>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            setShowQuantitySelector(false);
                                            setSelectedQuantity(1);
                                        }}
                                        disabled={loading}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={handlePurchase}
                                        disabled={loading}
                                        className="flex-1"
                                    >
                                        {loading ? 'Starting…' : `Purchase ${selectedQuantity} item${selectedQuantity > 1 ? 's' : ''}`}
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Sold Out State */}
                {item.marketplaceListing.listed && isSoldOut && (
                    <div className="text-center py-2">
                        <Badge variant="secondary" className="bg-red-100 text-red-800">
                            Sold Out
                        </Badge>
                    </div>
                )}

                {/* Not Listed State */}
                {!item.marketplaceListing.listed && (
                    <div className="text-center py-2">
                        <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                            Not Available
                        </Badge>
                    </div>
                )}
            </div>

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
                                className="text-white hover:bg-white/20"
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
                                        className="absolute left-8 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white"
                                        onClick={() => navigateImage('prev')}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="absolute right-8 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white"
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
