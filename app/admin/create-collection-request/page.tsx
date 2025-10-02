import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import CreateCollectionRequestClient from './CreateCollectionRequestClient'

export default async function CreateCollectionRequestPage() {
  const { sessionClaims } = await auth()
  const role = (sessionClaims as any)?.metadata?.role || 'user'

  // Role-based access control: admin/moderator only
  if (!['admin', 'moderator'].includes(role)) {
    redirect('/unauthorized')
  }

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Create Collection Request</h1>
          <p className="text-muted-foreground">
            Create a collection request on behalf of a user
          </p>
        </div>
        
        <CreateCollectionRequestClient />
      </div>
    </div>
  )
}