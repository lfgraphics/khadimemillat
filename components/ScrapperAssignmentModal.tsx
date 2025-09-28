"use client"
import { useEffect, useState } from 'react'
import { safeJson } from '@/lib/utils'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, UserCircle } from 'lucide-react'

interface Scrapper { id: string; firstName?: string; lastName?: string; email?: string; publicMetadata?: any }

interface Props {
  open: boolean
  onOpenChange(open: boolean): void
  requestId: string | null
  onAssigned?(): void
}

export function ScrapperAssignmentModal({ open, onOpenChange, requestId, onAssigned }: Props) {
  const [scrappers, setScrappers] = useState<Scrapper[]>([])
  const [loading, setLoading] = useState(false)
  const [assigningIds, setAssigningIds] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const load = async () => {
      setLoading(true); setError(null)
      try {
  const res = await fetch('/api/protected/users?role=scrapper', { cache: 'no-store' })
  if (!res.ok) {
    if (res.status === 403) {
      // Broad listing gated; caller likely not privileged. Show friendly message and keep list empty.
      setScrappers([])
      setError('Not authorized to list users. Try searching in contexts that support it or contact an admin.')
    } else {
      throw new Error(`Failed to load scrappers (${res.status})`)
    }
  } else {
    const json = await safeJson<any>(res)
    const list = json.users || json.items || []
    setScrappers(list)
  }
      } catch (e:any) {
        setError(e.message || 'Failed to load scrappers')
      } finally { setLoading(false) }
    }
    load()
  }, [open])

  const toggleAssign = async (scrapperId: string) => {
    if (!requestId) return
    setAssigningIds(prev => [...prev, scrapperId])
    try {
      const res = await fetch(`/api/protected/collection-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'assign', scrapperIds: [scrapperId] })
      })
      if (!res.ok) throw new Error('Failed to assign')
      onAssigned?.()
      onOpenChange(false)
    } catch (e) {
      console.error(e)
    } finally {
      setAssigningIds(prev => prev.filter(id => id !== scrapperId))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Scrapper</DialogTitle>
        </DialogHeader>
        {loading && <div className='py-6 flex justify-center'><Loader2 className='h-5 w-5 animate-spin' /></div>}
        {error && <p className='text-xs text-red-500'>{error}</p>}
        {!loading && !error && (
          <div className='h-64 overflow-y-auto pr-2 space-y-2'>
            {scrappers.map(s => {
              const full = [s.firstName, s.lastName].filter(Boolean).join(' ') || (s as any).name || s.email || s.id
              const assigning = assigningIds.includes(s.id)
              return (
                <div key={s.id} className='flex items-center justify-between border rounded p-2 text-xs'>
                  <div className='flex items-center gap-2'>
                    <UserCircle className='h-4 w-4 opacity-60' />
                    <div className='flex flex-col'>
                      <span className='font-medium'>{full}</span>
                      {s.email && <span className='text-[10px] text-muted-foreground'>{s.email}</span>}
                    </div>
                  </div>
                  <Button size='sm' disabled={assigning} onClick={() => toggleAssign(s.id)}>
                    {assigning ? <Loader2 className='h-3 w-3 animate-spin' /> : 'Assign'}
                  </Button>
                </div>
              )
            })}
            {scrappers.length === 0 && <p className='text-[11px] text-muted-foreground'>No scrappers available.</p>}
          </div>
        )}
        <DialogFooter>
          <Button variant='outline' size='sm' onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ScrapperAssignmentModal
