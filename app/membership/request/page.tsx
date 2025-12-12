import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import connectDB from '@/lib/db'
import MembershipRequest from '@/models/MembershipRequest'
import MembershipRequestForm from '@/components/forms/MembershipRequestForm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react'
import Loading from '@/components/Loading'

async function getMembershipRequestStatus(userId: string) {
  await connectDB()
  
  const request = await MembershipRequest.findOne({ userId }).lean()
  if (!request) return null
  
  return {
    _id: (request as any)._id.toString(),
    status: (request as any).status,
    submittedAt: (request as any).submittedAt.toISOString(),
    reviewedAt: (request as any).reviewedAt?.toISOString(),
    reviewComments: (request as any).reviewComments,
    membershipId: (request as any).membershipId,
    membershipStartDate: (request as any).membershipStartDate?.toISOString()
  }
}

function StatusBadge({ status }: { status: string }) {
  const statusConfig = {
    pending: { icon: Clock, variant: 'secondary' as const, label: 'Pending Review', className: '' },
    under_review: { icon: AlertCircle, variant: 'default' as const, label: 'Under Review', className: '' },
    approved: { icon: CheckCircle, variant: 'default' as const, label: 'Approved', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
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

async function MembershipRequestContent() {
  const { userId } = await auth()
  
  if (!userId) {
    redirect('/sign-in')
  }

  const existingRequest = await getMembershipRequestStatus(userId)

  if (existingRequest) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Membership Request Status
              <StatusBadge status={existingRequest.status} />
            </CardTitle>
            <CardDescription>
              Your membership request has been submitted and is being processed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Submitted On</p>
                <p className="text-lg">{new Date(existingRequest.submittedAt).toLocaleDateString('en-IN')}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-muted-foreground">Request ID</p>
                <p className="text-lg font-mono">{existingRequest._id.toString().slice(-8)}</p>
              </div>

              {existingRequest.membershipId && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Membership ID</p>
                  <p className="text-lg font-mono text-green-500">{existingRequest.membershipId}</p>
                </div>
              )}

              {existingRequest.reviewedAt && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Reviewed On</p>
                  <p className="text-lg">{new Date(existingRequest.reviewedAt).toLocaleDateString('en-IN')}</p>
                </div>
              )}
            </div>

            {existingRequest.reviewComments && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Review Comments</p>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-sm">{existingRequest.reviewComments}</p>
                </div>
              </div>
            )}

            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <h4 className="font-semibold mb-2">What's Next?</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                {existingRequest.status === 'pending' && (
                  <>
                    <li>• Your request is in the queue for review</li>
                    <li>• Our team will verify your documents within 3-5 business days</li>
                    <li>• You'll receive a notification once the review is complete</li>
                  </>
                )}
                {existingRequest.status === 'under_review' && (
                  <>
                    <li>• Our team is currently reviewing your documents</li>
                    <li>• This process typically takes 1-2 business days</li>
                    <li>• You'll be notified once the review is complete</li>
                  </>
                )}
                {existingRequest.status === 'approved' && (
                  <>
                    <li>• Congratulations! Your membership has been approved</li>
                    <li>• You can now access financial reports and member-exclusive features</li>
                    <li>• Your membership ID is: {existingRequest.membershipId}</li>
                  </>
                )}
                {existingRequest.status === 'rejected' && (
                  <>
                    <li>• Your membership request was not approved</li>
                    <li>• Please review the comments above for more details</li>
                    <li>• You may submit a new request after addressing the issues</li>
                  </>
                )}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <MembershipRequestForm />
}

export default function MembershipRequestPage() {
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<Loading />}>
        <MembershipRequestContent />
      </Suspense>
    </div>
  )
}

export const metadata = {
  title: 'Membership Request - Khadim-e-Millat Welfare Foundation',
  description: 'Apply for verified membership to access exclusive features and financial reports',
}