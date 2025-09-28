"use client"
import { IScrapItem } from '@/models/ScrapItem';
import { ClickableImage } from '@/components/ui/clickable-image';

interface ItemCardProps {
    item: IScrapItem
}

export function ItemCard({ item }: ItemCardProps) {
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
                <p className="text-green-600 font-medium">
                    Price: ₹{item.marketplaceListing.demandedPrice}
                </p>
            )}
        </div>
    )
}
