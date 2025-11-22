"use client"

import { useState, useEffect } from "react"
import { usePagination } from "@/components/marketplace/PaginationProvider"
import { ItemList } from "@/components/marketplace/ItemList"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Search, Filter, X, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react"

export function MarketplaceContent() {
  const { items, isLoading, error, filters, pagination, setFilters, setPage, setItemsPerPage, refresh } = usePagination()
  const [searchInput, setSearchInput] = useState(filters.search)
  const [showFilters, setShowFilters] = useState(false)

  // Handle search button click
  const handleSearch = () => {
    if (searchInput !== filters.search) {
      setFilters({ ...filters, search: searchInput })
    }
  }

  // Handle clear search
  const handleClearSearch = () => {
    setSearchInput("")
    if (filters.search) {
      setFilters({ ...filters, search: "" })
    }
  }

  // Handle Enter key press in search input
  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters({ ...filters, [key]: value })
  }

  const clearFilters = () => {
    setFilters({ search: searchInput, condition: "all", priceMin: "", priceMax: "", sortBy: "newest", availability: "all" })
  }

  const hasActiveFilters = filters.condition !== "all" || !!filters.priceMin || !!filters.priceMax || filters.availability !== "all" || filters.sortBy !== "newest"

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-destructive">
          <CardContent className="p-6">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={refresh} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Marketplace</h1>
          <p className="text-muted-foreground">Discover items from our community collection program</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            {!searchInput ? (
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            ) : (
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-1">
                <Button
                  onClick={handleClearSearch}
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 hover:bg-muted"
                >
                  <X className="h-4 w-4" />
                </Button>
                <Button
                  onClick={handleSearch}
                  size="sm"
                  className="h-7 px-2"
                >
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            )}
            <Input
              placeholder="Search items..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyPress={handleSearchKeyPress}
              className={searchInput ? "pl-3 pr-20" : "pl-10"}
            />
          </div>
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="h-4 w-4 mr-2" />
            Filters {hasActiveFilters && <span className="ml-1 bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 text-xs">•</span>}
          </Button>
        </div>

        {/* Active Filters */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-muted-foreground">{pagination.totalItems} results:</span>
            {filters.condition !== "all" && (
              <Badge variant="secondary">
                {filters.condition} <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => handleFilterChange("condition", "all")} />
              </Badge>
            )}
            {filters.availability !== "all" && (
              <Badge variant="secondary">
                {filters.availability} <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => handleFilterChange("availability", "all")} />
              </Badge>
            )}
            {(filters.priceMin || filters.priceMax) && (
              <Badge variant="secondary">
                ₹{filters.priceMin || 0}-{filters.priceMax || '∞'}
                <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => { handleFilterChange("priceMin", ""); handleFilterChange("priceMax", "") }} />
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={clearFilters}>Clear all</Button>
          </div>
        )}

        {/* Filter Controls */}
        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-muted/50 rounded-lg">
            <Select value={filters.condition} onValueChange={(value) => handleFilterChange("condition", value)}>
              <SelectTrigger><SelectValue placeholder="Condition" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All conditions</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="good">Good</SelectItem>
                <SelectItem value="repairable">Repairable</SelectItem>
                <SelectItem value="scrap">Scrap</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.availability} onValueChange={(value) => handleFilterChange("availability", value)}>
              <SelectTrigger><SelectValue placeholder="Availability" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All items</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="sold">Sold</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="number"
              placeholder="Min price"
              value={filters.priceMin}
              onChange={(e) => handleFilterChange("priceMin", e.target.value)}
            />

            <Input
              type="number"
              placeholder="Max price"
              value={filters.priceMax}
              onChange={(e) => handleFilterChange("priceMax", e.target.value)}
            />

            <Select value={filters.sortBy} onValueChange={(value) => handleFilterChange("sortBy", value)}>
              <SelectTrigger><SelectValue placeholder="Sort by" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="oldest">Oldest</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
                <SelectItem value="name-asc">Name: A-Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Items Grid */}
      <ItemList items={items} isLoading={isLoading} hasFilters={hasActiveFilters} />

      {/* Pagination */}
      {!isLoading && pagination.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8">
          <div className="text-sm text-muted-foreground">
            Showing {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1}-{Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of {pagination.totalItems}
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm">Show:</span>
              <Select value={pagination.itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12">12</SelectItem>
                  <SelectItem value="24">24</SelectItem>
                  <SelectItem value="48">48</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={() => setPage(pagination.currentPage - 1)} disabled={pagination.currentPage === 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <span className="px-3 py-1 text-sm">
                {pagination.currentPage} of {pagination.totalPages}
              </span>

              <Button variant="outline" size="sm" onClick={() => setPage(pagination.currentPage + 1)} disabled={pagination.currentPage === pagination.totalPages}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}