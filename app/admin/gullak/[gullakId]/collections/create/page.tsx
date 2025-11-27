import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { getGullakById } from '@/actions/gullak-actions'
import { ArrowLeft, DollarSign } from 'lucide-react'
import { CollectionForm } from '../../../components/CollectionForm'
import type { GullakDetailResponse } from '@/types/gullak'

export default async function CreateCollectionPage({
    params
}: {
    params: Promise<{ gullakId: string }>
}) {
    const { gullakId } = await params
    const result = await getGullakById(gullakId) as GullakDetailResponse
    
    if (!result.success || !result.data) {
        notFound()
    }

    const { gullak } = result.data

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="max-w-4xl mx-auto space-y-6">
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
                            <h1 className="text-3xl font-bold">Record Collection</h1>
                        </div>
                        <p className="text-muted-foreground">
                            Record a new collection for {gullak.gullakId} - {gullak.location.address}
                        </p>
                    </div>
                </div>

                {/* Gullak Info */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <DollarSign className="w-5 h-5" />
                            Gullak Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-muted-foreground">Gullak ID</p>
                                <p className="font-semibold">{gullak.gullakId}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Caretaker</p>
                                <p className="font-semibold">{gullak.caretaker.name}</p>
                            </div>
                            <div className="md:col-span-2">
                                <p className="text-sm text-muted-foreground">Address</p>
                                <p className="font-semibold">{gullak.location.address}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Collection Form */}
                <Card>
                    <CardHeader>
                        <CardTitle>Collection Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <CollectionForm gullak={gullak} />
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}