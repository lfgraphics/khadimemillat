import { Suspense } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import connectDB from '@/lib/db'
import Gullak from '@/models/Gullak'
import { GullakMap } from '@/app/admin/gullak/components/GullakMap'
import { MapPin, Heart, Users, DollarSign } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Find Neki Bank (Gullak) Locations - Khadim-e-Millat',
    description: 'Locate the nearest Neki Bank (Gullak) contribution points in your area. Small contributions, big impact.',
    keywords: 'neki bank, gullak, donation points, charity locations, contribution centers'
}

async function getPublicGullaks() {
    await connectDB()
    
    const gullaks = await Gullak.find({ 
        status: 'active' // Only show active Gullaks to public
    })
    .populate('caretaker.userId', 'name phone')
    .select('gullakId location caretaker status totalCollections totalAmountCollected')
    .lean()

    // Serialize the data to ensure proper JSON serialization
    return JSON.parse(JSON.stringify(gullaks))
}

export default async function GullakMapPage() {
    const gullaks = await getPublicGullaks()

    return (
        <div className="min-h-screen bg-background">
            {/* Hero Section */}
            <section className="py-16 md:py-24 bg-gradient-to-br from-primary/10 via-purple-500/5 to-background">
                <div className="container mx-auto px-4">
                    <div className="max-w-4xl mx-auto text-center">
                        <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
                            <MapPin className="w-4 h-4 mr-2" />
                            Neki Bank Locations
                        </Badge>
                        <h1 className="text-4xl md:text-5xl lg:text-6xl mb-6">
                            Find Your Nearest
                            <span className="block text-primary mt-2">Neki Bank (Gullak)</span>
                        </h1>
                        <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
                            Discover Neki Bank locations in your area. Every small contribution helps build a stronger community 
                            and supports those in need through our transparent welfare system.
                        </p>
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section className="py-12 bg-muted/30">
                <div className="container mx-auto px-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                        <Card>
                            <CardContent className="p-6 text-center">
                                <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
                                    <MapPin className="w-6 h-6 text-primary" />
                                </div>
                                <h3 className="text-2xl font-bold mb-2">{gullaks.length}</h3>
                                <p className="text-muted-foreground">Active Locations</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-6 text-center">
                                <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                                    <Users className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <h3 className="text-2xl font-bold mb-2">
                                    {gullaks.reduce((sum: number, g: any) => sum + g.totalCollections, 0)}
                                </h3>
                                <p className="text-muted-foreground">Total Collections</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-6 text-center">
                                <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
                                    <DollarSign className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                                </div>
                                <h3 className="text-2xl font-bold mb-2">
                                    ₹{gullaks.reduce((sum: number, g: any) => sum + g.totalAmountCollected, 0).toLocaleString()}
                                </h3>
                                <p className="text-muted-foreground">Total Contributed</p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </section>

            {/* Map Section */}
            <section className="py-16 md:py-24">
                <div className="container mx-auto px-4">
                    <div className="max-w-6xl mx-auto">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl md:text-4xl mb-4">Locate Neki Banks Near You</h2>
                            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                                Find the most convenient Neki Bank location and start contributing to your community's welfare.
                            </p>
                        </div>

                        <Suspense fallback={
                            <Card>
                                <CardContent className="p-8 text-center">
                                    <div className="animate-pulse">
                                        <div className="w-12 h-12 bg-muted rounded-full mx-auto mb-4"></div>
                                        <div className="h-4 bg-muted rounded w-48 mx-auto mb-2"></div>
                                        <div className="h-3 bg-muted rounded w-32 mx-auto"></div>
                                    </div>
                                </CardContent>
                            </Card>
                        }>
                            <GullakMap gullaks={gullaks} />
                        </Suspense>
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section className="py-16 md:py-24 bg-muted/30">
                <div className="container mx-auto px-4">
                    <div className="max-w-4xl mx-auto">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl md:text-4xl mb-4">How Neki Bank Works</h2>
                            <p className="text-lg text-muted-foreground">
                                Simple, transparent, and impactful community contribution system
                            </p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-8">
                            {[
                                {
                                    step: "1",
                                    title: "Find Location",
                                    description: "Use our map to locate the nearest Neki Bank in your area",
                                    icon: MapPin
                                },
                                {
                                    step: "2", 
                                    title: "Contribute",
                                    description: "Drop your contribution in the secure Gullak box at your convenience",
                                    icon: Heart
                                },
                                {
                                    step: "3",
                                    title: "Impact",
                                    description: "Your contribution is collected transparently and used for verified welfare programs",
                                    icon: Users
                                }
                            ].map((item, index) => (
                                <Card key={index}>
                                    <CardContent className="p-6 text-center">
                                        <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
                                            <item.icon className="w-8 h-8 text-primary" />
                                        </div>
                                        <div className="w-8 h-8 mx-auto rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold mb-4">
                                            {item.step}
                                        </div>
                                        <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                                        <p className="text-muted-foreground">{item.description}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Call to Action */}
            <section className="py-16 md:py-24">
                <div className="container mx-auto px-4">
                    <Card className="max-w-4xl mx-auto bg-gradient-to-br from-primary to-purple-500 border-0">
                        <CardContent className="p-8 md:p-12 text-center">
                            <Heart className="w-16 h-16 text-white mx-auto mb-6" />
                            <h2 className="text-3xl md:text-4xl text-white mb-4">
                                Every Contribution Counts
                            </h2>
                            <p className="text-lg text-white/90 mb-8 max-w-2xl mx-auto">
                                Join thousands of community members who are making a difference through small, 
                                regular contributions to our transparent welfare system.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <a 
                                    href="#map" 
                                    className="inline-flex items-center justify-center px-6 py-3 bg-white text-primary rounded-lg font-semibold hover:bg-white/90 transition-colors"
                                >
                                    <MapPin className="w-5 h-5 mr-2" />
                                    Find Nearest Location
                                </a>
                                <a 
                                    href="/contribute" 
                                    className="inline-flex items-center justify-center px-6 py-3 border-2 border-white text-white rounded-lg font-semibold hover:bg-white/10 transition-colors"
                                >
                                    Learn More Ways to Help
                                </a>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </section>
        </div>
    )
}