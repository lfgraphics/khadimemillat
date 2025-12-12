import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { checkRole } from '@/lib/auth'
import connectDB from '@/lib/db'
import MembershipRequest from '@/models/MembershipRequest'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Users, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import Loading from '@/components/Loading'
import MembershipRequestReview from '@/components/admin/MembershipRequestReview'


async function getMembershipRequests() {
  await connectDB()
  
  const requests = await MembershipRequest.find({})
    .sort({ submittedAt: -1 })
    .lean()

  return requests.map((request: any) => ({
    _id: request._id.toString(),
    userId: request.userId,
    userEmail: request.userEmail,
    fullName: request.fullName,
    dateOfBirth: request.dateOfBirth.toISOString(),
    primaryContactNumber: request.primaryContactNumber,
    alternateContactNumber: request.alternateContactNumber,
    currentAddress: request.currentAddress,
    permanentAddress: request.permanentAddress,
    isSameAddress: request.isSameAddress,
    identityProofs: request.identityProofs.map((proof: any) => ({
      documentType: proof.documentType,
      documentNumber: proof.documentNumber,
      images: proof.images
    })),
    status: request.status,
    submittedAt: request.submittedAt.toISOString(),
    reviewedAt: request.reviewedAt?.toISOString(),
    reviewedBy: request.reviewedBy,
    reviewComments: request.reviewComments,
    membershipId: request.membershipId,
    membershipStartDate: request.membershipStartDate?.toISOString()
  }))
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

async function MembershipRequestsContent() {
  // Check if user has admin or moderator role
  const hasAccess = await checkRole(['admin', 'moderator'])
  
  if (!hasAccess) {
    redirect('/unauthorized')
  }

  const requests = await getMembershipRequests()

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    underReview: requests.filter(r => r.status === 'under_review').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length
  }

  const pendingRequests = requests.filter(r => r.status === 'pending')
  const underReviewRequests = requests.filter(r => r.status === 'under_review')
  const completedRequests = requests.filter(r => ['approved', 'rejected'].includes(r.status))

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            Membership Requests
          </h1>
          <p className="text-muted-foreground mt-2">
            Review and manage membership applications
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{stats.underReview}</p>
                <p className="text-sm text-muted-foreground">Under Review</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats.approved}</p>
                <p className="text-sm text-muted-foreground">Approved</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{stats.rejected}</p>
                <p className="text-sm text-muted-foreground">Rejected</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Requests Tabs */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">
            Pending ({stats.pending})
          </TabsTrigger>
          <TabsTrigger value="under-review">
            Under Review ({stats.underReview})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({stats.approved + stats.rejected})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingRequests.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No pending requests</p>
              </CardContent>
            </Card>
          ) : (
            pendingRequests.map((request) => (
              <MembershipRequestReview key={request._id} request={request} />
            ))
          )}
        </TabsContent>

        <TabsContent value="under-review" className="space-y-4">
          {underReviewRequests.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No requests under review</p>
              </CardContent>
            </Card>
          ) : (
            underReviewRequests.map((request) => (
              <MembershipRequestReview key={request._id} request={request} />
            ))
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedRequests.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No completed requests</p>
              </CardContent>
            </Card>
          ) : (
            completedRequests.map((request) => (
              <MembershipRequestReview key={request._id} request={request} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function MembershipRequestsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <MembershipRequestsContent />
    </Suspense>
  )
}

export const metadata = {
  title: 'Membership Requests - Admin Panel',
  description: 'Review and manage membership applications',
}