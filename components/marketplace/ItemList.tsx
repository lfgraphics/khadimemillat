"use client"

import { ItemCard } from "./ItemCard"

interface ItemListProps {
    items: any[]
}

export function ItemList({ items }: ItemListProps) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {items.length === 0 && "No Items, Add items to display it here"}
            {items.map((item) => (
                <ItemCard key={item._id} item={item} />
            ))}
        </div>
    )
}
