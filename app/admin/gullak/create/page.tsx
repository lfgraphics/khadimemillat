"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getAvailableCaretakers } from '@/actions/gullak-actions'
import { GullakForm } from '../components/GullakForm'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import type { CaretakersResponse } from '@/types/gullak'

export default async function CreateGullakPage() {
    const caretakersResult = await getAvailableCaretakers() as CaretakersResponse
    
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

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="max-w-2xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="sm" asChild>
                        <Link href="/admin/gullak">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Gullaks
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">Create New Gullak</h1>
                        <p className="text-muted-foreground">
                            Register a new Neki Bank location
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
                            mode="create"
                        />
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}