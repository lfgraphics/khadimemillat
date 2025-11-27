import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { getGullakById } from '@/actions/gullak-actions'
import { ArrowLeft, DollarSign, AlertCircle } from 'lucide-react'
import { CaretakerCollectionForm } from '../../../components/CaretakerCollectionForm'
import type { GullakDetailResponse } from '@/types/gullak'

export default async function ReportCollectionPage({
    params
}: {
    params: Promise<{ gullakId: string }>
}) {
    const { userId, sessionClaims } = await auth()
    const { gullakId } = await params
    
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
    
    const result = await getGullakById(gullakId) as GullakDetailResponse
    
    if (!result.success || !result.data) {
        notFound()
    }

    const { gullak } = result.data
    
    // Check if this caretaker is assigned to this gullak
    if (gullak.caretaker.userId !== userId) {
        redirect('/unauthorized')
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="sm" asChild>
                        <Link href={`/gullak-caretaker/gullak/${gullakId}`}>
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Gullak
                        </Link>
                    </Button>
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-3xl font-bold">Report Collection</h1>
                        </div>
                        <p className="text-muted-foreground">
                            Report a collection for {gullak.gullakId} - {gullak.location.address}
                        </p>
                    </div>
                </div>

                {/* Important Notice */}
                <Card className="border-amber-200 bg-amber-50">
                    <CardContent className="p-6">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <h3 className="font-semibold text-amber-800 mb-2">Important Instructions</h3>
                                <ul className="text-sm text-amber-700 space-y-1">
                                    <li>• Report collections immediately after they are made</li>
                                    <li>• Take photos of the collection process if possible</li>
                                    <li>• Ensure accurate amount reporting</li>
                                    <li>• Get witness signatures when available</li>
                                    <li>• Contact support if you face any issues</li>
                                </ul>
                            </div>
                        </div>
                    </CardContent>
                </Card>

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
                                <p className="text-sm text-muted-foreground">Your Name</p>
                                <p className="font-semibold">{gullak.caretaker.name}</p>
                            </div>
                            <div className="md:col-span-2">
                                <p className="text-sm text-muted-foreground">Location</p>
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
                        <CaretakerCollectionForm gullak={gullak} />
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}