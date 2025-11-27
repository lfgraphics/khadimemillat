'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { createGullakCollection } from '@/actions/gullak-actions'
import { toast } from 'sonner'
import { 
    FileText, 
    Camera, 
    Loader2,
    CheckCircle
} from 'lucide-react'
import PhotoCapture, { CapturedPhoto } from '@/components/sponsorship/PhotoCapture'
import type { GullakType } from '@/types/gullak'

interface CaretakerCollectionFormProps {
    gullak: GullakType
}



export function CaretakerCollectionForm({ gullak }: CaretakerCollectionFormProps) {
    const router = useRouter()
    const { user } = useUser()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [formData, setFormData] = useState({
        reportDate: new Date().toISOString().split('T')[0],
        notes: '',
        estimatedAmount: ''
    })
    
    const [gullakPhotos, setGullakPhotos] = useState<CapturedPhoto[]>([])

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)

        try {
            // Create a collection request/notification
            const requestData = new FormData()
            requestData.append('gullakId', gullak.gullakId)
            requestData.append('caretakerId', gullak.caretaker.userId)
            requestData.append('caretakerName', gullak.caretaker.name)
            requestData.append('reportDate', formData.reportDate)
            requestData.append('estimatedAmount', formData.estimatedAmount || '0')
            requestData.append('notes', formData.notes)
            requestData.append('status', 'collection_requested')
            requestData.append('collectorName', user?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Caretaker Request')
            
            // Add photos
            const photoUrls = gullakPhotos.map(photo => photo.url).filter(Boolean)
            requestData.append('photos', JSON.stringify(photoUrls))
            
            // For now, we'll create a pending collection record that admin needs to complete
            const result = await createGullakCollection(requestData)
            
            if (result.success) {
                toast.success('Collection request sent successfully! Administration will schedule collection soon.')
                router.push(`/gullak-caretaker/gullak/${gullak.gullakId}`)
            } else {
                toast.error(result.message)
            }
        } catch (error) {
            toast.error('An error occurred while sending the collection request')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Report Details */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                    <CheckCircle className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold">Collection Request Details</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="estimatedAmount">Estimated Amount (₹) - Optional</Label>
                        <Input
                            id="estimatedAmount"
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="e.g., 1500.00"
                            value={formData.estimatedAmount}
                            onChange={(e) => handleInputChange('estimatedAmount', e.target.value)}
                            className="text-lg"
                        />
                        <p className="text-xs text-muted-foreground">
                            Rough estimate of how much might be in the Gullak
                        </p>
                    </div>
                    
                    <div className="space-y-2">
                        <Label htmlFor="reportDate">Report Date</Label>
                        <Input
                            id="reportDate"
                            type="date"
                            value={formData.reportDate}
                            onChange={(e) => handleInputChange('reportDate', e.target.value)}
                            required
                        />
                        <p className="text-xs text-muted-foreground">
                            When are you reporting this?
                        </p>
                    </div>
                </div>
            </div>



            {/* Photos */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                    <Camera className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold">Gullak Status Photos</h3>
                </div>

                <div className="space-y-2">
                    <Label>Take Photos of Current Gullak State</Label>
                    <p className="text-xs text-muted-foreground">
                        Photos help administration assess the collection need:
                        <br />• Current state of the Gullak
                        <br />• How full it appears to be
                        <br />• Any issues or concerns
                    </p>
                </div>

                <PhotoCapture
                    category="other"
                    maxPhotos={3}
                    onPhotosChange={setGullakPhotos}
                    existingPhotos={gullakPhotos}
                    disabled={isSubmitting}
                />
            </div>

            {/* Notes */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                    <FileText className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold">Additional Information</h3>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="notes">Report Notes (Optional)</Label>
                    <Textarea
                        id="notes"
                        placeholder="Any additional information about the Gullak status:
• How full does it appear?
• Condition of the Gullak
• Community feedback
• Any issues or concerns
• Urgency level"
                        value={formData.notes}
                        onChange={(e) => handleInputChange('notes', e.target.value)}
                        rows={4}
                    />
                </div>
            </div>

            {/* Collection Notice */}
            <Card className="border-blue-200 bg-blue-50">
                <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <h4 className="font-medium text-blue-800 mb-1">Collection Process</h4>
                            <p className="text-sm text-blue-700">
                                After you submit this request:
                                <br />• The Gullak will be marked as "Full" to prevent new donations
                                <br />• Administration will schedule a collection visit
                                <br />• A team member will collect the actual amount and record it officially
                                <br />• Once verified, the Gullak will automatically become "Active" again
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Submit Buttons */}
            <div className="flex gap-4 pt-6">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                    disabled={isSubmitting}
                    className="flex-1"
                >
                    Cancel
                </Button>
                <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1"
                >
                    {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Request Collection
                </Button>
            </div>
        </form>
    )
}