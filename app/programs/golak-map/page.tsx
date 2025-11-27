import { Suspense } from 'react'
import connectDB from '@/lib/db'
import Gullak from '@/models/Gullak'
import { GullakMap } from '@/app/admin/gullak/components/GullakMap'
import { MapPin, Users, DollarSign } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Find Neki Bank (Gullak) Locations - Khadim-e-Millat',
    description: 'Locate the nearest Neki Bank (Gullak) contribution points in your area. Small contributions, big impact.',
    keywords: 'neki bank, gullak, donation points, charity locations, contribution centers'
}

async function getPublicGullaks() {
    await connectDB()
    
    const gullaks = await Gullak.find({ 
        status: { $in: ['active', 'full'] } // Show both active and full Gullaks to public
    })
    .populate('caretaker.userId', 'name phone')
    .select('gullakId location caretaker status totalCollections totalAmountCollected image description installationDate')
    .lean()

    // Serialize the data to ensure proper JSON serialization
    return JSON.parse(JSON.stringify(gullaks))
}

export default async function GullakMapPage() {
    const gullaks = await getPublicGullaks()
    
    const totalCollections = gullaks.reduce((sum: number, g: any) => sum + g.totalCollections, 0)
    const totalAmount = gullaks.reduce((sum: number, g: any) => sum + g.totalAmountCollected, 0)

    return (
        <div className="min-h-screen bg-background mx-auto container">
            {/* Header with minimal stats */}
            <div className="bg-gradient-to-r from-primary/5 to-purple-500/5 border-b">
                <div className="container mx-auto px-4 py-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold">Neki Bank Locations</h1>
                            <p className="text-muted-foreground">Find and contribute to community Gullaks</p>
                        </div>
                        <div className="flex gap-6 text-sm">
                            <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-primary" />
                                <span className="font-semibold">{gullaks.length}</span>
                                <span className="text-muted-foreground">Locations</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-emerald-600" />
                                <span className="font-semibold">{totalCollections}</span>
                                <span className="text-muted-foreground">Collections</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <DollarSign className="w-4 h-4 text-amber-600" />
                                <span className="font-semibold">₹{totalAmount.toLocaleString()}</span>
                                <span className="text-muted-foreground">Contributed</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Map - Full screen */}
            <div className="flex-1">
                <Suspense fallback={
                    <div className="h-[calc(100vh-120px)] flex items-center justify-center">
                        <div className="animate-pulse text-center">
                            <MapPin className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                            <p className="text-muted-foreground">Loading map...</p>
                        </div>
                    </div>
                }>
                    <div className="min-h-screen pb-4 container">
                        <GullakMap gullaks={gullaks} />
                    </div>
                </Suspense>
            </div>
        </div>
    )
}