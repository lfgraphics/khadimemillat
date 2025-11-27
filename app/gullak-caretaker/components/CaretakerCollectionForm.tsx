'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createGullakCollection } from '@/actions/gullak-actions'
import { toast } from 'sonner'
import { 
    DollarSign, 
    Calendar, 
    User, 
    FileText, 
    Camera, 
    Loader2,
    Plus,
    Trash2,
    CheckCircle
} from 'lucide-react'
import PhotoCapture, { CapturedPhoto } from '@/components/sponsorship/PhotoCapture'
import type { GullakType } from '@/types/gullak'

interface CaretakerCollectionFormProps {
    gullak: GullakType
}

interface Witness {
    id: string
    name: string
    phone: string
}

export function CaretakerCollectionForm({ gullak }: CaretakerCollectionFormProps) {
    const router = useRouter()
    const { user } = useUser()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [formData, setFormData] = useState({
        amount: '',
        collectionDate: new Date().toISOString().split('T')[0],
        notes: ''
    })
    
    const [collectionPhotos, setCollectionPhotos] = useState<CapturedPhoto[]>([])
    const [witnesses, setWitnesses] = useState<Witness[]>([])

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const addWitness = () => {
        const newWitness: Witness = {
            id: Date.now().toString(),
            name: '',
            phone: ''
        }
        setWitnesses(prev => [...prev, newWitness])
    }

    const updateWitness = (id: string, field: 'name' | 'phone', value: string) => {
        setWitnesses(prev => 
            prev.map(w => w.id === id ? { ...w, [field]: value } : w)
        )
    }

    const removeWitness = (id: string) => {
        setWitnesses(prev => prev.filter(w => w.id !== id))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)

        try {
            // Validate required fields
            if (!formData.amount) {
                toast.error('Please enter the collection amount')
                return
            }

            const amount = parseFloat(formData.amount)
            if (isNaN(amount) || amount <= 0) {
                toast.error('Please enter a valid amount')
                return
            }

            // Prepare form data
            const submitData = new FormData()
            Object.entries(formData).forEach(([key, value]) => {
                if (value) submitData.append(key, value)
            })
            
            // Add gullak and caretaker info
            submitData.append('gullakId', gullak.gullakId)
            submitData.append('caretakerId', gullak.caretaker.userId)
            submitData.append('caretakerName', gullak.caretaker.name)
            
            // Add collector name (caretaker reporting their own collection)
            const collectorName = user?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || gullak.caretaker.name
            submitData.append('collectorName', collectorName)
            
            // Add photos
            const photoUrls = collectionPhotos.map(photo => photo.url).filter(Boolean)
            submitData.append('photos', JSON.stringify(photoUrls))
            
            // Add witnesses (only those with names)
            const validWitnesses = witnesses.filter(w => w.name.trim())
            submitData.append('witnesses', JSON.stringify(validWitnesses))

            const result = await createGullakCollection(submitData)

            if (result.success) {
                toast.success('Collection reported successfully! It will be verified by the administration.')
                router.push(`/gullak-caretaker/gullak/${gullak.gullakId}`)
            } else {
                toast.error(result.message)
            }
        } catch (error) {
            toast.error('An error occurred while reporting the collection')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Collection Details */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                    <DollarSign className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold">Collection Details</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="amount">Amount Collected (₹) *</Label>
                        <Input
                            id="amount"
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="e.g., 1500.00"
                            value={formData.amount}
                            onChange={(e) => handleInputChange('amount', e.target.value)}
                            required
                            className="text-lg"
                        />
                        <p className="text-xs text-muted-foreground">
                            Enter the exact amount collected from the Gullak
                        </p>
                    </div>
                    
                    <div className="space-y-2">
                        <Label htmlFor="collectionDate">Collection Date *</Label>
                        <Input
                            id="collectionDate"
                            type="date"
                            value={formData.collectionDate}
                            onChange={(e) => handleInputChange('collectionDate', e.target.value)}
                            required
                        />
                        <p className="text-xs text-muted-foreground">
                            When was this collection made?
                        </p>
                    </div>
                </div>
            </div>

            {/* Witnesses */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <User className="w-5 h-5 text-primary" />
                        <h3 className="text-lg font-semibold">Community Witnesses</h3>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={addWitness}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Witness
                    </Button>
                </div>

                <p className="text-sm text-muted-foreground">
                    Add community members who witnessed the collection process (optional but recommended)
                </p>

                {witnesses.length === 0 ? (
                    <Card className="border-dashed">
                        <CardContent className="p-6 text-center">
                            <User className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">
                                No witnesses added yet. Click "Add Witness" to include community members.
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {witnesses.map((witness) => (
                            <Card key={witness.id}>
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-4">
                                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <Label className="text-xs">Witness Name</Label>
                                                <Input
                                                    placeholder="Full name"
                                                    value={witness.name}
                                                    onChange={(e) => updateWitness(witness.id, 'name', e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">Phone Number (Optional)</Label>
                                                <Input
                                                    placeholder="Contact number"
                                                    value={witness.phone}
                                                    onChange={(e) => updateWitness(witness.id, 'phone', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => removeWitness(witness.id)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Photos */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                    <Camera className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold">Collection Photos</h3>
                </div>

                <div className="space-y-2">
                    <Label>Take Photos of the Collection Process</Label>
                    <p className="text-xs text-muted-foreground">
                        Photos help verify the collection and provide transparency. Take pictures of:
                        <br />• The Gullak before opening
                        <br />• The contents being counted
                        <br />• The empty Gullak after collection
                    </p>
                </div>

                <PhotoCapture
                    category="other"
                    maxPhotos={5}
                    onPhotosChange={setCollectionPhotos}
                    existingPhotos={collectionPhotos}
                    disabled={isSubmitting}
                />
            </div>

            {/* Notes */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                    <FileText className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold">Additional Notes</h3>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="notes">Collection Notes (Optional)</Label>
                    <Textarea
                        id="notes"
                        placeholder="Any additional information about the collection:
• Condition of the Gullak
• Community feedback
• Any issues encountered
• Special circumstances"
                        value={formData.notes}
                        onChange={(e) => handleInputChange('notes', e.target.value)}
                        rows={4}
                    />
                </div>
            </div>

            {/* Verification Notice */}
            <Card className="border-blue-200 bg-blue-50">
                <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <h4 className="font-medium text-blue-800 mb-1">Verification Process</h4>
                            <p className="text-sm text-blue-700">
                                After you submit this report, it will be reviewed and verified by the administration. 
                                You will be notified once the verification is complete.
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
                    Report Collection
                </Button>
            </div>
        </form>
    )
}