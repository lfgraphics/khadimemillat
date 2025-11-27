import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { getGullakById, getGullakCollections } from '@/actions/gullak-actions'
import { 
    ArrowLeft, 
    MapPin, 
    DollarSign, 
    Calendar, 
    Plus,
    Eye,
    Phone,
    ExternalLink,
    Navigation,
    FileText,
    CheckCircle,
    Clock,
    AlertTriangle
} from 'lucide-react'
import { getGoogleMapsUrl, geoJSONToLatLng } from '@/utils/geolocation'
import { GULLAK_STATUS_CONFIG } from '@/utils/gullak-constants'
import type { GullakDetailResponse } from '@/types/gullak'

export default async function CaretakerGullakDetailPage({
    params
}: {
    params: Promise<{ gullakId: string }>
}) {
    const { userId, sessionClaims } = await auth()
    const { gullakId } = await params
    
    if (!userId) {
        redirect('/sign-in')
    }
    
    // Check if user has permission to access gullak operations
    const userRole = sessionClaims?.metadata?.role as string
    const userRoles = (sessionClaims?.metadata as any)?.roles as string[] || []
    const allRoles = [...(userRoles || []), ...(userRole ? [userRole] : [])]
    const authorizedRoles = ['gullak_caretaker', 'admin', 'moderator', 'neki_bank_manager']
    
    if (!allRoles.some(role => authorizedRoles.includes(role))) {
        redirect('/unauthorized')
    }
    
    const [gullakResult, collectionsResult] = await Promise.all([
        getGullakById(gullakId) as Promise<GullakDetailResponse>,
        getGullakCollections(gullakId, 1, 5)
    ])
    
    if (!gullakResult.success || !gullakResult.data) {
        notFound()
    }
    
    const { gullak } = gullakResult.data
    
    // Check if this caretaker is assigned to this gullak (only for caretakers, not admins)
    const isCaretaker = allRoles.includes('gullak_caretaker') && !allRoles.includes('admin') && !allRoles.includes('moderator') && !allRoles.includes('neki_bank_manager')
    if (isCaretaker && gullak.caretaker.userId !== userId) {
        redirect('/unauthorized')
    }
    
    const recentCollections = collectionsResult.success ? collectionsResult.data?.collections || [] : []
    const statusInfo = GULLAK_STATUS_CONFIG[gullak.status as keyof typeof GULLAK_STATUS_CONFIG]
    const StatusIcon = statusInfo.icon
    const { latitude, longitude } = geoJSONToLatLng(gullak.location.coordinates)

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'verified': return CheckCircle
            case 'disputed': return AlertTriangle
            default: return Clock
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'verified': return 'text-green-600 bg-green-50 border-green-200'
            case 'disputed': return 'text-red-600 bg-red-50 border-red-200'
            default: return 'text-yellow-600 bg-yellow-50 border-yellow-200'
        }
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="sm" asChild>
                        <Link href="/gullak-caretaker">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Dashboard
                        </Link>
                    </Button>
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-3xl font-bold">{gullak.gullakId}</h1>
                            <Badge 
                                variant="outline" 
                                className={`${statusInfo.bg} ${statusInfo.color} border-current`}
                            >
                                <StatusIcon className="w-4 h-4 mr-1" />
                                {statusInfo.label}
                            </Badge>
                        </div>
                        <p className="text-muted-foreground">
                            Your assigned Neki Bank location
                        </p>
                    </div>
                    <Button asChild>
                        <Link href={`/gullak-caretaker/gullak/${gullak.gullakId}/report-collection`}>
                            <Plus className="w-4 h-4 mr-2" />
                            Request Collection
                        </Link>
                    </Button>
                </div>

                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Main Details */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Location Information */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <MapPin className="w-5 h-5" />
                                    Location Information
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <h4 className="font-medium mb-2">Address</h4>
                                    <p className="text-muted-foreground">{gullak.location.address}</p>
                                </div>
                                
                                {gullak.location.landmark && (
                                    <div>
                                        <h4 className="font-medium mb-2">Landmark</h4>
                                        <p className="text-muted-foreground">{gullak.location.landmark}</p>
                                    </div>
                                )}
                                
                                <div>
                                    <h4 className="font-medium mb-2">Coordinates</h4>
                                    <p className="text-muted-foreground font-mono text-sm">
                                        {latitude.toFixed(6)}, {longitude.toFixed(6)}
                                    </p>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-2 pt-4">
                                    <Button variant="outline" asChild>
                                        <Link 
                                            href={getGoogleMapsUrl(gullak.location.coordinates)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <ExternalLink className="w-4 h-4 mr-2" />
                                            View on Google Maps
                                        </Link>
                                    </Button>
                                    <Button variant="outline" asChild>
                                        <Link 
                                            href={`https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <Navigation className="w-4 h-4 mr-2" />
                                            Get Directions
                                        </Link>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Recent Collections */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <DollarSign className="w-5 h-5" />
                                    Recent Collections
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {recentCollections.length === 0 ? (
                                    <div className="text-center py-8">
                                        <DollarSign className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                                        <h3 className="text-lg font-semibold mb-2">No Collections Yet</h3>
                                        <p className="text-muted-foreground mb-4">
                                            No collections have been recorded for this Gullak yet.
                                        </p>
                                        <Button asChild>
                                            <Link href={`/gullak-caretaker/gullak/${gullak.gullakId}/report-collection`}>
                                                <Plus className="w-4 h-4 mr-2" />
                                                Request First Collection
                                            </Link>
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {recentCollections.map((collection: any) => {
                                            const StatusIcon = getStatusIcon(collection.verificationStatus)
                                            
                                            return (
                                                <div key={collection._id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <div className="font-medium">₹{collection.amount.toLocaleString()}</div>
                                                            <Badge 
                                                                variant="outline" 
                                                                className={getStatusColor(collection.verificationStatus)}
                                                            >
                                                                <StatusIcon className="w-3 h-3 mr-1" />
                                                                {collection.verificationStatus}
                                                            </Badge>
                                                        </div>
                                                        <div className="text-sm text-muted-foreground">
                                                            {new Date(collection.collectionDate).toLocaleDateString()}
                                                        </div>
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {collection.verificationStatus === 'pending' ? 'Awaiting admin collection' : 'Completed'}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                        
                                        <div className="text-center pt-4 space-y-2">
                                            <Button size="sm" asChild className="w-full">
                                                <Link href={`/gullak-caretaker/gullak/${gullak.gullakId}/report-collection`}>
                                                    <Plus className="w-4 h-4 mr-2" />
                                                    Request New Collection
                                                </Link>
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Statistics */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <DollarSign className="w-5 h-5" />
                                    Statistics
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="text-center p-4 bg-muted/50 rounded-lg">
                                    <div className="text-2xl font-bold">{gullak.totalCollections}</div>
                                    <div className="text-sm text-muted-foreground">Total Collections</div>
                                </div>
                                
                                <div className="text-center p-4 bg-muted/50 rounded-lg">
                                    <div className="text-2xl font-bold">
                                        ₹{gullak.totalAmountCollected.toLocaleString()}
                                    </div>
                                    <div className="text-sm text-muted-foreground">Total Amount</div>
                                </div>
                                
                                <div className="text-center p-4 bg-muted/50 rounded-lg">
                                    <div className="text-sm text-muted-foreground">Last Collection</div>
                                    <div className="font-medium">
                                        {gullak.lastCollectionDate 
                                            ? new Date(gullak.lastCollectionDate).toLocaleDateString()
                                            : 'Never'
                                        }
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Quick Actions */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Quick Actions</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <Button className="w-full" asChild>
                                    <Link href={`/gullak-caretaker/gullak/${gullak.gullakId}/report-collection`}>
                                        <Plus className="w-4 h-4 mr-2" />
                                        Request Collection
                                    </Link>
                                </Button>
                                
                                <Button variant="outline" className="w-full" asChild>
                                    <Link href={`/gullak-caretaker/collections?gullak=${gullak.gullakId}`}>
                                        <FileText className="w-4 h-4 mr-2" />
                                        View All Collections
                                    </Link>
                                </Button>
                                
                                <Button variant="outline" className="w-full" asChild>
                                    <Link href="/programs/golak-map">
                                        <MapPin className="w-4 h-4 mr-2" />
                                        View Map
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    )
}