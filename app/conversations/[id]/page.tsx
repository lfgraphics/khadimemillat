import { auth } from '@clerk/nextjs/server'
import Link from 'next/link'
import ChatWindow from '@/components/chat/ChatWindow'
import ConversationAdminActions from '@/components/chat/ConversationAdminActions'
import { headers } from 'next/headers'

export const dynamic = 'force-dynamic'

export default async function ConversationDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { userId } = await auth()
  if (!userId) return <div className="p-6">Please sign in to view this conversation.</div>

  const hdrs = await headers()
  const cookie = hdrs.get('cookie') || ''
  const host = hdrs.get('host') || 'localhost:3000'
  const proto = hdrs.get('x-forwarded-proto') || 'http'
  const base = `${proto}://${host}`
  const res = await fetch(`${base}/api/protected/conversations/${id}`, { cache: 'no-store', headers: { cookie } })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) return <div className="p-6">Not found or unauthorized.</div>
  const c = data.conversation
  
  // Check if payment has been completed (item sold)
  const hasCompletedPayment = c?.scrapItemId?.marketplaceListing?.sold || false
  
  let role = 'user'
  try {
    const who = await fetch(`${base}/api/protected/users?self=1`, { cache: 'no-store', headers: { cookie } })
    const whoJson = await who.json().catch(() => ({}))
    role = whoJson?.users?.[0]?.role || whoJson?.users?.[0]?.publicMetadata?.role || role
  } catch {}
  return (
    <div className="p-6 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Conversation: {c?.scrapItemId?.name}</h1>
        <div className="flex items-center gap-2">
          <ConversationAdminActions 
            conversationId={id} 
            role={role} 
            conversationStatus={c?.status}
            hasCompletedPayment={hasCompletedPayment}
          />
          <Link href="/conversations" className="text-sm text-primary">Back</Link>
        </div>
      </div>
      <div className="text-sm text-muted-foreground">
        Status: {c?.status}
        {hasCompletedPayment && (
          <span className="ml-2 text-green-600 font-medium">• Payment Completed</span>
        )}
      </div>
      <ChatWindow id={id} />
    </div>
  )
}
