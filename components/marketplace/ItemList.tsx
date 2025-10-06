"use client"

import { ItemCard } from "./ItemCard"
import { Suspense } from "react";
import Loading from "@/components/Loading";

interface ItemListProps {
    items: any[]
}

export function ItemList({ items }: ItemListProps) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {items.map((item) => (
                <Suspense key={item._id} fallback={<Loading inline />}> 
                    <ItemCard item={item} />
                </Suspense>
            ))}
        </div>
    )
}
