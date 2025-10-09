"use client"
import React, { useState } from 'react'
import RoleGuard from '@/components/role-guard'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function PurchaseLookupPage() {
  const [orderId, setOrderId] = useState('')
  const [paymentId, setPaymentId] = useState('')
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const search = async () => {
    setError(null)
    setResult(null)
    setLoading(true)
    try {
      if (orderId.trim()) {
        const res = await fetch(`/api/protected/purchases/by-order/${encodeURIComponent(orderId.trim())}`)
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Not found')
        setResult(json.purchase)
      } else if (paymentId.trim()) {
        // Support search by paymentId via a tiny helper endpoint using query param
        const res = await fetch(`/api/protected/purchases?paymentId=${encodeURIComponent(paymentId.trim())}`)
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Not found')
        setResult(json.purchases?.[0] || null)
        if (!json.purchases?.length) throw new Error('Not found')
      } else {
        throw new Error('Enter orderId or paymentId')
      }
    } catch (e: any) {
      setError(e.message || 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <RoleGuard allowedRoles={["admin", "moderator"]}>
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <h1 className="text-xl font-semibold">Purchase Lookup</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-muted-foreground">Razorpay Order ID</label>
            <Input value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="order_..." />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Razorpay Payment ID</label>
            <Input value={paymentId} onChange={(e) => setPaymentId(e.target.value)} placeholder="pay_..." />
          </div>
        </div>
        <div>
          <Button onClick={search} disabled={loading}>Search</Button>
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
        {result && (
          <div className="rounded border p-4 text-sm space-y-2">
            <div><strong>Purchase ID:</strong> {result._id}</div>
            <div><strong>Status:</strong> {result.status}</div>
            <div><strong>Method:</strong> {result.paymentMethod}</div>
            <div><strong>Buyer:</strong> {result.buyerName} ({result.buyerId})</div>
            <div><strong>Order ID:</strong> {result.razorpayOrderId || '—'}</div>
            <div><strong>Payment ID:</strong> {result.razorpayPaymentId || '—'}</div>
            <div><strong>Amount:</strong> ₹{result.salePrice}</div>
            <div><strong>Item:</strong> {result.scrapItemId?.name || result.scrapItemId}</div>
            <div><strong>Created:</strong> {new Date(result.createdAt).toLocaleString()}</div>
            {result.completedAt && <div><strong>Completed:</strong> {new Date(result.completedAt).toLocaleString()}</div>}
          </div>
        )}
      </div>
    </RoleGuard>
  )
}
