'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import Link from 'next/link'
import { 
  User, 
  MapPin, 
  Phone, 
  Calendar, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Eye,
  Clock,
  AlertCircle,
  ExternalLink
} from 'lucide-react'
import { toast } from 'sonner'

interface MembershipRequestReviewProps {
  request: {
    _id: string
    userId: string
    userEmail: string
    fullName: string
    dateOfBirth: string
    primaryContactNumber: string
    alternateContactNumber?: string
    currentAddress: {
      street: string
      city: string
      state: string
      pincode: string
      country: string
    }
    permanentAddress: {
      street: string
      city: string
      state: string
      pincode: string
      country: string
    }
    isSameAddress: boolean
    identityProofs: {
      documentType: string
      documentNumber: string
      images: string[]
    }[]
    status: string
    submittedAt: string
    reviewedAt?: string
    reviewedBy?: string
    reviewComments?: string
    membershipId?: string
    membershipStartDate?: string
  }
}

function StatusBadge({ status }: { status: string }) {
  const statusConfig = {
    pending: { icon: Clock, variant: 'secondary' as const, label: 'Pending', className: '' },
    under_review: { icon: AlertCircle, variant: 'default' as const, label: 'Under Review', className: '' },
    approved: { icon: CheckCircle, variant: 'default' as const, label: 'Approved', className: 'bg-primary/10 text-primary' },
    rejected: { icon: XCircle, variant: 'destructive' as const, label: 'Rejected', className: '' }
  }

  const config = statusConfig[status as keyof typeof statusConfig]
  const Icon = config.icon

  return (
    <Badge variant={config.variant} className={config.className}>
      <Icon className="w-3 h-3 mr-1" />
      {config.label}
    </Badge>
  )
}

function getDocumentTypeLabel(type: string) {
  const labels = {
    aadhaar: 'Aadhaar Card',
    pan: 'PAN Card',
    voter_id: 'Voter ID',
    passport: 'Passport',
    driving_license: 'Driving License'
  }
  return labels[type as keyof typeof labels] || type
}

