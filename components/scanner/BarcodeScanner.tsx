"use client"
import React, { useEffect, useRef, useState } from 'react'
import { decodeBarcodeFromVideo, validateItemId } from '@/lib/utils/barcode-decoder'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

type Props = {
  onDecoded?: (text: string) => void
}

export default function BarcodeScanner({ onDecoded }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const [active, setActive] = useState(false)
  const [loading, setLoading] = useState(false)
  const [manual, setManual] = useState('')
  const [lookup, setLookup] = useState<any | null>(null)
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupError, setLookupError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    return () => stop()
  }, [])

  const start = async () => {
    if (active) return
    setLoading(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setActive(true)
      tick()
    } catch (err) {
      console.error(err)
      toast.error('Camera access denied or unavailable')
    } finally {
      setLoading(false)
    }
  }

  const stop = () => {
    setActive(false)
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }

  const fetchDetails = async (id: string) => {
    setLookup(null)
    setLookupError(null)
    setLookupLoading(true)
    try {
      const res = await fetch(`/api/protected/scrap-items/${id}/barcode`, { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Lookup failed')
      setLookup(json)
    } catch (e: any) {
      setLookupError(e.message || 'Lookup failed')
    } finally {
      setLookupLoading(false)
    }
  }

  const handleDecoded = async (text: string) => {
    if (!text) return
    if (!validateItemId({ decodedText: text })) {
      toast.error('Invalid item id in barcode')
      return
    }
    onDecoded?.(text)
    stop()
    await fetchDetails(text)
  }

  const tick = async () => {
    if (!active) return
    if (videoRef.current && (videoRef.current.readyState === 2 || videoRef.current.readyState === 3 || videoRef.current.readyState === 4)) {
      try {
        const text = await decodeBarcodeFromVideo({ videoElement: videoRef.current })
        if (text) {
          await handleDecoded(text)
          return
        }
      } catch (e) {
        console.warn('[SCAN_ERROR]', e)
      }
    }
    // Backoff slightly to reduce CPU usage
    await new Promise(r => setTimeout(r, 100))
    rafRef.current = requestAnimationFrame(tick)
  }

  const submitManual = () => {
    const text = manual.trim()
    if (!text) return
    handleDecoded(text)
  }

  return (
    <div className="space-y-3">
      <div className="aspect-video w-full bg-black/5 rounded flex items-center justify-center overflow-hidden">
        <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
      </div>
      <div className="flex gap-2">
        <Button onClick={start} disabled={loading || active}>{loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Starting...</> : active ? 'Scanning…' : 'Start scanning'}</Button>
        <Button onClick={stop} variant="secondary" disabled={!active}>Stop</Button>
      </div>
      <div className="flex items-center gap-2">
        <Input placeholder="Enter item id manually" value={manual} onChange={e => setManual(e.target.value)} />
        <Button onClick={submitManual}>Go</Button>
      </div>
      {lookupLoading && <div className="text-sm text-muted-foreground">Loading item details…</div>}
      {lookupError && <div className="text-sm text-red-600">{lookupError}</div>}
      {lookup && (
        <div className="border rounded p-3 space-y-2">
          <div className="font-medium">{lookup.item?.name}</div>
          <div className="text-sm text-muted-foreground">Condition: {lookup.item?.condition}</div>
          {Array.isArray(lookup.item?.photos?.after) && lookup.item.photos.after[0] && (
            <img alt="Item" className="w-40 rounded" src={lookup.item.photos.after[0]} />
          )}
          <div className="text-sm">Sold: {lookup.item?.marketplaceListing?.sold ? 'Yes' : 'No'}</div>
          {lookup.donor && (
            <div className="text-sm">
              <div className="font-medium">Donor</div>
              <div>{lookup.donor.name} ({lookup.donor.id})</div>
              {lookup.donor.email && <div>{lookup.donor.email}</div>}
              {lookup.donor.phone && <div>{lookup.donor.phone}</div>}
            </div>
          )}
          <div className="text-sm">
            <div className="font-medium">Donor Stats</div>
            <div>Total Donations: {lookup.donorStats?.totalDonations}</div>
            <div>Total Items: {lookup.donorStats?.totalItems}</div>
          </div>
          {Array.isArray(lookup.donorOtherItems) && lookup.donorOtherItems.length > 0 && (
            <div className="text-sm space-y-1">
              <div className="font-medium">Other Items</div>
              {lookup.donorOtherItems.slice(0, 4).map((it: any) => (
                <div key={it._id} className="flex items-center gap-2">
                  {it.photos?.after?.[0] && <img alt="" src={it.photos.after[0]} className="w-12 h-12 rounded object-cover" />}
                  <div>{it.name}</div>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" onClick={() => router.push(`/app/field-executive/items/${lookup.item?._id}`)}>View full details</Button>
            <Button onClick={() => { setLookup(null); setLookupError(null) }}>Scan another</Button>
          </div>
        </div>
      )}
    </div>
  )
}
