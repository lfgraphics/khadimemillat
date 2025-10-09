"use client"
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

export default function PaymentRequestModal({ conversationId, disabled = false }: { conversationId: string; disabled?: boolean }) {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')

  const sendRequest = async () => {
    const value = parseFloat(amount)
    if (!value || value <= 0) { toast.error('Enter a valid amount'); return }
    try {
      const res = await fetch(`/api/protected/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'payment_request', content: '', metadata: { amount: value, note } })
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({} as any))
        throw new Error(j?.error || 'Failed to send payment request')
      }
      toast.success('Payment request sent')
      setAmount('')
      setNote('')
      setOpen(false)
    } catch (e: any) {
      console.error(e)
      toast.error(e?.message || 'Failed to send payment request')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" disabled={disabled}>Request Payment</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create payment request</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Input placeholder="Amount (INR)" value={amount} onChange={e => setAmount(e.target.value)} />
          <Input placeholder="Note (optional)" value={note} onChange={e => setNote(e.target.value)} />
          <div className="flex justify-end">
            <Button onClick={sendRequest}>Send</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
