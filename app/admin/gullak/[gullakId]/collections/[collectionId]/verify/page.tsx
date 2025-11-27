import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { getGullakById } from '@/actions/gullak-actions'
import { ArrowLeft, CheckCircle, AlertTriangle } from 'lucide-react'
import { CollectionVerificationForm } from '../../../../components/CollectionVerificationForm'
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

export default async function VerifyCollectionPage({
    params
}: {
    params: Promise<{ gullakId: string; collectionId: string }>
}) {
    const { userId, sessionClaims } = await auth()
    const { gullakId, collectionId } = await params
    
    if (!userId) {
        redirect('/sign-in')
    }
    
    // Check if user has permission to verify collections
    const userRole = sessionClaims?.metadata?.role as string
    const userRoles = (sessionClaims?.metadata as any)?.roles as string[] || []
    const allRoles = [...(userRoles || []), ...(userRole ? [userRole] : [])]
    const authorizedRoles = ['admin', 'moderator', 'neki_bank_manager']
    
    if (!allRoles.some(role => authorizedRoles.includes(role))) {
        redirect('/unauthorized')
    }
    
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

    // Check if collection is already verified
    if (collection.verificationStatus !== 'pending') {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto space-y-6">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" size="sm" asChild>
                            <Link href={`/admin/gullak/${gullakId}/collections/${collectionId}`}>
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back to Collection
                            </Link>
                        </Button>
                        <div className="flex-1">
                            <h1 className="text-3xl font-bold">Collection Already Processed</h1>
                            <p className="text-muted-foreground">
                                This collection has already been {collection.verificationStatus}
                            </p>
                        </div>
                    </div>

                    <Card className="border-blue-200 bg-blue-50">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-3">
                                {collection.verificationStatus === 'verified' ? (
                                    <CheckCircle className="w-8 h-8 text-green-600" />
                                ) : (
                                    <AlertTriangle className="w-8 h-8 text-red-600" />
                                )}
                                <div>
                                    <h3 className="font-semibold text-lg mb-2">
                                        Collection {collection.verificationStatus === 'verified' ? 'Verified' : 'Disputed'}
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        This collection was {collection.verificationStatus} by {collection.verifiedBy?.name} on{' '}
                                        {new Date(collection.verifiedBy?.verifiedAt).toLocaleDateString()}
                                    </p>
                                    {collection.verifiedBy?.notes && (
                                        <p className="text-sm mt-2">
                                            <strong>Notes:</strong> {collection.verifiedBy.notes}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex gap-4">
                        <Button asChild>
                            <Link href={`/admin/gullak/${gullakId}/collections/${collectionId}`}>
                                View Collection Details
                            </Link>
                        </Button>
                        <Button variant="outline" asChild>
                            <Link href={`/admin/gullak/${gullakId}/collections`}>
                                Back to Collections
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="sm" asChild>
                        <Link href={`/admin/gullak/${gullakId}/collections/${collectionId}`}>
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Collection
                        </Link>
                    </Button>
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-3xl font-bold">Verify Collection</h1>
                        </div>
                        <p className="text-muted-foreground">
                            Review and verify collection {collection.collectionId} for {gullak.gullakId}
                        </p>
                    </div>
                </div>

                {/* Collection Summary */}
                <Card>
                    <CardHeader>
                        <CardTitle>Collection Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <p className="text-sm text-muted-foreground">Collection ID</p>
                                <p className="font-semibold">{collection.collectionId}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Amount</p>
                                <p className="font-semibold text-lg">₹{collection.amount.toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Collection Date</p>
                                <p className="font-semibold">{new Date(collection.collectionDate).toLocaleDateString()}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Collected By</p>
                                <p className="font-semibold">{collection.collectedBy.name}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Caretaker</p>
                                <p className="font-semibold">{collection.caretakerPresent.name}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Gullak</p>
                                <p className="font-semibold">{gullak.gullakId}</p>
                            </div>
                        </div>
                        
                        {collection.notes && (
                            <div className="mt-4">
                                <p className="text-sm text-muted-foreground">Collection Notes</p>
                                <p className="text-sm bg-muted/50 p-3 rounded-lg mt-1">{collection.notes}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Verification Form */}
                <Card>
                    <CardHeader>
                        <CardTitle>Verification Decision</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <CollectionVerificationForm 
                            collection={collection} 
                            gullakId={gullakId}
                        />
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}