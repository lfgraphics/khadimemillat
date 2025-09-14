"use client"

import { usePagination } from "@/components/marketplace/PaginationProvider"
import { ItemList } from "@/components/marketplace/ItemList"

export function MarketplaceContent() {
  const { items, isLoading } = usePagination()

  return (
    <div className="container mx-auto p-6">
      <ItemList items={items} />
      {isLoading && <p className="text-center mt-4">Loading...</p>}
    </div>
  )
}
