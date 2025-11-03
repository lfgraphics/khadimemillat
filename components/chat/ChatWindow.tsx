"use client"
import React, { useEffect, useRef, useState } from 'react'
import useSWR from 'swr'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useUser } from '@clerk/nextjs'
import { Loader2, CreditCard, Check, CheckCheck } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function ChatWindow({ id }: { id: string }) {
    const { user } = useUser()
    const { data, mutate } = useSWR(`/api/protected/conversations/${id}/messages`, fetcher, { refreshInterval: 5000 })
    const [text, setText] = useState('')
    const listRef = useRef<HTMLDivElement | null>(null)
    const messages = data?.messages || []
    const [reservationInfo, setReservationInfo] = useState<{ expiresAt?: string; error?: string } | null>(null)
    const [paymentLoading, setPaymentLoading] = useState<string | null>(null)
    const [directPaymentLoading, setDirectPaymentLoading] = useState(false)
    const [isSending, setIsSending] = useState(false)
    const [pendingMessages, setPendingMessages] = useState<any[]>([])

    // Track messages that have been seen
    const [seenMessages, setSeenMessages] = useState<Set<string>>(new Set())

    // Get conversation details for direct payment
    const { data: convoData } = useSWR(`/api/protected/conversations/${id}`, fetcher)
    const conversation = convoData?.conversation
    const item = conversation?.scrapItemId
    const isAdmin = user?.publicMetadata?.role === 'admin' || user?.publicMetadata?.role === 'moderator'
    const currentUserId = user?.id

    // Track user activity in this conversation
    useEffect(() => {
        if (!currentUserId) return

        // Mark user as active in this conversation
        const markActive = () => {
            fetch(`/api/protected/conversations/${id}/activity`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            }).catch(() => { }) // Silent fail
        }

        // Mark user as inactive when leaving
        const markInactive = () => {
            fetch(`/api/protected/conversations/${id}/activity`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' }
            }).catch(() => { }) // Silent fail
        }

        markActive()

        // Handle visibility changes
        const handleVisibilityChange = () => {
            if (document?.hidden) {
                markInactive()
            } else {
                markActive()
            }
        }

        // Handle page unload
        const handleBeforeUnload = () => {
            markInactive()
        }

        document?.addEventListener('visibilitychange', handleVisibilityChange)
        window.addEventListener('beforeunload', handleBeforeUnload)

        // Periodic activity heartbeat
        const activityInterval = setInterval(markActive, 30000) // Every 30 seconds

        return () => {
            markInactive()
            document?.removeEventListener('visibilitychange', handleVisibilityChange)
            window.removeEventListener('beforeunload', handleBeforeUnload)
            clearInterval(activityInterval)
        }
    }, [currentUserId, id])

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight
        }
    }, [messages.length, pendingMessages.length])

    // Mark messages as seen when they come into view
    const markMessagesSeen = async (messageIds: string[]) => {
        if (messageIds.length === 0) return
        
        try {
            await fetch(`/api/protected/conversations/${id}/messages`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messageIds })
            })
            
            // Update local state
            setSeenMessages(prev => {
                const newSet = new Set(prev)
                messageIds.forEach(id => newSet.add(id))
                return newSet
            })
        } catch (error) {
            console.error('Failed to mark messages as seen:', error)
        }
    }

    // Set up intersection observer to detect when messages come into view
    useEffect(() => {
        if (!currentUserId || messages.length === 0) return

        const observer = new IntersectionObserver(
            (entries) => {
                const visibleMessageIds = entries
                    .filter(entry => entry.isIntersecting)
                    .map(entry => entry.target.getAttribute('data-message-id'))
                    .filter((id): id is string => {
                        if (!id) return false
                        const message = messages.find((m: any) => m._id === id)
                        return message && message.senderId !== currentUserId && !seenMessages.has(id)
                    })

                if (visibleMessageIds.length > 0) {
                    markMessagesSeen(visibleMessageIds)
                }
            },
            { threshold: 0.5 } // Message is considered seen when 50% visible
        )

        // Observe all message elements
        const messageElements = document?.querySelectorAll('[data-message-id]')
        messageElements.forEach(el => observer.observe(el))

        return () => observer.disconnect()
    }, [messages.length, currentUserId, seenMessages])

    useEffect(() => {
        if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
    }, [messages.length])

    const send = async () => {
        const content = text.trim()
        if (!content || isSending) return

        setIsSending(true)
        const tempId = Date.now().toString()

        // Create optimistic message
        const optimisticMessage = {
            _id: tempId,
            content,
            type: 'text',
            senderId: currentUserId,
            senderName: user?.fullName || user?.firstName || user?.username || 'You',
            createdAt: new Date().toISOString(),
            senderRole: user?.publicMetadata?.role || 'user',
            isPending: true
        }

        // Add to pending messages for immediate UI update
        setPendingMessages(prev => [...prev, optimisticMessage])
        setText('')

        try {
            const res = await fetch(`/api/protected/conversations/${id}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content,
                    type: 'text',
                    senderName: user?.fullName || user?.firstName || user?.username
                })
            })

            if (!res.ok) {
                const j = await res.json().catch(() => ({} as any))
                // Remove failed message from pending
                setPendingMessages(prev => prev.filter(m => m._id !== tempId))
                setText(content) // Restore text
                // @ts-ignore
                toast && toast.error && toast.error(j?.error || 'Failed to send message')
                return
            }

            // Remove from pending and refresh
            setPendingMessages(prev => prev.filter(m => m._id !== tempId))
            mutate()
        } catch (e: any) {
            console.error(e)
            // Remove failed message from pending
            setPendingMessages(prev => prev.filter(m => m._id !== tempId))
            setText(content) // Restore text
            // @ts-ignore
            toast && toast.error && toast.error(e?.message || 'Failed to send message')
        } finally {
            setIsSending(false)
        }
    }

    const payForRequest = async (amount: number, conversationId: string, messageId?: string) => {
        setPaymentLoading(messageId || 'direct')
        try {
            // Fetch conversation to retrieve item id
            const convoRes = await fetch(`/api/protected/conversations/${conversationId}`, { cache: 'no-store' })
            const convo = await convoRes.json()
            const itemId = convo?.conversation?.scrapItemId?._id || convo?.conversation?.scrapItemId
            if (!itemId) throw new Error('Missing item reference for purchase')
            // Create order for purchase; backend validates availability
            // Send the conversationId as referenceId so server can honor in-chat negotiated amount
            // Request buyer email if not known
            let buyerEmail = ''
            try {
                const who = await fetch('/api/protected/users?self=1', { cache: 'no-store' })
                const j = await who.json().catch(() => ({}))
                buyerEmail = j?.users?.[0]?.email || ''
            } catch { }
            if (!buyerEmail) {
                // naive prompt fallback in client UI
                // eslint-disable-next-line no-alert
                const input = window.prompt('Enter your email for the receipt (optional):')
                if (input && /[^\s@]+@[^\s@]+\.[^\s@]+/.test(input)) buyerEmail = input
            }
            const res = await fetch('/api/razorpay/create-order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'purchase', amount, referenceId: conversationId, email: buyerEmail || undefined }) })
            if (!res.ok) {
                const er = await res.json().catch(() => ({} as any))
                // Show reservation message if 409
                if (res.status === 409) {
                    const msg = er?.error || 'Item is currently reserved by another buyer'
                    // Optionally display expiresAt if provided
                    setReservationInfo({ error: msg, expiresAt: er?.expiresAt })
                    throw new Error(msg)
                }
                throw new Error(er.error || 'Failed to create payment order')
            }
            const order = await res.json()
            // Dynamically load Razorpay checkout
            // @ts-ignore
            const Razorpay = (window as any).Razorpay
            if (!Razorpay) {
                // load script if not present
                await new Promise<void>((resolve, reject) => {
                    const s = document?.createElement('script')
                    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
                    s.onload = () => resolve()
                    s.onerror = () => reject(new Error('Failed to load Razorpay'))
                    document?.body.appendChild(s)
                })
            }
            const keyId = order.keyId as string
            // @ts-ignore
            const rzp = new (window as any).Razorpay({
                key: keyId,
                amount: order.amount,
                currency: order.currency || 'INR',
                order_id: order.orderId,
                handler: async function (response: any) {
                    const vres = await fetch('/api/razorpay/verify-payment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'purchase', orderId: order.orderId, paymentId: response.razorpay_payment_id, signature: response.razorpay_signature, referenceId: itemId }) })
                    if (!vres.ok) {
                        const vjson = await vres.json().catch(() => ({} as any))
                        if (vres.status === 409 && (vjson?.error === 'Reservation expired' || vjson?.error === 'Reservation expired')) {
                            setReservationInfo({ error: vjson?.error || 'Reservation expired', expiresAt: vjson?.expiresAt })
                            // @ts-ignore
                            toast && toast.error && toast.error(vjson?.error || 'Reservation expired')
                            return
                        }
                        // @ts-ignore
                        toast && toast.error && toast.error(vjson?.error || 'Payment verification failed')
                        return
                    }
                    toast && toast.success && toast.success('Payment successful')
                    mutate()
                    // Refresh the page to update conversation status and admin actions
                    if (typeof window !== 'undefined') {
                        setTimeout(() => window.location.reload(), 1000) // Small delay to show success message
                    }
                }
            })
            // Add failure handler like DonationForm
            rzp.on('payment.failed', (resp: any) => {
                console.error('[PAYMENT_FAILED]', resp?.error)
                // @ts-ignore
                toast && toast.error && toast.error(resp?.error?.description || 'Payment failed. Please try again.')
            })

            // Add modal close handler for user cancellation
            rzp.on('payment.cancel', () => {
                // @ts-ignore
                toast && toast.info && toast.info('Payment cancelled by user')
            })

            try {
                rzp.open()
            } catch (openError: any) {
                console.error('[RAZORPAY_OPEN_ERROR]', openError)
                // @ts-ignore
                toast && toast.error && toast.error('Failed to open payment window. Please try again.')
                throw openError
            }
        } catch (e: any) {
            console.error(e)
            // @ts-ignore
            toast && toast.error && toast.error(e?.message || 'Payment failed to start')
        } finally {
            setPaymentLoading(null)
        }
    }

    const payDirectly = async () => {
        if (!item?.marketplaceListing?.demandedPrice) return
        await payForRequest(item.marketplaceListing.demandedPrice, id)
    }

    // Countdown component
    function Countdown({ iso }: { iso?: string }) {
        const [now, setNow] = useState(Date.now())
        useEffect(() => {
            const t = setInterval(() => setNow(Date.now()), 1000)
            return () => clearInterval(t)
        }, [])
        if (!iso) return null
        const expiry = new Date(iso).getTime()
        const ms = Math.max(0, expiry - now)
        const s = Math.floor(ms / 1000)
        const mm = Math.floor(s / 60)
        const ss = s % 60
        return <span className="font-mono">{mm}:{ss.toString().padStart(2, '0')}</span>
    }

    return (
        <div className="flex flex-col h-[85vh] sm:h-[85vh] sm:border sm:rounded-lg">
            {/* Direct payment option for buyers */}
            {!isAdmin && item?.marketplaceListing?.demandedPrice && !item?.marketplaceListing?.sold && (
                <div className="border-b bg-primary/5 dark:bg-primary/10 p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                            <div className="font-medium text-primary">Buy Now</div>
                            <div className="text-sm text-muted-foreground">₹{item.marketplaceListing.demandedPrice}</div>
                        </div>
                        <Button
                            onClick={payDirectly}
                            disabled={directPaymentLoading}
                            className="w-full sm:w-auto"
                            size="sm"
                        >
                            {directPaymentLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            {directPaymentLoading ? 'Processing...' : 'Pay Now'}
                        </Button>
                    </div>
                </div>
            )}

            <div ref={listRef} className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-3">
                {[...messages, ...pendingMessages].map((m: any) => {
                    const isCurrentUser = m.senderId === currentUserId
                    const isSystem = m.senderRole === 'system'
                    const isPending = m.isPending
                    const displayName = m.senderName && m.senderName !== 'User' ? m.senderName :
                        (isCurrentUser ? 'You' : m.senderRole === 'system' ? 'System' : 'Staff')

                    return (
                        <div key={m._id} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} px-1`} data-message-id={m._id}>
                            <div className={`${isSystem ? 'w-fit' : m.type === 'payment_request' || m.type === 'payment_completed' ? 'w-full max-w-sm sm:max-w-md' : 'max-w-[85%] sm:max-w-[75%]'}`}>
                                {m.type === 'payment_request' ? (
                                    <Card className={`${isCurrentUser ? 'bg-primary/10 border-primary/20' : 'bg-muted/50'} transition-colors w-full`}>
                                        <CardHeader className="pb-2">
                                            <div className="flex items-center justify-between">
                                                <CardTitle className="text-sm flex items-center gap-2">
                                                    <CreditCard className="h-4 w-4" />
                                                    Payment Request
                                                </CardTitle>
                                                <div className="text-xs text-muted-foreground">
                                                    {new Date(m.createdAt).toLocaleTimeString()}
                                                </div>
                                            </div>
                                            {!isSystem && (
                                                <div className="text-xs text-muted-foreground">
                                                    from {displayName}
                                                </div>
                                            )}
                                            {m.metadata?.note && (
                                                <div className="text-sm text-muted-foreground">
                                                    {m.metadata.note}
                                                </div>
                                            )}
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            <div className="text-lg font-semibold">₹{m.metadata?.amount}</div>
                                            {!isAdmin && !isCurrentUser && (
                                                <Button
                                                    size="sm"
                                                    onClick={() => payForRequest(Number(m.metadata?.amount || 0), id, m._id)}
                                                    disabled={paymentLoading === m._id}
                                                    className="w-full"
                                                >
                                                    {paymentLoading === m._id ? (
                                                        <>
                                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                            Processing...
                                                        </>
                                                    ) : (
                                                        'Pay Now'
                                                    )}
                                                </Button>
                                            )}
                                        </CardContent>
                                    </Card>
                                ) : m.type === 'payment_completed' ? (
                                    <div className="flex justify-center">
                                        <Card className="bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 w-full">
                                            <CardContent className="p-3 text-center">
                                                <div className="text-emerald-900 dark:text-emerald-100 text-sm font-medium">
                                                    {m.content}
                                                </div>
                                                <div className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                                                    {new Date(m.createdAt).toLocaleString()}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                ) : isSystem ? (
                                    <div className="flex justify-center">
                                        <div className="inline-block bg-muted text-muted-foreground text-xs px-3 py-1 rounded-full text-center max-w-xs">
                                            {m.content}
                                        </div>
                                    </div>
                                ) : (
                                    <div className={`relative ${isCurrentUser ? 'ml-8 sm:ml-12' : 'mr-8 sm:mr-12'}`}>
                                        {/* WhatsApp-style message bubble */}
                                        <div className={`rounded-lg p-3 relative ${isCurrentUser
                                            ? `bg-muted text-foreground rounded-tr-none ${isPending ? 'opacity-70' : ''}`
                                            : 'bg-primary text-primary-foreground rounded-tl-none'
                                            }`}>
                                            {/* Sender name */}
                                            {!isCurrentUser && (
                                                <div className="text-xs font-medium mb-1 opacity-80">
                                                    {displayName}
                                                </div>
                                            )}

                                            {/* Message content */}
                                            <div className="text-sm break-words pr-12">
                                                {m.content}
                                            </div>

                                            {/* Time stamp with pending indicator and seen status */}
                                            <div className={`text-xs absolute bottom-1 right-2 flex items-center gap-1 ${isCurrentUser ? 'text-muted-foreground' : 'text-primary-foreground/70'
                                                }`}>
                                                {isPending && (
                                                    <Loader2 className="h-3 w-3 animate-spin" />
                                                )}
                                                {isPending ? 'Sending...' : new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                
                                                {/* Seen indicators for current user's messages */}
                                                {isCurrentUser && !isPending && (
                                                    <>
                                                        {m.seenBy && m.seenBy.length > 0 ? (
                                                            <span title={`Seen by ${m.seenBy.length} user(s)`}>
                                                                <CheckCheck className="h-3 w-3 text-blue-500" />
                                                            </span>
                                                        ) : m.readBy && m.readBy.length > 1 ? ( // readBy includes sender, so > 1 means someone else read it
                                                            <span title="Delivered">
                                                                <Check className="h-3 w-3" />
                                                            </span>
                                                        ) : (
                                                            <span title="Sent">
                                                                <Check className="h-3 w-3 opacity-50" />
                                                            </span>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* WhatsApp-style arrow */}
                                        <div className={`absolute top-0 w-0 h-0 ${isCurrentUser
                                            ? 'right-[-8px] border-l-[8px] border-l-muted border-t-[8px] border-t-transparent scale-y-[-1]'
                                            : 'left-[-8px] border-r-[8px] border-r-primary border-t-[8px] border-t-transparent scale-y-[-1]'
                                            }`} />
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
                {messages.length === 0 && (
                    <div className="text-center text-sm text-muted-foreground py-8">
                        No messages yet. Start the conversation!
                    </div>
                )}
            </div>
            {reservationInfo && (
                <div className="border-t bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-100 p-3 sm:p-4">
                    <div className="flex flex-col gap-3">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            <span className="text-sm">{reservationInfo.error}</span>
                            {reservationInfo.expiresAt && (
                                <span className="text-xs text-amber-700 dark:text-amber-300">
                                    Try again in <Countdown iso={reservationInfo.expiresAt} />
                                </span>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => setReservationInfo(null)} className="flex-1 sm:flex-none">
                                Dismiss
                            </Button>
                            <Button size="sm" onClick={() => { setReservationInfo(null); mutate(); }} className="flex-1 sm:flex-none">
                                Try again
                            </Button>
                        </div>
                    </div>
                </div>
            )}
            <div className="border-t bg-background p-3 sm:p-4">
                <div className="flex gap-2">
                    <Input
                        value={text}
                        onChange={e => setText(e.target.value)}
                        placeholder={isSending ? "Sending..." : "Type a message..."}
                        onKeyDown={e => e.key === 'Enter' && !isSending && send()}
                        disabled={isSending}
                        className="flex-1 text-sm"
                    />
                    <Button
                        onClick={send}
                        disabled={!text.trim() || isSending}
                        size="sm"
                        className="px-4"
                    >
                        {isSending ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                Sending
                            </>
                        ) : (
                            'Send'
                        )}
                    </Button>
                </div>
            </div>
        </div>
    )
}
