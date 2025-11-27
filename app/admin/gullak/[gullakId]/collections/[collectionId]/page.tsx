import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import Image from 'next/image'
import { getGullakById } from '@/actions/gullak-actions'
import { 
    ArrowLeft, 
    DollarSign, 
    Calendar, 
    User, 
    FileText, 
    Camera, 
    CheckCircle, 
    Clock, 
    AlertTriangle,
    Edit,
    Phone
} from 'lucide-react'
import connectDB from '@/lib/db'
import GullakCollection from '@/models/GullakCollection'
import type { GullakDetailResponse } from '@/types/gullak'

async function getCollectionById(collectionId: string) {
    try {
        await connectDB()
        
        const collection = await GullakCollection.findOne({ collectionId })
            .lean()
        
        if (!collection) {
            return { success: false, message: 'Collection not found', data: null }
        }

        return {
            success: true,
            data: JSON.parse(JSON.stringify(collection))
        }
    } catch (error: any) {
        console.error('Error fetching collection:', error)
        return { success: false, message: error.message || 'Failed to fetch collection', data: null }
    }
}

export default async function CollectionDetailPage({
    params
}: {
    params: Promise<{ gullakId: string; collectionId: string }>
}) {
    const { gullakId, collectionId } = await params
    
    const [gullakResult, collectionResult] = await Promise.all([
        getGullakById(gullakId) as Promise<GullakDetailResponse>,
        getCollectionById(collectionId)
    ])
    
    if (!gullakResult.success || !gullakResult.data) {
        notFound()
    }

    if (!collectionResult.success || !collectionResult.data) {
        notFound()
    }

    const { gullak } = gullakResult.data
    const collection = collectionResult.data

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

    const StatusIcon = getStatusIcon(collection.verificationStatus)

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="sm" asChild>
                        <Link href={`/admin/gullak/${gullakId}/collections`}>
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Collections
                        </Link>
                    </Button>
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-3xl font-bold">{collection.collectionId}</h1>
                            <Badge 
                                variant="outline" 
                                className={getStatusColor(collection.verificationStatus)}
                            >
                                <StatusIcon className="w-4 h-4 mr-1" />
                                {collection.verificationStatus}
                            </Badge>
                        </div>
                        <p className="text-muted-foreground">
                            Collection details for {gullak.gullakId}
                        </p>
                    </div>
                    {collection.verificationStatus === 'pending' && (
                        <Button asChild>
                            <Link href={`/admin/gullak/${gullakId}/collections/${collectionId}/verify`}>
                                <Edit className="w-4 h-4 mr-2" />
                                Verify Collection
                            </Link>
                        </Button>
                    )}
                </div>

                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Main Details */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Collection Information */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <DollarSign className="w-5 h-5" />
                                    Collection Information
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <h4 className="font-medium mb-2">Amount Collected</h4>
                                        <p className="text-2xl font-bold text-green-600">
                                            ₹{collection.amount.toLocaleString()}
                                        </p>
                                    </div>
                                    
                                    <div>
                                        <h4 className="font-medium mb-2">Collection Date</h4>
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-muted-foreground" />
                                            <p className="text-muted-foreground">
                                                {new Date(collection.collectionDate).toLocaleDateString('en-IN', {
                                                    weekday: 'long',
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="font-medium mb-2">Gullak Details</h4>
                                    <div className="p-3 bg-muted/50 rounded-lg">
                                        <p className="font-medium">{gullak.gullakId}</p>
                                        <p className="text-sm text-muted-foreground">{gullak.location.address}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Personnel Information */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <User className="w-5 h-5" />
                                    Personnel Information
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <h4 className="font-medium mb-2">Collected By</h4>
                                        <p className="text-muted-foreground">{collection.collectedBy.name}</p>
                                    </div>
                                    
                                    <div>
                                        <h4 className="font-medium mb-2">Caretaker Present</h4>
                                        <p className="text-muted-foreground">{collection.caretakerPresent.name}</p>
                                    </div>
                                </div>

                                {collection.witnesses && collection.witnesses.length > 0 && (
                                    <div>
                                        <h4 className="font-medium mb-2">Witnesses</h4>
                                        <div className="space-y-2">
                                            {collection.witnesses.map((witness: any, index: number) => (
                                                <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                                                    <User className="w-4 h-4 text-muted-foreground" />
                                                    <span>{witness.name}</span>
                                                    {witness.phone && (
                                                        <>
                                                            <Phone className="w-3 h-3 text-muted-foreground ml-2" />
                                                            <span className="text-sm text-muted-foreground">{witness.phone}</span>
                                                        </>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Photos */}
                        {collection.photos && collection.photos.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Camera className="w-5 h-5" />
                                        Collection Photos
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {collection.photos.map((photo: string, index: number) => (
                                            <div key={index} className="relative aspect-square rounded-lg overflow-hidden border">
                                                <Image
                                                    src={photo}
                                                    alt={`Collection photo ${index + 1}`}
                                                    fill
                                                    className="object-cover"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Notes */}
                        {collection.notes && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <FileText className="w-5 h-5" />
                                        Collection Notes
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-muted-foreground whitespace-pre-wrap">{collection.notes}</p>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Verification Status */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <StatusIcon className="w-5 h-5" />
                                    Verification Status
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="text-center p-4 bg-muted/50 rounded-lg">
                                    <Badge 
                                        variant="outline" 
                                        className={`${getStatusColor(collection.verificationStatus)} text-lg px-4 py-2`}
                                    >
                                        <StatusIcon className="w-4 h-4 mr-2" />
                                        {collection.verificationStatus.toUpperCase()}
                                    </Badge>
                                </div>
                                
                                {collection.verifiedBy && (
                                    <div className="space-y-2">
                                        <div>
                                            <p className="text-sm text-muted-foreground">Verified By</p>
                                            <p className="font-medium">{collection.verifiedBy.name}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Verified On</p>
                                            <p className="font-medium">
                                                {new Date(collection.verifiedBy.verifiedAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                        {collection.verifiedBy.notes && (
                                            <div>
                                                <p className="text-sm text-muted-foreground">Verification Notes</p>
                                                <p className="text-sm">{collection.verifiedBy.notes}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Record Information */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Record Information</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div>
                                    <div className="text-sm text-muted-foreground">Collection ID</div>
                                    <div className="font-medium font-mono">{collection.collectionId}</div>
                                </div>
                                
                                <div>
                                    <div className="text-sm text-muted-foreground">Created On</div>
                                    <div className="font-medium">
                                        {new Date(collection.createdAt).toLocaleDateString()}
                                    </div>
                                </div>
                                
                                <div>
                                    <div className="text-sm text-muted-foreground">Last Updated</div>
                                    <div className="font-medium">
                                        {new Date(collection.updatedAt).toLocaleDateString()}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Actions */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Actions</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {collection.verificationStatus === 'pending' && (
                                    <Button className="w-full" asChild>
                                        <Link href={`/admin/gullak/${gullakId}/collections/${collectionId}/verify`}>
                                            <CheckCircle className="w-4 h-4 mr-2" />
                                            Verify Collection
                                        </Link>
                                    </Button>
                                )}
                                
                                <Button variant="outline" className="w-full" asChild>
                                    <Link href={`/admin/gullak/${gullakId}`}>
                                        <ArrowLeft className="w-4 h-4 mr-2" />
                                        View Gullak Details
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