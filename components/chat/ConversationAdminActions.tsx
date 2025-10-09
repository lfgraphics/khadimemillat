"use client"
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import PaymentRequestModal from '@/components/chat/PaymentRequestModal'

export default function ConversationAdminActions({ 
  conversationId, 
  role, 
  conversationStatus,
  hasCompletedPayment = false 
}: { 
  conversationId: string; 
  role: string; 
  conversationStatus?: string;
  hasCompletedPayment?: boolean;
}) {
  const isStaff = role === 'admin' || role === 'moderator'
  if (!isStaff) return null

  // Disable actions if conversation is already completed/cancelled or payment is completed
  const isDisabled = conversationStatus === 'completed' || conversationStatus === 'cancelled' || hasCompletedPayment

  const updateStatus = async (status: 'completed' | 'cancelled') => {
    if (isDisabled) {
      toast.error('Cannot update status - conversation is already finalized or payment completed')
      return
    }
    
    try {
      const res = await fetch(`/api/protected/conversations/${conversationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({} as any))
        throw new Error(j?.error || 'Failed to update conversation')
      }
      toast.success(`Conversation ${status}`)
      // Simple refresh
      if (typeof window !== 'undefined') window.location.reload()
    } catch (e: any) {
      console.error(e)
      toast.error(e?.message || 'Failed to update conversation')
    }
  }

  return (
    <div className="flex items-center gap-2">
      {isDisabled && hasCompletedPayment && (
        <div className="text-sm text-green-600 font-medium mr-2">
          ✓ Payment Completed
        </div>
      )}
      <PaymentRequestModal conversationId={conversationId} disabled={isDisabled} />
      <Button 
        size="sm" 
        className="bg-emerald-600" 
        onClick={() => updateStatus('completed')}
        disabled={isDisabled}
      >
        {conversationStatus === 'completed' ? 'Completed' : 'Mark Completed'}
      </Button>
      <Button 
        size="sm" 
        className="bg-rose-600" 
        onClick={() => updateStatus('cancelled')}
        disabled={isDisabled}
      >
        {conversationStatus === 'cancelled' ? 'Cancelled' : 'Cancel'}
      </Button>
    </div>
  )
}
