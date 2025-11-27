import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { getGullakById, getGullakCollections } from '@/actions/gullak-actions'
import { 
    ArrowLeft, 
    Plus, 
    DollarSign, 
    Calendar, 
    User, 
    CheckCircle, 
    Clock, 
    AlertTriangle,
    Eye,
    FileText
} from 'lucide-react'
import type { GullakDetailResponse } from '@/types/gullak'

interface CollectionListResponse {
    success: boolean
    data?: {
        collections: any[]
        pagination: {
            page: number
            limit: number
            total: number
            pages: number
        }
    }
    message?: string
}

export default async function GullakCollectionsPage({
    params,
    searchParams
}: {
    params: Promise<{ gullakId: string }>
    searchParams: Promise<{ page?: string }>
}) {
    const { gullakId } = await params
    const { page } = await searchParams
    const currentPage = parseInt(page || '1')
    
    const [gullakResult, collectionsResult] = await Promise.all([
        getGullakById(gullakId) as Promise<GullakDetailResponse>,
        getGullakCollections(gullakId, currentPage, 10) as Promise<CollectionListResponse>
    ])
    
    if (!gullakResult.success || !gullakResult.data) {
        notFound()
    }

    if (!collectionsResult.success || !collectionsResult.data) {
        return (
            <div className="container mx-auto px-4 py-8">
                <Card className="border-red-200 bg-red-50">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="w-5 h-5 text-red-600" />
                            <p className="text-red-800">{collectionsResult.message}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const { gullak } = gullakResult.data
    const { collections, pagination } = collectionsResult.data

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
                        <Link href={`/admin/gullak/${gullakId}`}>
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Gullak
                        </Link>
                    </Button>
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-3xl font-bold">{gullak.gullakId} Collections</h1>
                        </div>
                        <p className="text-muted-foreground">
                            Collection history and management for {gullak.location.address}
                        </p>
                    </div>
                    <Button asChild>
                        <Link href={`/admin/gullak/${gullakId}/collections/create`}>
                            <Plus className="w-4 h-4 mr-2" />
                            Record Collection
                        </Link>
                    </Button>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center gap-3">
                                <DollarSign className="w-8 h-8 text-green-600" />
                                <div>
                                    <p className="text-2xl font-bold">₹{gullak.totalAmountCollected.toLocaleString()}</p>
                                    <p className="text-sm text-muted-foreground">Total Collected</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center gap-3">
                                <FileText className="w-8 h-8 text-blue-600" />
                                <div>
                                    <p className="text-2xl font-bold">{gullak.totalCollections}</p>
                                    <p className="text-sm text-muted-foreground">Total Collections</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center gap-3">
                                <CheckCircle className="w-8 h-8 text-green-600" />
                                <div>
                                    <p className="text-2xl font-bold">
                                        {collections.filter(c => c.verificationStatus === 'verified').length}
                                    </p>
                                    <p className="text-sm text-muted-foreground">Verified</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center gap-3">
                                <Clock className="w-8 h-8 text-yellow-600" />
                                <div>
                                    <p className="text-2xl font-bold">
                                        {collections.filter(c => c.verificationStatus === 'pending').length}
                                    </p>
                                    <p className="text-sm text-muted-foreground">Pending</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Collections List */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="w-5 h-5" />
                            Collection Records
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {collections.length === 0 ? (
                            <div className="text-center py-8">
                                <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                                <h3 className="text-lg font-semibold mb-2">No Collections Yet</h3>
                                <p className="text-muted-foreground mb-4">
                                    No collection records found for this Gullak.
                                </p>
                                <Button asChild>
                                    <Link href={`/admin/gullak/${gullakId}/collections/create`}>
                                        <Plus className="w-4 h-4 mr-2" />
                                        Record First Collection
                                    </Link>
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {collections.map((collection) => {
                                    const StatusIcon = getStatusIcon(collection.verificationStatus)
                                    
                                    return (
                                        <div 
                                            key={collection._id}
                                            className="p-4 border rounded-lg hover:border-primary/50 transition-colors"
                                        >
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <h3 className="font-semibold">{collection.collectionId}</h3>
                                                        <Badge 
                                                            variant="outline" 
                                                            className={getStatusColor(collection.verificationStatus)}
                                                        >
                                                            <StatusIcon className="w-3 h-3 mr-1" />
                                                            {collection.verificationStatus}
                                                        </Badge>
                                                        <Badge variant="secondary">
                                                            ₹{collection.amount.toLocaleString()}
                                                        </Badge>
                                                    </div>
                                                    
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                                                        <div className="flex items-center gap-2">
                                                            <Calendar className="w-4 h-4" />
                                                            <span>{new Date(collection.collectionDate).toLocaleDateString()}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <User className="w-4 h-4" />
                                                            <span>Collected by: {collection.collectedBy.name}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <User className="w-4 h-4" />
                                                            <span>Caretaker: {collection.caretakerPresent.name}</span>
                                                        </div>
                                                    </div>
                                                    
                                                    {collection.notes && (
                                                        <p className="mt-2 text-sm text-muted-foreground">
                                                            <strong>Notes:</strong> {collection.notes}
                                                        </p>
                                                    )}
                                                    
                                                    {collection.verifiedBy && (
                                                        <p className="mt-2 text-sm text-green-600">
                                                            <strong>Verified by:</strong> {collection.verifiedBy.name} on {new Date(collection.verifiedBy.verifiedAt).toLocaleDateString()}
                                                        </p>
                                                    )}
                                                </div>
                                                
                                                <div className="flex gap-2">
                                                    <Button variant="outline" size="sm" asChild>
                                                        <Link href={`/admin/gullak/${gullakId}/collections/${collection.collectionId}`}>
                                                            <Eye className="w-4 h-4 mr-1" />
                                                            View
                                                        </Link>
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                                
                                {/* Pagination */}
                                {pagination.pages > 1 && (
                                    <div className="flex justify-center gap-2 pt-4">
                                        {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((pageNum) => (
                                            <Button
                                                key={pageNum}
                                                variant={pageNum === pagination.page ? 'default' : 'outline'}
                                                size="sm"
                                                asChild
                                            >
                                                <Link href={`/admin/gullak/${gullakId}/collections?page=${pageNum}`}>
                                                    {pageNum}
                                                </Link>
                                            </Button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}