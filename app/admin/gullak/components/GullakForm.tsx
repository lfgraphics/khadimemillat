'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { createGullak, updateGullak } from '@/actions/gullak-actions'
import { getCurrentLocationAsGeoJSON, geoJSONToLatLng } from '@/utils/geolocation'
import { toast } from 'sonner'
import { MapPin, User, Calendar, FileText, Loader2 } from 'lucide-react'
import type { CaretakerType, GullakType } from '@/types/gullak'

interface GullakFormProps {
    caretakers: CaretakerType[]
    mode: 'create' | 'edit'
    initialData?: GullakType
}

export function GullakForm({ caretakers, mode, initialData }: GullakFormProps) {
    const router = useRouter()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [formData, setFormData] = useState({
        address: initialData?.location?.address || '',
        latitude: initialData?.location?.coordinates?.coordinates?.[1]?.toString() || '', // latitude is second in GeoJSON
        longitude: initialData?.location?.coordinates?.coordinates?.[0]?.toString() || '', // longitude is first in GeoJSON
        landmark: initialData?.location?.landmark || '',
        caretakerUserId: initialData?.caretaker?.userId?.toString() || '',
        installationDate: initialData?.installationDate 
            ? new Date(initialData.installationDate).toISOString().split('T')[0] 
            : new Date().toISOString().split('T')[0],
        status: initialData?.status || 'active',
        description: initialData?.description || '',
        notes: initialData?.notes || ''
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)

        try {
            const formDataObj = new FormData()
            Object.entries(formData).forEach(([key, value]) => {
                if (value) formDataObj.append(key, value)
            })

            const result = mode === 'create' 
                ? await createGullak(formDataObj)
                : await updateGullak(initialData!.gullakId, formDataObj)

            if (result.success) {
                toast.success(result.message)
                router.push('/admin/gullak')
            } else {
                toast.error(result.message)
            }
        } catch (error) {
            toast.error('An error occurred while saving the Gullak')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    // Get current location using utility function
    const getCurrentLocation = async () => {
        try {
            const geoJSONPoint = await getCurrentLocationAsGeoJSON()
            const { latitude, longitude } = geoJSONToLatLng(geoJSONPoint)
            
            setFormData(prev => ({
                ...prev,
                latitude: latitude.toString(),
                longitude: longitude.toString()
            }))
            toast.success('Location updated successfully')
        } catch (error) {
            toast.error('Failed to get current location')
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Location Section */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                    <MapPin className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold">Location Details</h3>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="address">Address *</Label>
                    <Textarea
                        id="address"
                        placeholder="Enter complete address where Gullak will be placed"
                        value={formData.address}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        required
                        rows={3}
                    />
                </div>

                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-2">
                        <Button 
                            type="button" 
                            variant="outline" 
                            onClick={getCurrentLocation}
                            className="flex-1 sm:flex-none"
                        >
                            <MapPin className="w-4 h-4 mr-2" />
                            Use Current Location
                        </Button>
                        <div className="text-sm text-muted-foreground flex items-center">
                            Click to automatically detect your current GPS coordinates
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="latitude">Latitude *</Label>
                            <Input
                                id="latitude"
                                type="number"
                                step="0.000001"
                                placeholder="e.g., 26.760600"
                                value={formData.latitude}
                                onChange={(e) => handleInputChange('latitude', e.target.value)}
                                required
                                className="font-mono"
                            />
                            <p className="text-xs text-muted-foreground">
                                Range: -90 to 90 (North-South position)
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="longitude">Longitude *</Label>
                            <Input
                                id="longitude"
                                type="number"
                                step="0.000001"
                                placeholder="e.g., 83.373200"
                                value={formData.longitude}
                                onChange={(e) => handleInputChange('longitude', e.target.value)}
                                required
                                className="font-mono"
                            />
                            <p className="text-xs text-muted-foreground">
                                Range: -180 to 180 (East-West position)
                            </p>
                        </div>
                    </div>
                    
                    {formData.latitude && formData.longitude && (
                        <div className="p-3 bg-muted/50 rounded-lg">
                            <p className="text-sm font-medium mb-1">Preview Location:</p>
                            <p className="text-xs text-muted-foreground font-mono">
                                {formData.latitude}, {formData.longitude}
                            </p>
                            <a 
                                href={`https://www.google.com/maps?q=${formData.latitude},${formData.longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary hover:underline"
                            >
                                View on Google Maps →
                            </a>
                        </div>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="landmark">Landmark (Optional)</Label>
                    <Input
                        id="landmark"
                        placeholder="e.g., Near ABC School, Opposite XYZ Shop"
                        value={formData.landmark}
                        onChange={(e) => handleInputChange('landmark', e.target.value)}
                    />
                </div>
            </div>

            {/* Caretaker Section */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                    <User className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold">Caretaker Assignment</h3>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="caretaker">Select Caretaker *</Label>
                    <Select 
                        value={formData.caretakerUserId} 
                        onValueChange={(value) => handleInputChange('caretakerUserId', value)}
                        required
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Choose a caretaker" />
                        </SelectTrigger>
                        <SelectContent>
                            {caretakers.map((caretaker) => (
                                <SelectItem key={caretaker._id} value={caretaker._id}>
                                    <div>
                                        <div className="font-medium">{caretaker.name}</div>
                                        <div className="text-sm text-muted-foreground">
                                            {caretaker.phone} • {caretaker.email}
                                        </div>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {caretakers.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                            No caretakers available. Please create caretaker accounts first.
                        </p>
                    )}
                </div>
            </div>

            {/* Installation & Status */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                    <Calendar className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold">Installation Details</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="installationDate">Installation Date *</Label>
                        <Input
                            id="installationDate"
                            type="date"
                            value={formData.installationDate}
                            onChange={(e) => handleInputChange('installationDate', e.target.value)}
                            required
                        />
                    </div>
                    {mode === 'edit' && (
                        <div className="space-y-2">
                            <Label htmlFor="status">Status</Label>
                            <Select 
                                value={formData.status} 
                                onValueChange={(value) => handleInputChange('status', value)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="inactive">Inactive</SelectItem>
                                    <SelectItem value="maintenance">Maintenance</SelectItem>
                                    <SelectItem value="full">Full</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>
            </div>

            {/* Additional Information */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                    <FileText className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold">Additional Information</h3>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea
                        id="description"
                        placeholder="Brief description about this Gullak location"
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        rows={3}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="notes">Internal Notes (Optional)</Label>
                    <Textarea
                        id="notes"
                        placeholder="Internal notes for staff reference"
                        value={formData.notes}
                        onChange={(e) => handleInputChange('notes', e.target.value)}
                        rows={3}
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
                    disabled={isSubmitting || caretakers.length === 0}
                    className="flex-1"
                >
                    {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {mode === 'create' ? 'Create Gullak' : 'Update Gullak'}
                </Button>
            </div>
        </form>
    )
}