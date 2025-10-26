'use client'

import { useState } from 'react'
import Link from "next/link"
import Image from "next/image"
import { AnimatedSection } from '@/components/animations'
import { getDynamicIcon } from '@/lib/iconUtils'
import MarkdownRenderer from '@/components/MarkdownRenderer'
import { Button } from '@/components/ui/button'
import { WelfareProgramWithStats } from '@/server/welfare-programs'

interface WelfareProgramsClientProps {
    initialPrograms: WelfareProgramWithStats[]
    totalCount: number
    initialLimit: number
}

export default function WelfareProgramsClient({
    initialPrograms,
    totalCount,
    initialLimit
}: WelfareProgramsClientProps) {
    const [programs, setPrograms] = useState(initialPrograms)
    const [loading, setLoading] = useState(false)
    const [currentLimit, setCurrentLimit] = useState(initialLimit)

    const hasMore = programs.length < totalCount

    const loadMore = async () => {
        if (loading || !hasMore) return

        setLoading(true)
        try {
            const response = await fetch(`/api/welfare-programs?limit=3&skip=${programs.length}&includeStats=true`)
            if (response.ok) {
                const newPrograms = await response.json()
                setPrograms(prev => [...prev, ...newPrograms])
                setCurrentLimit(prev => prev + 3)
            }
        } catch (error) {
            console.error('Error loading more programs:', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <AnimatedSection
                variant="fade"
                delay={0.1}
                duration={0.5}
                threshold={0.2}
            >
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4" data-testid="programs-title">
                        Our Welfare Programs
                    </h2>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto" data-testid="programs-description">
                        Supporting communities through various initiatives funded by our sustainable scrap collection operations
                    </p>
                </div>
            </AnimatedSection>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {programs.map((program, index) => {
                    const IconComponent = getDynamicIcon(program.icon)

                    return (
                        <AnimatedSection
                            key={program._id}
                            variant="slideUp"
                            delay={0.2 + (index * 0.15)}
                            duration={0.5}
                            threshold={0.2}
                            className="h-full"
                        >
                            <div className="bg-card rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow h-full flex flex-col" data-testid={`program-${program.title.toLowerCase().replace(/\s+/g, '-')}`}>
                                <Link href={`/welfare-programs/${program.slug}`} className="block flex-1">
                                    <div className="relative h-48 w-full">
                                        {program.coverImage ? (
                                            <Image
                                                src={program.coverImage}
                                                alt={program.title}
                                                fill
                                                className="object-cover"
                                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                            />
                                        ) : (
                                            <div
                                                className="w-full h-full flex items-center justify-center"
                                                style={{ backgroundColor: `${program.iconColor}20` }}
                                            >
                                                <IconComponent
                                                    className="h-16 w-16"
                                                    style={{ color: program.iconColor }}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-6">
                                        <div className="flex items-center mb-3">
                                            <div
                                                className="w-10 h-10 rounded-lg flex items-center justify-center mr-3"
                                                style={{ backgroundColor: `${program.iconColor}20` }}
                                            >
                                                <IconComponent
                                                    className="h-5 w-5"
                                                    style={{ color: program.iconColor }}
                                                />
                                            </div>
                                            <h3 className="text-xl font-semibold text-foreground">{program.title}</h3>
                                        </div>

                                        <div className="text-muted-foreground mb-4">
                                            <MarkdownRenderer
                                                content={program.description}
                                                className="text-sm line-clamp-3"
                                            />
                                        </div>

                                        <div className="flex items-center justify-between text-sm text-primary">
                                            <div className="flex items-center">
                                                <IconComponent className="mr-2 h-4 w-4" />
                                                <span>{program.totalSupporters} supporters</span>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-semibold">₹{program.totalRaised.toLocaleString()}</div>
                                                <div className="text-xs text-muted-foreground">{program.totalCampaigns} campaigns</div>
                                            </div>
                                        </div>
                                    </div>
                                </Link>

                                <div className="p-6 pt-0">
                                    <Button asChild className="w-full" variant="secondary" data-testid={`donate-${program.slug}`}>
                                        <Link href={`/donate?program=${encodeURIComponent(program.slug)}`}>
                                            Donate Now
                                        </Link>
                                    </Button>
                                </div>
                            </div>
                        </AnimatedSection>
                    )
                })}
            </div>

            {programs.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-muted-foreground">No welfare programs available at the moment.</p>
                </div>
            )}

            {hasMore && (
                <div className="text-center mt-12">
                    <Link href="/welfare-programs">
                        <Button
                            onClick={loadMore}
                            disabled={loading}
                            variant="outline"
                            size="lg"
                            className="px-8 cursor-pointer"
                        >
                            {loading ? 'Loading...' : 'View More Programs'}
                        </Button>
                    </Link>
                </div>
            )}
        </div>
    )
}