export default function MembershipRequestReview({ request }: MembershipRequestReviewProps) {
  const [isReviewing, setIsReviewing] = useState(false)
  const [reviewComments, setReviewComments] = useState('')
  const [showDetails, setShowDetails] = useState(false)

  const handleReview = async (action: 'approve' | 'reject' | 'under_review') => {
    setIsReviewing(true)
    
    try {
      const response = await fetch(`/api/admin/membership-requests/${request._id}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action,
          comments: reviewComments
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to review request')
      }

      toast.success(`Request ${action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'marked under review'} successfully`)
      window.location.reload() // Refresh to show updated status
    } catch (error) {
      console.error('Review error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to review request')
    } finally {
      setIsReviewing(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
  }

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date()
    const birthDate = new Date(dateOfBirth)
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    
    return age
  }



  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{request.fullName}</CardTitle>
              <CardDescription>{request.userEmail}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={request.status} />
            <Dialog open={showDetails} onOpenChange={setShowDetails}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Eye className="w-4 h-4 mr-2" />
                  View Details
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Membership Request Details</DialogTitle>
                  <DialogDescription>
                    Review all submitted information and documents
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-6">
                  {/* Personal Information */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <User className="w-5 h-5" />
                      Personal Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/50 rounded-lg p-4">
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Full Name</Label>
                        <p className="text-sm font-medium">{request.fullName}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                        <p className="text-sm font-medium">{request.userEmail}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Date of Birth</Label>
                        <p className="text-sm font-medium">
                          {formatDate(request.dateOfBirth)} ({calculateAge(request.dateOfBirth)} years)
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Primary Contact</Label>
                        <p className="text-sm font-medium">{request.primaryContactNumber}</p>
                      </div>
                      {request.alternateContactNumber && (
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Alternate Contact</Label>
                          <p className="text-sm font-medium">{request.alternateContactNumber}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Address Information */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <MapPin className="w-5 h-5" />
                      Address Information
                    </h3>
                    <div className="space-y-4">
                      <div className="bg-muted/50 rounded-lg p-4">
                        <h4 className="font-medium mb-2">Current Address</h4>
                        <p className="text-sm text-muted-foreground">
                          {request.currentAddress.street}<br />
                          {request.currentAddress.city}, {request.currentAddress.state} - {request.currentAddress.pincode}<br />
                          {request.currentAddress.country}
                        </p>
                      </div>
                      
                      {!request.isSameAddress && (
                        <div className="bg-muted/50 rounded-lg p-4">
                          <h4 className="font-medium mb-2">Permanent Address</h4>
                          <p className="text-sm text-muted-foreground">
                            {request.permanentAddress.street}<br />
                            {request.permanentAddress.city}, {request.permanentAddress.state} - {request.permanentAddress.pincode}<br />
                            {request.permanentAddress.country}
                          </p>
                        </div>
                      )}
                      
                      {request.isSameAddress && (
                        <p className="text-sm text-primary">
                          ✓ Permanent address is same as current address
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Identity Documents */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Identity Documents
                    </h3>
                    <div className="space-y-4">
                      {request.identityProofs.map((proof, index) => (
                        <div key={index} className="bg-muted/50 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium">{getDocumentTypeLabel(proof.documentType)}</h4>
                            <Badge variant="outline">{proof.documentNumber}</Badge>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {proof.images.map((imageUrl, imgIndex) => (
                              <div key={imgIndex} className="relative group">
                                <Link 
                                  href={imageUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="block"
                                >
                                  <img
                                    src={imageUrl}
                                    alt={`${getDocumentTypeLabel(proof.documentType)} - Image ${imgIndex + 1}`}
                                    className="w-full h-24 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                                  />
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                                    <ExternalLink className="w-4 h-4 text-white" />
                                  </div>
                                </Link>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Request Timeline */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      Request Timeline
                    </h3>
                    <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Submitted:</span>
                        <span className="text-sm">{formatDate(request.submittedAt)}</span>
                      </div>
                      {request.reviewedAt && (
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Reviewed:</span>
                          <span className="text-sm">{formatDate(request.reviewedAt)}</span>
                        </div>
                      )}
                      {request.membershipStartDate && (
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Membership Started:</span>
                          <span className="text-sm">{formatDate(request.membershipStartDate)}</span>
                        </div>
                      )}
                      {request.membershipId && (
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Membership ID:</span>
                          <span className="text-sm font-mono text-primary">{request.membershipId}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Review Comments */}
                  {request.reviewComments && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Review Comments</h3>
                      <div className="bg-muted/50 rounded-lg p-4">
                        <p className="text-sm">{request.reviewComments}</p>
                      </div>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Submitted</p>
              <p className="text-xs text-muted-foreground">{formatDate(request.submittedAt)}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Contact</p>
              <p className="text-xs text-muted-foreground">{request.primaryContactNumber}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Documents</p>
              <p className="text-xs text-muted-foreground">{request.identityProofs.length} uploaded</p>
            </div>
          </div>
        </div>

        {/* Review Actions */}
        {['pending', 'under_review'].includes(request.status) && (
          <div className="space-y-4 pt-4 border-t">
            <div>
              <Label htmlFor="reviewComments" className="text-sm font-medium">
                Review Comments (Optional)
              </Label>
              <Textarea
                id="reviewComments"
                value={reviewComments}
                onChange={(e) => setReviewComments(e.target.value)}
                placeholder="Add comments about the review decision..."
                className="mt-1"
                rows={3}
              />
            </div>
            
            <div className="flex flex-wrap gap-2">
              {request.status === 'pending' && (
                <Button
                  onClick={() => handleReview('under_review')}
                  disabled={isReviewing}
                  variant="outline"
                  size="sm"
                >
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Mark Under Review
                </Button>
              )}
              
              <Button
                onClick={() => handleReview('approve')}
                disabled={isReviewing}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                size="sm"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve
              </Button>
              
              <Button
                onClick={() => handleReview('reject')}
                disabled={isReviewing}
                variant="destructive"
                size="sm"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject
              </Button>
            </div>
          </div>
        )}

        {/* Completed Review Info */}
        {['approved', 'rejected'].includes(request.status) && request.reviewComments && (
          <div className="pt-4 border-t">
            <Label className="text-sm font-medium text-muted-foreground">Review Comments</Label>
            <p className="text-sm mt-1 bg-muted/50 rounded p-2">{request.reviewComments}</p>
          </div>
        )}
      </CardContent>


    </Card>
  )
}