'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { EnhancedFileSelector } from '@/components/file-selector'
import type { UploadResult, FileUploadError } from '@/components/file-selector/types'
import { membershipRequestSchema, type MembershipRequestFormData, documentTypeOptions } from '@/schemas/membership-schema'
import { toast } from 'sonner'
import { Loader2, Plus, Trash2, Upload, User, MapPin, FileText, Calendar } from 'lucide-react'

interface MembershipRequestFormProps {
  onSuccess?: () => void
}

export default function MembershipRequestForm({ onSuccess }: MembershipRequestFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [identityProofs, setIdentityProofs] = useState<Array<{
    documentType: string
    documentNumber: string
    images: string[]
  }>>([
    { documentType: '', documentNumber: '', images: [] }
  ])

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid }
  } = useForm({
    resolver: zodResolver(membershipRequestSchema),
    mode: 'onChange',
    defaultValues: {
      isSameAddress: false,
      identityProofs: []
    }
  })

  const isSameAddress = watch('isSameAddress')

  const handleSameAddressChange = (checked: boolean) => {
    setValue('isSameAddress', checked)
    if (checked) {
      const currentAddress = watch('currentAddress')
      setValue('permanentAddress', currentAddress)
    }
  }

  const addIdentityProof = () => {
    if (identityProofs.length < 3) {
      const newProofs = [...identityProofs, { documentType: '', documentNumber: '', images: [] }]
      setIdentityProofs(newProofs)
      // Don't update form value when adding empty proof
    }
  }

  const removeIdentityProof = (index: number) => {
    if (identityProofs.length > 1) {
      const newProofs = identityProofs.filter((_, i) => i !== index)
      setIdentityProofs(newProofs)
      // Update form value with valid proofs only
      const validProofs = newProofs
        .filter(proof => proof.documentType && proof.documentType !== '' && proof.documentNumber && proof.images.length > 0)
        .map(proof => ({
          documentType: proof.documentType as 'aadhaar' | 'pan' | 'voter_id' | 'passport' | 'driving_license',
          documentNumber: proof.documentNumber,
          images: proof.images
        }))
      setValue('identityProofs', validProofs)
    }
  }

  const updateIdentityProof = (index: number, field: string, value: any) => {
    const newProofs = [...identityProofs]
    newProofs[index] = { ...newProofs[index], [field]: value }
    setIdentityProofs(newProofs)
    // Update form value to trigger validation - only set valid proofs
    const validProofs = newProofs
      .filter(proof => proof.documentType && proof.documentType !== '' && proof.documentNumber && proof.images.length > 0)
      .map(proof => ({
        documentType: proof.documentType as 'aadhaar' | 'pan' | 'voter_id' | 'passport' | 'driving_license',
        documentNumber: proof.documentNumber,
        images: proof.images
      }))
    setValue('identityProofs', validProofs)
  }

  const handleImageUpload = (index: number, uploadResult: UploadResult) => {
    const currentImages = identityProofs[index].images
    const newImages = [...currentImages, uploadResult.secureUrl].slice(0, 3) // Max 3 images
    updateIdentityProof(index, 'images', newImages)
  }

  const handleUploadError = (index: number, error: FileUploadError) => {
    console.error('Upload error:', error)
    toast.error(`Failed to upload document: ${error.message}`)
  }

  const onSubmit = async (data: any) => {
    console.log('Form submitted with data:', data)
    console.log('Identity proofs:', identityProofs)
    setIsSubmitting(true)
    
    try {
      // Add identity proofs to form data - filter and type properly
      const validIdentityProofs = identityProofs
        .filter(proof => 
          proof.documentType && proof.documentType !== '' && proof.documentNumber && proof.images.length > 0
        )
        .map(proof => ({
          documentType: proof.documentType as 'aadhaar' | 'pan' | 'voter_id' | 'passport' | 'driving_license',
          documentNumber: proof.documentNumber,
          images: proof.images
        }))
      
      const formData = {
        ...data,
        identityProofs: validIdentityProofs
      }
      
      console.log('Final form data:', formData)

      const response = await fetch('/api/membership/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to submit membership request')
      }

      toast.success('Membership request submitted successfully!')
      onSuccess?.()
      
      // Reload the page to show the status instead of the form
      if (typeof window !== 'undefined') {
        window.location.reload()
      }
    } catch (error) {
      console.error('Submission error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to submit request')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">
          Membership Request
        </h1>
        <p className="text-muted-foreground">
          Join our community as a verified member to access exclusive features and financial reports
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Personal Information
            </CardTitle>
            <CardDescription>
              Please provide your legal details as per your identity documents
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fullName">Full Name (as per ID)</Label>
                <Input
                  id="fullName"
                  {...register('fullName')}
                  placeholder="Enter your full legal name"
                />
                {errors.fullName && (
                  <p className="text-sm text-red-600 mt-1">{errors.fullName.message}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  {...register('dateOfBirth')}
                />
                {errors.dateOfBirth && (
                  <p className="text-sm text-red-600 mt-1">{errors.dateOfBirth.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="primaryContactNumber">Primary Contact Number</Label>
                <Input
                  id="primaryContactNumber"
                  {...register('primaryContactNumber')}
                  placeholder="10-digit mobile number"
                />
                {errors.primaryContactNumber && (
                  <p className="text-sm text-red-600 mt-1">{errors.primaryContactNumber.message}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="alternateContactNumber">Alternate Contact Number (Optional)</Label>
                <Input
                  id="alternateContactNumber"
                  {...register('alternateContactNumber')}
                  placeholder="10-digit mobile number"
                />
                {errors.alternateContactNumber && (
                  <p className="text-sm text-red-600 mt-1">{errors.alternateContactNumber.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Address Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Address Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Current Address */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Current Address</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="currentAddress.street">Street Address</Label>
                  <Textarea
                    id="currentAddress.street"
                    {...register('currentAddress.street')}
                    placeholder="House/Flat number, Street name, Area"
                    rows={2}
                  />
                  {errors.currentAddress?.street && (
                    <p className="text-sm text-red-600 mt-1">{errors.currentAddress.street.message}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="currentAddress.city">City</Label>
                  <Input
                    id="currentAddress.city"
                    {...register('currentAddress.city')}
                    placeholder="City name"
                  />
                  {errors.currentAddress?.city && (
                    <p className="text-sm text-red-600 mt-1">{errors.currentAddress.city.message}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="currentAddress.state">State</Label>
                  <Input
                    id="currentAddress.state"
                    {...register('currentAddress.state')}
                    placeholder="State name"
                  />
                  {errors.currentAddress?.state && (
                    <p className="text-sm text-red-600 mt-1">{errors.currentAddress.state.message}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="currentAddress.pincode">Pincode</Label>
                  <Input
                    id="currentAddress.pincode"
                    {...register('currentAddress.pincode')}
                    placeholder="6-digit pincode"
                  />
                  {errors.currentAddress?.pincode && (
                    <p className="text-sm text-red-600 mt-1">{errors.currentAddress.pincode.message}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="currentAddress.country">Country</Label>
                  <Input
                    id="currentAddress.country"
                    {...register('currentAddress.country')}
                    defaultValue="India"
                    readOnly
                  />
                </div>
              </div>
            </div>

            {/* Same Address Checkbox */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isSameAddress"
                checked={isSameAddress}
                onCheckedChange={handleSameAddressChange}
              />
              <Label htmlFor="isSameAddress">
                Permanent address is same as current address
              </Label>
            </div>

            {/* Permanent Address */}
            {!isSameAddress && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Permanent Address</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="permanentAddress.street">Street Address</Label>
                    <Textarea
                      id="permanentAddress.street"
                      {...register('permanentAddress.street')}
                      placeholder="House/Flat number, Street name, Area"
                      rows={2}
                    />
                    {errors.permanentAddress?.street && (
                      <p className="text-sm text-red-600 mt-1">{errors.permanentAddress.street.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="permanentAddress.city">City</Label>
                    <Input
                      id="permanentAddress.city"
                      {...register('permanentAddress.city')}
                      placeholder="City name"
                    />
                    {errors.permanentAddress?.city && (
                      <p className="text-sm text-red-600 mt-1">{errors.permanentAddress.city.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="permanentAddress.state">State</Label>
                    <Input
                      id="permanentAddress.state"
                      {...register('permanentAddress.state')}
                      placeholder="State name"
                    />
                    {errors.permanentAddress?.state && (
                      <p className="text-sm text-red-600 mt-1">{errors.permanentAddress.state.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="permanentAddress.pincode">Pincode</Label>
                    <Input
                      id="permanentAddress.pincode"
                      {...register('permanentAddress.pincode')}
                      placeholder="6-digit pincode"
                    />
                    {errors.permanentAddress?.pincode && (
                      <p className="text-sm text-red-600 mt-1">{errors.permanentAddress.pincode.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="permanentAddress.country">Country</Label>
                    <Input
                      id="permanentAddress.country"
                      {...register('permanentAddress.country')}
                      defaultValue="India"
                      readOnly
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Identity Documents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Identity Documents
            </CardTitle>
            <CardDescription>
              Upload government-authorized identity proofs (Aadhaar, PAN, Voter ID, Passport, etc.)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {identityProofs.map((proof, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Document {index + 1}</h4>
                  {identityProofs.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeIdentityProof(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Document Type</Label>
                    <Select
                      value={proof.documentType}
                      onValueChange={(value) => updateIdentityProof(index, 'documentType', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select document type" />
                      </SelectTrigger>
                      <SelectContent>
                        {documentTypeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Document Number</Label>
                    <Input
                      value={proof.documentNumber}
                      onChange={(e) => updateIdentityProof(index, 'documentNumber', e.target.value)}
                      placeholder="Enter document number"
                    />
                  </div>
                </div>

                <div>
                  <Label>Document Images (2-3 images recommended)</Label>
                  <EnhancedFileSelector
                    onFileSelect={() => {}} // Not needed since we use onUploadComplete
                    onUploadComplete={(result) => handleImageUpload(index, result)}
                    onError={(error) => handleUploadError(index, error)}
                    maxFileSize={5 * 1024 * 1024} // 5MB
                    acceptedTypes={['image/jpeg', 'image/png', 'image/webp']}
                    placeholder="Upload document images"
                    cloudinaryOptions={{
                      folder: 'kmwf/membership-requests',
                      tags: ['membership', 'identity-proof']
                    }}
                    className="mt-2"
                  />
                  {proof.images.length > 0 && (
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {proof.images.map((url, imgIndex) => (
                        <div key={imgIndex} className="relative">
                          <img
                            src={url}
                            alt={`Document ${index + 1} - Image ${imgIndex + 1}`}
                            className="w-full h-20 object-cover rounded border"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newImages = proof.images.filter((_, i) => i !== imgIndex)
                              updateIdentityProof(index, 'images', newImages)
                            }}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {identityProofs.length < 3 && (
              <Button
                type="button"
                variant="outline"
                onClick={addIdentityProof}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Another Document
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-center">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full md:w-auto px-8 py-3"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting Request...
              </>
            ) : (
              'Submit Membership Request'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}