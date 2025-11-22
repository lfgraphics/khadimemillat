"use client"

import { createContext, useContext, useState, useCallback } from "react"
import useSWR from "swr"
import { useRouter, useSearchParams, usePathname } from "next/navigation"

export interface MarketplaceFilters {
    search: string
    condition: string
    priceMin: string
    priceMax: string
    sortBy: string
    availability: string
}

interface PaginationContextValue {
    items: any[]
    isLoading: boolean
    error?: string
    filters: MarketplaceFilters
    pagination: {
        currentPage: number
        totalPages: number
        totalItems: number
        itemsPerPage: number
    }
    setFilters: (filters: MarketplaceFilters) => void
    setPage: (page: number) => void
    setItemsPerPage: (itemsPerPage: number) => void
    refresh: () => void
}

const PaginationContext = createContext<PaginationContextValue | null>(null)

const fetcher = async (url: string) => {
    const res = await fetch(url)
    if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`HTTP ${res.status} ${res.statusText}: ${text.slice(0, 120)}`)
    }
    return res.json()
}

const defaultFilters: MarketplaceFilters = {
    search: "",
    condition: "all",
    priceMin: "",
    priceMax: "",
    sortBy: "newest",
    availability: "all"
}

export function PaginationProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    
    // Initialize from URL
    const [filters, setFiltersState] = useState<MarketplaceFilters>({
        search: searchParams.get('q') || "",
        condition: searchParams.get('condition') || "all",
        priceMin: searchParams.get('priceMin') || "",
        priceMax: searchParams.get('priceMax') || "",
        sortBy: searchParams.get('sortBy') || "newest",
        availability: searchParams.get('availability') || "all"
    })
    const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1)
    const [itemsPerPage, setItemsPerPageState] = useState(Number(searchParams.get('limit')) || 24)

    // Build API URL
    const buildApiUrl = useCallback(() => {
        const params = new URLSearchParams({
            page: currentPage.toString(),
            limit: itemsPerPage.toString(),
        })
        if (filters.search) params.set('q', filters.search)
        if (filters.condition !== 'all') params.set('condition', filters.condition)
        if (filters.priceMin) params.set('priceMin', filters.priceMin)
        if (filters.priceMax) params.set('priceMax', filters.priceMax)
        if (filters.sortBy !== 'newest') params.set('sortBy', filters.sortBy)
        if (filters.availability !== 'all') params.set('availability', filters.availability)
        return `/api/public/items?${params.toString()}`
    }, [filters, currentPage, itemsPerPage])

    const { data, error, isLoading, mutate } = useSWR(buildApiUrl(), fetcher, {
        revalidateOnFocus: false,
        refreshInterval: 30000,
        keepPreviousData: true
    })

    // Update URL
    const updateUrl = useCallback((newFilters: MarketplaceFilters, page: number, limit: number) => {
        const params = new URLSearchParams()
        if (newFilters.search) params.set('q', newFilters.search)
        if (newFilters.condition !== 'all') params.set('condition', newFilters.condition)
        if (newFilters.priceMin) params.set('priceMin', newFilters.priceMin)
        if (newFilters.priceMax) params.set('priceMax', newFilters.priceMax)
        if (newFilters.sortBy !== 'newest') params.set('sortBy', newFilters.sortBy)
        if (newFilters.availability !== 'all') params.set('availability', newFilters.availability)
        if (page > 1) params.set('page', page.toString())
        if (limit !== 24) params.set('limit', limit.toString())
        
        const query = params.toString() ? `?${params.toString()}` : ''
        router.push(`${pathname}${query}`, { scroll: false })
    }, [router, pathname])

    const setFilters = useCallback((newFilters: MarketplaceFilters) => {
        setFiltersState(newFilters)
        setCurrentPage(1)
        updateUrl(newFilters, 1, itemsPerPage)
    }, [updateUrl, itemsPerPage])

    const setItemsPerPage = useCallback((newItemsPerPage: number) => {
        setItemsPerPageState(newItemsPerPage)
        setCurrentPage(1)
        updateUrl(filters, 1, newItemsPerPage)
    }, [updateUrl, filters])

    const setPage = useCallback((page: number) => {
        setCurrentPage(page)
        updateUrl(filters, page, itemsPerPage)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }, [updateUrl, filters, itemsPerPage])

    return (
        <PaginationContext.Provider value={{
            items: data?.items || [],
            isLoading,
            error: error ? String(error.message || error) : undefined,
            filters,
            pagination: {
                currentPage,
                totalPages: data?.totalPages || 0,
                totalItems: data?.total || 0,
                itemsPerPage
            },
            setFilters,
            setPage,
            setItemsPerPage,
            refresh: mutate
        }}>
            {children}
        </PaginationContext.Provider>
    )
}

export function usePagination() {
    const ctx = useContext(PaginationContext)
    if (!ctx) throw new Error("usePagination must be used inside PaginationProvider")
    return ctx
}