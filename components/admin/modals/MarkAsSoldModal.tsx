"use client"
import React, { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

type Props = {
  itemId: string
  trigger?: React.ReactNode
  defaultSalePrice?: number
  conversationId?: string // optional conversation id to fetch participants
}

export default function MarkAsSoldModal({ itemId, trigger, defaultSalePrice, conversationId: conversationIdProp }: Props) {
  const [open, setOpen] = useState(false)
  const [salePrice, setSalePrice] = useState<string>(defaultSalePrice ? String(defaultSalePrice) : '')
  const [buyerName, setBuyerName] = useState('')
  const [buyerId, setBuyerId] = useState('')
  const [soldVia, setSoldVia] = useState<'offline' | 'chat'>('offline')
  const [conversationId, setConversationId] = useState(conversationIdProp || '')
  const [submitting, setSubmitting] = useState(false)
  const [participants, setParticipants] = useState<Array<{ id: string; label: string }>>([])

  // Fetch participants when conversationId provided
  useEffect(() => {
    let ignore = false
    const fetchParticipants = async () => {
      if (!conversationId) return
      try {
        const res = await fetch(`/api/protected/conversations/${conversationId}`)
        if (!res.ok) return
        const data = await res.json()
        const convo = data?.conversation
        const parts: string[] = (convo?.participants || [])
        const buyerId = convo?.buyerId as string | undefined
        // Fetch user display names in one go
        let nameMap: Record<string, { name?: string; role?: string }> = {}
        if (parts.length) {
          try {
            const ures = await fetch(`/api/protected/users?ids=${encodeURIComponent(parts.join(','))}`)
            if (ures.ok) {
              const uj = await ures.json()
              const users = Array.isArray(uj?.users) ? uj.users : []
              for (const u of users) {
                nameMap[u.clerkUserId] = { name: u.name || u.fullName || u.email || u.clerkUserId, role: u.role }
              }
            }
          } catch {}
        }
        const list = parts.map((p: string) => {
          const nm = nameMap[p]
          const labelBase = nm?.name || p
          const roleTag = nm?.role ? ` (${nm.role})` : ''
          const buyerTag = p === buyerId ? ' (buyer)' : ''
          return { id: p, label: `${labelBase}${roleTag}${buyerTag}` }
        })
        if (!ignore) setParticipants(list)
        // Default to buyerId when available
        if (buyerId && !ignore) setBuyerId(prev => prev || buyerId)
      } catch {}
    }
    fetchParticipants()
    return () => { ignore = true }
  }, [conversationId])

  const submit = async () => {
    const price = parseFloat(salePrice)
    if (!price || price <= 0) {
      toast.error('Enter a valid sale price')
      return
    }
    if (soldVia === 'chat' && !conversationId) {
      toast.error('Provide conversation ID when sold via chat')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/protected/scrap-items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marketplaceListing: {
            sold: true,
            salePrice: price,
            soldToName: buyerName || undefined,
            soldToUserId: buyerId || undefined,
            soldVia,
            conversationId: conversationId || undefined
          }
        })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error || 'Failed to mark as sold')
      }
      toast.success('Item marked as sold')
      setOpen(false)
      // Simple refresh to reflect new state
      window.location.reload()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button variant="secondary" size="sm">Mark Sold</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Mark item as sold</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid gap-1.5">
            <Label>Sale price (INR)</Label>
            <Input type="number" inputMode="decimal" value={salePrice} onChange={e => setSalePrice(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Sold via</Label>
            <Select value={soldVia} onValueChange={v => setSoldVia(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Select channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="offline">Offline</SelectItem>
                <SelectItem value="chat">Chat</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">Note: Online sales are completed via chat payment flow and Razorpay verification.</p>
          {soldVia === 'chat' && (
            <>
              <div className="grid gap-1.5">
                <Label>Conversation ID</Label>
                <Input value={conversationId} onChange={e => setConversationId(e.target.value)} placeholder="convo id" />
              </div>
              {conversationId && (
                <div className="grid gap-1.5">
                  <Label>Select buyer from participants</Label>
                  <Select value={buyerId} onValueChange={v => setBuyerId(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose buyer" />
                    </SelectTrigger>
                    <SelectContent>
                      {participants.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}
          <div className="grid gap-1.5">
            <Label>Buyer name (optional)</Label>
            <Input value={buyerName} onChange={e => setBuyerName(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Buyer user ID (optional)</Label>
            <Input value={buyerId} onChange={e => setBuyerId(e.target.value)} placeholder="clerk user id or user _id" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={submit} disabled={submitting}>{submitting ? 'Saving…' : 'Confirm'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
