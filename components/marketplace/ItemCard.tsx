"use client"
import { IScrapItem } from '@/models/ScrapItem';
import { ClickableImage } from '@/components/ui/clickable-image';
import { Button } from '@/components/ui/button';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

interface ItemCardProps {
    item: IScrapItem
}

export function ItemCard({ item }: ItemCardProps) {
    const { user } = useUser();
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const handlePurchase = async () => {
        if (!user) {
            router.push('/sign-in?redirect_url=/marketplace');
            return;
        }
        try {
            setLoading(true);
            const res = await fetch('/api/protected/conversations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scrapItemId: (item as any)._id, buyerName: user.fullName || 'User' })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to start conversation');
            toast.success('Conversation started with moderators');
            router.push(`/conversations/${data.conversation._id}`);
        } catch (e: any) {
            toast.error(e.message || 'Could not start conversation');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="rounded-2xl shadow-md p-4 bg-card hover:shadow-lg transition">
                        {item.photos?.before?.[0] ? (
                            <ClickableImage
                                src={item.photos.before[0]}
                                alt={item.name}
                                className="w-full h-48 object-cover rounded-lg"
                                caption={item.name}
                                transform={{ width: 600, height: 400, crop: 'fill' }}
                            />
                        ) : (
                            <div className="w-full h-48 rounded-lg bg-muted flex items-center justify-center text-sm text-muted-foreground">
                                No image
                            </div>
                        )}
            <h3 className="mt-2 font-semibold">{item.name}</h3>
            <p className="text-sm text-gray-600">Condition: {item.condition}</p>
            {item.marketplaceListing.listed && (
                <div className="mt-2 flex items-center justify-between gap-2">
                    <p className="text-green-600 font-medium">
                        Price: ₹{item.marketplaceListing.demandedPrice}
                    </p>
                    {!item.marketplaceListing.sold && (
                        <Button size="sm" onClick={handlePurchase} disabled={loading}>
                            {loading ? 'Starting…' : 'Purchase'}
                        </Button>
                    )}
                </div>
            )}
        </div>
    )
}
