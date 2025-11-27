import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getGullakById, getAvailableCaretakers } from '@/actions/gullak-actions'
import { GullakForm } from '../../components/GullakForm'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import type { GullakDetailResponse, CaretakersResponse } from '@/types/gullak'

export default async function EditGullakPage({
    params
}: {
    params: Promise<{ gullakId: string }>
}) {
    const { gullakId } = await params
    const [gullakResult, caretakersResult] = await Promise.all([
        getGullakById(gullakId) as Promise<GullakDetailResponse>,
        getAvailableCaretakers() as Promise<CaretakersResponse>
    ])
    
    if (!gullakResult.success || !gullakResult.data) {
        notFound()
    }

    if (!caretakersResult.success || !caretakersResult.data) {
        return (
            <div className="container mx-auto px-4 py-8">
                <Card className="border-red-200 bg-red-50">
                    <CardContent className="p-6">
                        <p className="text-red-800">{caretakersResult.message}</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const { gullak } = gullakResult.data

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="max-w-2xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="sm" asChild>
                        <Link href={`/admin/gullak/${gullak.gullakId}`}>
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Details
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">Edit Gullak {gullak.gullakId}</h1>
                        <p className="text-muted-foreground">
                            Update Neki Bank location details
                        </p>
                    </div>
                </div>

                {/* Form */}
                <Card>
                    <CardHeader>
                        <CardTitle>Gullak Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <GullakForm 
                            caretakers={caretakersResult.data}
                            mode="edit"
                            initialData={gullak}
                        />
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}