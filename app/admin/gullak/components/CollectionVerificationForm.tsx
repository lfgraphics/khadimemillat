'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { verifyGullakCollection } from '@/actions/gullak-actions'
import { toast } from 'sonner'
import { 
    CheckCircle, 
    AlertTriangle, 
    Loader2,
    FileText
} from 'lucide-react'

interface CollectionVerificationFormProps {
    collection: any
    gullakId: string
}

export function CollectionVerificationForm({ collection, gullakId }: CollectionVerificationFormProps) {
    const router = useRouter()
    const { user } = useUser()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [verificationStatus, setVerificationStatus] = useState<'verified' | 'disputed'>('verified')
    const [notes, setNotes] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)

        try {
            const formData = new FormData()
            formData.append('status', verificationStatus)
            formData.append('notes', notes)
            formData.append('verifierName', user?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Unknown')

            const result = await verifyGullakCollection(collection.collectionId, formData)

            if (result.success) {
                toast.success(result.message)
                router.push(`/admin/gullak/${gullakId}/collections/${collection.collectionId}`)
            } else {
                toast.error(result.message)
            }
        } catch (error) {
            toast.error('An error occurred while verifying the collection')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Verification Decision */}
            <div className="space-y-4">
                <Label className="text-base font-semibold">Verification Decision</Label>
                <RadioGroup 
                    value={verificationStatus} 
                    onValueChange={(value) => setVerificationStatus(value as 'verified' | 'disputed')}
                    className="space-y-4"
                >
                    <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-green-50 transition-colors">
                        <RadioGroupItem value="verified" id="verified" className="mt-1" />
                        <div className="flex-1">
                            <Label htmlFor="verified" className="flex items-center gap-2 cursor-pointer">
                                <CheckCircle className="w-5 h-5 text-green-600" />
                                <span className="font-medium">Verify Collection</span>
                            </Label>
                            <p className="text-sm text-muted-foreground mt-1">
                                The collection amount and details are accurate. Approve this collection for processing.
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-red-50 transition-colors">
                        <RadioGroupItem value="disputed" id="disputed" className="mt-1" />
                        <div className="flex-1">
                            <Label htmlFor="disputed" className="flex items-center gap-2 cursor-pointer">
                                <AlertTriangle className="w-5 h-5 text-red-600" />
                                <span className="font-medium">Dispute Collection</span>
                            </Label>
                            <p className="text-sm text-muted-foreground mt-1">
                                There are discrepancies or issues with this collection that need to be addressed.
                            </p>
                        </div>
                    </div>
                </RadioGroup>
            </div>

            {/* Verification Notes */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    <Label htmlFor="notes" className="text-base font-semibold">
                        Verification Notes {verificationStatus === 'disputed' && <span className="text-red-500">*</span>}
                    </Label>
                </div>
                
                <Textarea
                    id="notes"
                    placeholder={
                        verificationStatus === 'verified' 
                            ? "Optional: Add any notes about the verification process, observations, or additional comments..."
                            : "Required: Please explain the reason for disputing this collection, what discrepancies were found, and what actions need to be taken..."
                    }
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    required={verificationStatus === 'disputed'}
                />
                
                {verificationStatus === 'disputed' && (
                    <p className="text-sm text-red-600">
                        Verification notes are required when disputing a collection.
                    </p>
                )}
            </div>

            {/* Guidelines */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2">Verification Guidelines</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Review the collection amount for accuracy</li>
                    <li>• Check if photos and documentation are adequate</li>
                    <li>• Verify witness information if provided</li>
                    <li>• Ensure the collection date is reasonable</li>
                    <li>• Look for any suspicious patterns or inconsistencies</li>
                    <li>• Contact the caretaker if clarification is needed</li>
                </ul>
            </div>

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
                    disabled={isSubmitting || (verificationStatus === 'disputed' && !notes.trim())}
                    className={`flex-1 ${
                        verificationStatus === 'verified' 
                            ? 'bg-green-600 hover:bg-green-700' 
                            : 'bg-red-600 hover:bg-red-700'
                    }`}
                >
                    {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {verificationStatus === 'verified' ? (
                        <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Verify Collection
                        </>
                    ) : (
                        <>
                            <AlertTriangle className="w-4 h-4 mr-2" />
                            Dispute Collection
                        </>
                    )}
                </Button>
            </div>
        </form>
    )
}