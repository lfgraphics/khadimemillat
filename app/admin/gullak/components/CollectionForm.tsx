'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
    Trash2
} from 'lucide-react'
import PhotoCapture, { CapturedPhoto } from '@/components/sponsorship/PhotoCapture'
import type { GullakType } from '@/types/gullak'

interface CollectionFormProps {
    gullak: GullakType
}

interface Witness {
    id: string
    name: string
    phone: string
}

export function CollectionForm({ gullak }: CollectionFormProps) {
    const router = useRouter()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [formData, setFormData] = useState({
        amount: '',
        collectionDate: new Date().toISOString().split('T')[0],
        collectorName: '',
        caretakerName: gullak.caretaker.name,
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
            if (!formData.amount || !formData.collectorName) {
                toast.error('Please fill in all required fields')
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
            
            // Add photos
            const photoUrls = collectionPhotos.map(photo => photo.url).filter(Boolean)
            submitData.append('photos', JSON.stringify(photoUrls))
            
            // Add witnesses (only those with names)
            const validWitnesses = witnesses.filter(w => w.name.trim())
            submitData.append('witnesses', JSON.stringify(validWitnesses))

            const result = await createGullakCollection(submitData)

            if (result.success) {
                toast.success(result.message)
                router.push(`/admin/gullak/${gullak.gullakId}/collections`)
            } else {
                toast.error(result.message)
            }
        } catch (error) {
            toast.error('An error occurred while recording the collection')
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
                        />
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
                    </div>
                </div>
            </div>

            {/* Personnel Information */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                    <User className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold">Personnel Information</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="collectorName">Collected By *</Label>
                        <Input
                            id="collectorName"
                            placeholder="Name of collection team member"
                            value={formData.collectorName}
                            onChange={(e) => handleInputChange('collectorName', e.target.value)}
                            required
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <Label htmlFor="caretakerName">Caretaker Present</Label>
                        <Input
                            id="caretakerName"
                            value={formData.caretakerName}
                            onChange={(e) => handleInputChange('caretakerName', e.target.value)}
                            placeholder="Caretaker who was present"
                        />
                        <p className="text-xs text-muted-foreground">
                            Default: {gullak.caretaker.name}
                        </p>
                    </div>
                </div>
            </div>

            {/* Witnesses */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <User className="w-5 h-5 text-primary" />
                        <h3 className="text-lg font-semibold">Witnesses (Optional)</h3>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={addWitness}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Witness
                    </Button>
                </div>

                {witnesses.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        No witnesses added. Click "Add Witness" to include community members who witnessed the collection.
                    </p>
                ) : (
                    <div className="space-y-3">
                        {witnesses.map((witness) => (
                            <Card key={witness.id}>
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-4">
                                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <Input
                                                placeholder="Witness name"
                                                value={witness.name}
                                                onChange={(e) => updateWitness(witness.id, 'name', e.target.value)}
                                            />
                                            <Input
                                                placeholder="Phone number (optional)"
                                                value={witness.phone}
                                                onChange={(e) => updateWitness(witness.id, 'phone', e.target.value)}
                                            />
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
                    <Label>Capture Collection Evidence (Optional)</Label>
                    <p className="text-xs text-muted-foreground">
                        Take photos of the collection process, Gullak contents, or receipt for documentation
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
                        placeholder="Any additional notes about the collection process, condition of Gullak, community feedback, etc."
                        value={formData.notes}
                        onChange={(e) => handleInputChange('notes', e.target.value)}
                        rows={4}
                    />
                </div>
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
                    disabled={isSubmitting}
                    className="flex-1"
                >
                    {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Record Collection
                </Button>
            </div>
        </form>
    )
}