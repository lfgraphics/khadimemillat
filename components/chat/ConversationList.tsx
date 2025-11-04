"use client"
import useSWR from 'swr'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useEffect, useRef } from 'react'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function ConversationList({ initial }: { initial?: any[] }) {
  const isPageVisible = useRef(true)
  
  // Monitor page visibility for auto-refresh
  useEffect(() => {
    const handleVisibilityChange = () => {
      isPageVisible.current = !document?.hidden
    }
    document?.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document?.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])
  
  const { data } = useSWR(`/api/protected/conversations`, fetcher, { 
    refreshInterval: (data) => isPageVisible.current ? 10000 : 0, // Only refresh when page is visible
    // Use server-fetched conversations to avoid an immediate client re-fetch
    fallbackData: initial ? { conversations: initial } : undefined,
    revalidateOnMount: initial ? false : true,
    revalidateOnFocus: true
  })
  
  const conversations = data?.conversations || []
  
  // Sort: latest first, then by status (active before completed/cancelled)
  const sortedConversations = [...conversations].sort((a, b) => {
    // First by last message time (latest first)
    const aTime = new Date(a.lastMessageAt || a.createdAt).getTime()
    const bTime = new Date(b.lastMessageAt || b.createdAt).getTime()
    if (aTime !== bTime) return bTime - aTime
    
    // Then by status (active conversations first)
    if (a.status !== b.status) {
      if (a.status === 'active') return -1
      if (b.status === 'active') return 1
    }
    return 0
  })
  
  return (
    <div className="space-y-2">
      {sortedConversations.map((c: any) => {
        const preview = (c.lastMessage?.content || '').slice(0, 80)
        const isCompleted = c.status === 'completed' || c.status === 'cancelled'
        const hasRecentActivity = c.lastMessageAt && 
          (Date.now() - new Date(c.lastMessageAt).getTime()) < 24 * 60 * 60 * 1000 // 24 hours
        const isNew = !c.lastMessageAt || 
          (Date.now() - new Date(c.createdAt).getTime()) < 60 * 60 * 1000 // 1 hour
        
        return (
          <Card key={c._id} className={`transition-all duration-200 hoact:shadow-md ${
            isCompleted ? 'opacity-60 bg-muted/30' : 'hoact:bg-accent/50'
          }`}>
            <Link href={`/conversations/${c._id}`} className="block">
              <div className="p-3 sm:p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`font-medium truncate ${isCompleted ? 'text-muted-foreground' : 'text-foreground'}`}>
                        {c.scrapItemId?.name || 'Item'}
                      </span>
                      {isNew && (
                        <Badge variant="secondary" className="bg-primary/10 text-primary text-xs shrink-0">
                          New
                        </Badge>
                      )}
                      {hasRecentActivity && !isNew && !isCompleted && (
                        <div className="w-2 h-2 bg-green-500 rounded-full shrink-0"></div>
                      )}
                      {isCompleted && (
                        <Badge variant="outline" className="text-xs shrink-0">
                          {c.status === 'completed' ? 'Completed' : 'Cancelled'}
                        </Badge>
                      )}
                    </div>
                    
                    {/* Last message preview with sender name */}
                    {c.lastMessage && (
                      <div className={`text-sm mb-2 ${
                        isCompleted ? 'text-muted-foreground/70' : 'text-muted-foreground'
                      }`}>
                        <span className="font-medium text-xs">
                          {c.lastMessage.senderName || 'Unknown'}: 
                        </span>
                        <span className="ml-1">
                          {c.lastMessage.type === 'payment_request' ? '💳 Payment request' :
                           c.lastMessage.type === 'payment_completed' ? '✅ Payment completed' :
                           (preview || 'Message')}
                        </span>
                      </div>
                    )}
                    
                    {!c.lastMessage && (
                      <div className={`text-sm mb-2 ${
                        isCompleted ? 'text-muted-foreground/70' : 'text-muted-foreground'
                      }`}>
                        Started conversation
                      </div>
                    )}
                    
                    <div className={`text-xs flex items-center justify-between ${
                      isCompleted ? 'text-muted-foreground/70' : 'text-muted-foreground'
                    }`}>
                      <span>
                        {new Date(c.lastMessageAt || c.createdAt).toLocaleString()}
                      </span>
                      
                      {/* Unread indicator placeholder */}
                      {hasRecentActivity && !isCompleted && (
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                      )}
                    </div>
                  </div>
                  <div className="text-muted-foreground shrink-0 self-center">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>
          </Card>
        )
      })}
      {conversations.length === 0 && (
        <div className="text-center py-12">
          <div className="text-muted-foreground text-sm mb-2">No conversations yet</div>
          <div className="text-xs text-muted-foreground">
            Start one by clicking "Purchase" on an item in the marketplace
          </div>
        </div>
      )}
    </div>
  )
}
