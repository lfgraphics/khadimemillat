"use client"

import { ItemCard } from "./ItemCard"
import { Suspense } from "react";
import Loading from "@/components/Loading";
import { Card, CardContent } from "@/components/ui/card";
import { Package, Search } from "lucide-react";

interface ItemListProps {
    items: any[]
    isLoading?: boolean
    hasFilters?: boolean
}

export function ItemList({ items, isLoading, hasFilters }: ItemListProps) {
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {Array.from({ length: 8 }).map((_, i) => (
                    <Card key={i} className="animate-pulse">
                        <div className="aspect-square bg-muted rounded-t-lg" />
                        <CardContent className="p-4">
                            <div className="h-4 bg-muted rounded mb-2" />
                            <div className="h-3 bg-muted rounded w-2/3 mb-2" />
                            <div className="h-3 bg-muted rounded w-1/2" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        )
    }

    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-muted p-6 mb-4">
                    {hasFilters ? (
                        <Search className="h-12 w-12 text-muted-foreground" />
                    ) : (
                        <Package className="h-12 w-12 text-muted-foreground" />
                    )}
                </div>
                <h3 className="text-lg font-semibold mb-2">
                    {hasFilters ? "No items found" : "No items available"}
                </h3>
                <p className="text-muted-foreground max-w-md">
                    {hasFilters 
                        ? "Try adjusting your search criteria or filters to find what you're looking for."
                        : "There are currently no items listed in the marketplace. Check back later for new additions."
                    }
                </p>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {items.map((item) => (
                <Suspense key={item._id} fallback={<Loading inline />}> 
                    <ItemCard item={item} />
                </Suspense>
            ))}
        </div>
    )
}
