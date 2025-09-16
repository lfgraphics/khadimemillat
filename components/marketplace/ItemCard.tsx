"use client"
import { CldImage } from 'next-cloudinary';
import { useImageModal } from "@/components/marketplace/ImageModalProvider"
import { IScrapItem } from '@/models/ScrapItem';

interface ItemCardProps {
    item: IScrapItem
}

export function ItemCard({ item }: ItemCardProps) {
    const { openModal } = useImageModal()

    return (
        <div className="rounded-2xl shadow-md p-4 bg-white hover:shadow-lg transition">
            <div
                className="cursor-pointer"
                onClick={() => openModal([...(item.photos?.before || []), ...(item.photos?.after || [])])}
            >
                <CldImage
                    src={item.photos?.before?.[0] || "/placeholder.png"}
                    alt={item.name}
                    className="w-full h-48 object-cover rounded-lg"
                />
            </div>
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
