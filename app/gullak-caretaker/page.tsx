import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import connectDB from '@/lib/db'
import Gullak from '@/models/Gullak'
import GullakCollection from '@/models/GullakCollection'
import { 
    MapPin, 
    DollarSign, 
    Calendar, 
    TrendingUp, 
    Plus,
    Eye,
    AlertCircle,
    CheckCircle
} from 'lucide-react'

async function getCaretakerGullaks(userId: string) {
    await connectDB()
    
    const gullaks = await Gullak.find({ 'caretaker.userId': userId })
        .select('gullakId location status totalCollections totalAmountCollected lastCollectionDate')
        .lean()
    
    return JSON.parse(JSON.stringify(gullaks))
}

async function getCaretakerStats(userId: string) {
    await connectDB()
    
    const gullaks = await Gullak.find({ 'caretaker.userId': userId })
    const gullakIds = gullaks.map(g => g.gullakId)
    
    const [totalGullaks, totalCollections, pendingVerifications, thisMonthCollections] = await Promise.all([
        Gullak.countDocuments({ 'caretaker.userId': userId }),
        GullakCollection.countDocuments({ gullakReadableId: { $in: gullakIds } }),
        GullakCollection.countDocuments({ 
            gullakReadableId: { $in: gullakIds }, 
            verificationStatus: 'pending' 
        }),
        GullakCollection.countDocuments({
            gullakReadableId: { $in: gullakIds },
            collectionDate: {
                $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
            }
        })
    ])
    
    return {
        totalGullaks,
        totalCollections,
        pendingVerifications,
        thisMonthCollections
    }
}

export default async function GullakCaretakerDashboard() {
    const { userId, sessionClaims } = await auth()
    
    if (!userId) {
        redirect('/sign-in')
    }
    
    // Check if user has gullak_caretaker role
    const userRole = sessionClaims?.metadata?.role as string
    const userRoles = (sessionClaims?.metadata as any)?.roles as string[] || []
    const allRoles = [...(userRoles || []), ...(userRole ? [userRole] : [])]
    
    if (!allRoles.includes('gullak_caretaker')) {
        redirect('/unauthorized')
    }
    
    const [gullaks, stats] = await Promise.all([
        getCaretakerGullaks(userId),
        getCaretakerStats(userId)
    ])
    
    return (
        <div className="container mx-auto px-4 py-8">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold">Gullak Caretaker Dashboard</h1>
                    <p className="text-muted-foreground">
                        Manage your assigned Neki Bank (Gullak) locations
                    </p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center gap-3">
                                <MapPin className="w-8 h-8 text-blue-600" />
                                <div>
                                    <p className="text-2xl font-bold">{stats.totalGullaks}</p>
                                    <p className="text-sm text-muted-foreground">Assigned Gullaks</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center gap-3">
                                <DollarSign className="w-8 h-8 text-green-600" />
                                <div>
                                    <p className="text-2xl font-bold">{stats.totalCollections}</p>
                                    <p className="text-sm text-muted-foreground">Total Collections</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center gap-3">
                                <Calendar className="w-8 h-8 text-purple-600" />
                                <div>
                                    <p className="text-2xl font-bold">{stats.thisMonthCollections}</p>
                                    <p className="text-sm text-muted-foreground">This Month</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center gap-3">
                                <AlertCircle className="w-8 h-8 text-yellow-600" />
                                <div>
                                    <p className="text-2xl font-bold">{stats.pendingVerifications}</p>
                                    <p className="text-sm text-muted-foreground">Pending Verification</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* My Gullaks */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MapPin className="w-5 h-5" />
                            My Assigned Gullaks
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {gullaks.length === 0 ? (
                            <div className="text-center py-8">
                                <MapPin className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                                <h3 className="text-lg font-semibold mb-2">No Gullaks Assigned</h3>
                                <p className="text-muted-foreground">
                                    You don't have any Gullaks assigned to you yet. Contact your administrator.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {gullaks.map((gullak: any) => (
                                    <div 
                                        key={gullak._id}
                                        className="p-4 border rounded-lg hover:border-primary/50 transition-colors"
                                    >
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h3 className="font-semibold">{gullak.gullakId}</h3>
                                                    <Badge 
                                                        variant={gullak.status === 'active' ? 'default' : 'secondary'}
                                                    >
                                                        {gullak.status}
                                                    </Badge>
                                                </div>
                                                
                                                <div className="space-y-1 text-sm text-muted-foreground">
                                                    <p className="flex items-start gap-2">
                                                        <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                                        <span>{gullak.location.address}</span>
                                                    </p>
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 ml-6">
                                                        <span>Collections: {gullak.totalCollections}</span>
                                                        <span>Amount: ₹{gullak.totalAmountCollected?.toLocaleString() || 0}</span>
                                                        <span>
                                                            Last: {gullak.lastCollectionDate 
                                                                ? new Date(gullak.lastCollectionDate).toLocaleDateString()
                                                                : 'Never'
                                                            }
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="flex flex-col sm:flex-row gap-2">
                                                <Button variant="outline" size="sm" asChild>
                                                    <Link href={`/gullak-caretaker/gullak/${gullak.gullakId}`}>
                                                        <Eye className="w-4 h-4 mr-1" />
                                                        View
                                                    </Link>
                                                </Button>
                                                <Button size="sm" asChild>
                                                    <Link href={`/gullak-caretaker/gullak/${gullak.gullakId}/report-collection`}>
                                                        <Plus className="w-4 h-4 mr-1" />
                                                        Report Collection
                                                    </Link>
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card>
                    <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Button variant="outline" asChild className="h-auto p-4">
                                <Link href="/programs/golak-map">
                                    <div className="text-center">
                                        <MapPin className="w-8 h-8 mx-auto mb-2" />
                                        <div className="font-medium">View Map</div>
                                        <div className="text-sm text-muted-foreground">See all Gullak locations</div>
                                    </div>
                                </Link>
                            </Button>
                            
                            <Button variant="outline" asChild className="h-auto p-4">
                                <Link href="/gullak-caretaker/collections">
                                    <div className="text-center">
                                        <TrendingUp className="w-8 h-8 mx-auto mb-2" />
                                        <div className="font-medium">My Collections</div>
                                        <div className="text-sm text-muted-foreground">View collection history</div>
                                    </div>
                                </Link>
                            </Button>
                            
                            <Button variant="outline" asChild className="h-auto p-4">
                                <Link href="/gullak-caretaker/help">
                                    <div className="text-center">
                                        <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                                        <div className="font-medium">Help & Support</div>
                                        <div className="text-sm text-muted-foreground">Get assistance</div>
                                    </div>
                                </Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}