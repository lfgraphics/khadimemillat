'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import Loading from "@/app/loading"
import { useState, useEffect } from 'react'

export const SearchUsers = () => {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const initialSearch = searchParams.get('search') || ''

    const [loading, setLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState(initialSearch)

    // Watch for route changes to reset loading
    useEffect(() => {
        setLoading(false)
    }, [pathname, searchParams.toString()])

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        router.push(pathname + '?search=' + searchTerm)
    }

    return (
        <div className="flex flex-col w-full items-center justify-center gap-4">
            {loading && <Loading />}
            <form
                onSubmit={handleSubmit}
                className="flex flex-col md:flex-row w-full items-center justify-center md:justify-start gap-2"
            >
                <Input
                    id="search"
                    name="search"
                    type="text"
                    placeholder="Enter username or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full md:w-auto"
                />
                <Button type="submit">
                    Search
                </Button>
            </form>
        </div>
    )
}