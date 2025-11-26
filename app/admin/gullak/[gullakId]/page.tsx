import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { getGullakById } from '@/actions/gullak-actions'
import { 
    ArrowLeft, 
    MapPin, 
    User, 
    Calendar, 
    Edit, 
    ExternalLink,
    Navigation,
    Phone,
    Mail,
    CheckCircle,
    Clock,
    Wrench,
    AlertCircle,
    DollarSign,
    TrendingUp
} from 'lucide-react'
import { getGoogleMapsUrl, geoJSONToLatLng } from '@/utils/geolocation'
import { GULLAK_STATUS_CONFIG } from '@/utils/gullak-constants'
import type { GullakDetailResponse } from '@/types/gullak'



export default async function GullakDetailPage({
    params
}: {
    params: { gullakId: string }
}) {
    const result = await getGullakById(params.gullakId) as GullakDetailResponse
    
    if (!result.success || !result.data) {
        notFound()
    }

    const { gullak, recentCollections } = result.data
    const statusInfo = GULLAK_STATUS_CONFIG[gullak.status as keyof typeof GULLAK_STATUS_CONFIG]
    const StatusIcon = statusInfo.icon
    const { latitude, longitude } = geoJSONToLatLng(gullak.location.coordinates)

    const openInGoogleMaps = () => {
        const url = getGoogleMapsUrl(gullak.location.coordinates)
        window.open(url, '_blank')
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="sm" asChild>
                        <Link href="/admin/gullak">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Gullaks
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
                            Neki Bank Location Details
                        </p>
                    </div>
                    <Button asChild>
                        <Link href={`/admin/gullak/${gullak.gullakId}/edit`}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Gullak
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
                                    <Button 
                                        variant="outline" 
                                        onClick={() => {
                                            const url = getGoogleMapsUrl(gullak.location.coordinates)
                                            window.open(url, '_blank')
                                        }}
                                    >
                                        <ExternalLink className="w-4 h-4 mr-2" />
                                        View on Google Maps
                                    </Button>
                                    <Button 
                                        variant="outline"
                                        onClick={() => {
                                            // For directions, we'd need user location
                                            const url = getGoogleMapsUrl(gullak.location.coordinates)
                                            window.open(url, '_blank')
                                        }}
                                    >
                                        <Navigation className="w-4 h-4 mr-2" />
                                        Get Directions
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Caretaker Information */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <User className="w-5 h-5" />
                                    Caretaker Information
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <h4 className="font-medium mb-2">Name</h4>
                                    <p className="text-muted-foreground">{gullak.caretaker.name}</p>
                                </div>
                                
                                <div>
                                    <h4 className="font-medium mb-2">Phone</h4>
                                    <div className="flex items-center gap-2">
                                        <Phone className="w-4 h-4 text-muted-foreground" />
                                        <a 
                                            href={`tel:${gullak.caretaker.phone}`}
                                            className="text-primary hover:underline"
                                        >
                                            {gullak.caretaker.phone}
                                        </a>
                                    </div>
                                </div>

                                {gullak.caretakerDetails?.email && (
                                    <div>
                                        <h4 className="font-medium mb-2">Email</h4>
                                        <div className="flex items-center gap-2">
                                            <Mail className="w-4 h-4 text-muted-foreground" />
                                            <a 
                                                href={`mailto:${gullak.caretakerDetails.email}`}
                                                className="text-primary hover:underline"
                                            >
                                                {gullak.caretakerDetails.email}
                                            </a>
                                        </div>
                                    </div>
                                )}
                                
                                <div>
                                    <h4 className="font-medium mb-2">Assigned Date</h4>
                                    <p className="text-muted-foreground">
                                        {new Date(gullak.caretaker.assignedAt).toLocaleDateString()}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Additional Information */}
                        {(gullak.description || gullak.notes) && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Additional Information</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {gullak.description && (
                                        <div>
                                            <h4 className="font-medium mb-2">Description</h4>
                                            <p className="text-muted-foreground">{gullak.description}</p>
                                        </div>
                                    )}
                                    
                                    {gullak.notes && (
                                        <div>
                                            <h4 className="font-medium mb-2">Internal Notes</h4>
                                            <p className="text-muted-foreground">{gullak.notes}</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Statistics */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5" />
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

                        {/* Installation Details */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Calendar className="w-5 h-5" />
                                    Installation Details
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div>
                                    <div className="text-sm text-muted-foreground">Installation Date</div>
                                    <div className="font-medium">
                                        {new Date(gullak.installationDate).toLocaleDateString()}
                                    </div>
                                </div>
                                
                                <div>
                                    <div className="text-sm text-muted-foreground">Created By</div>
                                    <div className="font-medium">{gullak.createdBy?.name || 'Unknown'}</div>
                                </div>
                                
                                <div>
                                    <div className="text-sm text-muted-foreground">Created Date</div>
                                    <div className="font-medium">
                                        {new Date(gullak.createdAt).toLocaleDateString()}
                                    </div>
                                </div>
                                
                                {gullak.updatedBy && (
                                    <div>
                                        <div className="text-sm text-muted-foreground">Last Updated By</div>
                                        <div className="font-medium">{gullak.updatedBy.name}</div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Recent Collections */}
                        {recentCollections.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <DollarSign className="w-5 h-5" />
                                        Recent Collections
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {recentCollections.map((collection: any) => (
                                            <div key={collection._id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                                                <div>
                                                    <div className="font-medium">₹{collection.amount.toLocaleString()}</div>
                                                    <div className="text-sm text-muted-foreground">
                                                        {new Date(collection.collectionDate).toLocaleDateString()}
                                                    </div>
                                                </div>
                                                <Badge variant="outline">
                                                    {collection.verificationStatus}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    {recentCollections.length >= 5 && (
                                        <div className="mt-4 text-center">
                                            <Button variant="outline" size="sm" asChild>
                                                <Link href={`/admin/gullak/${gullak.gullakId}/collections`}>
                                                    View All Collections
                                                </Link>
                                            </Button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}