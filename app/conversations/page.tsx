import { auth } from '@clerk/nextjs/server'
import Link from 'next/link'
import ConversationList from '@/components/chat/ConversationList'
import { headers } from 'next/headers'

export const dynamic = 'force-dynamic'

export default async function ConversationsPage() {
  const { userId } = await auth()
  if (!userId) {
    return (
      <div className="p-6">
        <p>Please sign in to view conversations.</p>
      </div>
    )
  }

  const hdrs = await headers()
  const cookie = hdrs.get('cookie') || ''
  const host = hdrs.get('host') || 'localhost:3000'
  const proto = hdrs.get('x-forwarded-proto') || 'http'
  const base = `${proto}://${host}`
  const res = await fetch(`${base}/api/protected/conversations`, { cache: 'no-store', headers: { cookie } })
  const data = await res.json().catch(() => ({ conversations: [] }))

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Conversations</h1>
      <ConversationList initial={data.conversations} />
    </div>
  )
}
