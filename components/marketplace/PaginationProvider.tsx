"use client"

import { createContext, useContext, useEffect, useRef } from "react"
import useSWRInfinite from "swr/infinite"

interface PaginationContextValue {
    items: any[]
    isLoading: boolean
    isReachingEnd?: boolean
    error?: string
}

const PaginationContext = createContext<PaginationContextValue | null>(null)

const fetcher = async (url: string) => {
    const res = await fetch(url)
    const ct = res.headers.get('content-type') || ''
    if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`HTTP ${res.status} ${res.statusText}: ${text.slice(0, 120)}`)
    }
    if (!ct.includes('application/json')) {
        const text = await res.text().catch(() => '')
        throw new Error(`Non-JSON response (${ct}): ${text.slice(0, 120)}`)
    }
    return res.json()
}

export function PaginationProvider({ children }: { children: React.ReactNode }) {
    const {
        data,
        size,
        setSize,
        isLoading,
        error,
    } = useSWRInfinite(
        (index, previousPageData) => {
            // stop fetching if no more data
            if (previousPageData && previousPageData.items.length === 0) return null
            return `/api/public/items?page=${index + 1}`
        },
        fetcher,
        { revalidateOnFocus: false }
    )

    const loaderRef = useRef<HTMLDivElement | null>(null)
    const items = data ? data.flatMap((d) => Array.isArray(d.items) ? d.items : []) : []

    const isReachingEnd =
        data && data[data.length - 1]?.items.length === 0

    useEffect(() => {
        if (isReachingEnd) return // don’t observe if no more data

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) setSize((s) => s + 1)
            },
            { threshold: 1.0 }
        )

        if (loaderRef.current) observer.observe(loaderRef.current)
        return () => observer.disconnect()
    }, [isReachingEnd, setSize])

    return (
        <PaginationContext.Provider value={{ items, isLoading, isReachingEnd, error: error ? String(error.message || error) : undefined }}>
            {children}
            {!isReachingEnd && <div ref={loaderRef} className="h-10" />}
        </PaginationContext.Provider>
    )
}

export function usePagination() {
    const ctx = useContext(PaginationContext)
    if (!ctx) throw new Error("usePagination must be used inside PaginationProvider")
    return ctx
}
