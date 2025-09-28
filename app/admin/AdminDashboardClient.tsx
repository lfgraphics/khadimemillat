"use client"

import React from 'react'
import { useRouter } from 'next/navigation'
import { safeJson } from '@/lib/utils'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import DonationFilters, { DonationFiltersState } from '@/components/admin/DonationFilters'
import DonationDetailsModal, { DonationDetails } from '@/components/admin/DonationDetailsModal'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from '@/components/ui/pagination'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

type DonationRow = {
  id: string
  donor?: { id: string; name?: string; email?: string }
  createdAt?: string
  status?: string
  itemsCount?: number
}

export default function AdminDashboardClient() {
  const router = useRouter()
  const [tab, setTab] = React.useState<'scrap' | 'fund'>('scrap')
  const [filters, setFilters] = React.useState<DonationFiltersState>({})
  const [page, setPage] = React.useState(1)
  const [rows, setRows] = React.useState<DonationRow[]>([])
  const [total, setTotal] = React.useState(0)
  const [loading, setLoading] = React.useState(false)
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [selectedDonation, setSelectedDonation] = React.useState<DonationDetails | undefined>()
  const [savingItems, setSavingItems] = React.useState<Record<string, boolean>>({})
  const [pendingActions, setPendingActions] = React.useState<Record<string, 'list' | 'unlist' | 'sold' | undefined>>({})

  const pageSize = 20

  React.useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        params.set('page', String(page))
        params.set('limit', String(pageSize))
        if (filters.q) params.set('q', filters.q)
        if (filters.status) params.set('status', filters.status)
        if (filters.itemStatus) params.set('itemStatus', filters.itemStatus)
        if (filters.from) params.set('from', filters.from.toISOString())
        if (filters.to) params.set('to', filters.to.toISOString())
        const res = await fetch(`/api/protected/donation-entries?${params.toString()}`)
        const json = await safeJson<any>(res)
        if (!cancelled) {
          const mapped = (json.entries || []).map((e: any) => ({ id: e._id || e.id, donor: e.donor, createdAt: e.createdAt, status: e.status, itemsCount: e.itemsCount || (e.items?.length ?? 0) }))
          setRows(mapped)
          setTotal(json.total || 0)
        }
      } catch (e: any) {
        console.error(e)
        toast.error(e.message || 'Failed to load donations')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [page, filters])

  const openDetails = async (id: string) => {
    setSelectedId(id)
    try {
      const res = await fetch(`/api/protected/donation-entries/${id}`)
      const json = await safeJson<any>(res)
      setSelectedDonation(json.donation)
    } catch (e) {
      console.error(e)
      toast.error('Failed to load donation details')
    }
  }

  const handleItemChange = async (itemId: string, patch: any) => {
    if (!selectedDonation) return
    setSavingItems(s => ({ ...s, [itemId]: true }))
    try {
      const res = await fetch(`/api/protected/scrap-items/${itemId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) })
      if (!res.ok) throw new Error(await res.text())
      const json = await safeJson<any>(res)
      const updated = json.item || patch
      setSelectedDonation(d => d ? { ...d, items: d.items.map(it => it.id === itemId ? { ...it, ...updated, marketplaceListing: updated.marketplaceListing ?? it.marketplaceListing } : it) } : d)
      toast.success('Item updated')
    } catch (e: any) {
      toast.error(e.message || 'Failed to update item')
    } finally {
      setSavingItems(s => ({ ...s, [itemId]: false }))
    }
  }

  const handleItemAction = async (itemId: string, action: 'list' | 'unlist' | 'sold') => {
    if (!selectedDonation) return
    setPendingActions(m => ({ ...m, [itemId]: action }))
    try {
      const body: any = {}
      if (action === 'list') body.marketplaceListing = { listed: true }
      if (action === 'unlist') body.marketplaceListing = { listed: false }
      if (action === 'sold') body.marketplaceListing = { sold: true }
      const res = await fetch(`/api/protected/scrap-items/${itemId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) throw new Error(await res.text())
      const json = await safeJson<any>(res)
      const updated = json.item || body
      setSelectedDonation(d => d ? { ...d, items: d.items.map(it => it.id === itemId ? { ...it, ...updated, marketplaceListing: updated.marketplaceListing ?? it.marketplaceListing } : it) } : d)
      toast.success(action === 'list' ? 'Item listed' : action === 'unlist' ? 'Item unlisted' : 'Marked as sold')
    } catch (e: any) {
      toast.error(e.message || 'Action failed')
    } finally {
      setPendingActions(m => ({ ...m, [itemId]: undefined }))
    }
  }

  const clearFilters = () => { setFilters({}); setPage(1) }

  const handlePrint = (itemId: string) => {
    if (!selectedId) return
    // Navigate to donation print page (prints all items under donation)
    toast.message('Opening barcode print sheet…')
    router.push(`/list-donation/print/${selectedId}`)
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Admin • Donations</h1>
      </div>

      <Tabs value={tab} onValueChange={v => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="scrap">Scrap</TabsTrigger>
          <TabsTrigger value="fund">Fund</TabsTrigger>
        </TabsList>

        <TabsContent value="scrap" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <DonationFilters value={filters} onChange={setFilters} onClear={clearFilters} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">All Scrap Donations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Donor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map(r => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{r.donor?.name || r.donor?.id || 'Unknown'}</span>
                            <span className="text-xs text-muted-foreground">{r.donor?.email}</span>
                          </div>
                        </TableCell>
                        <TableCell className="capitalize">{r.status || '—'}</TableCell>
                        <TableCell>{r.itemsCount ?? '—'}</TableCell>
                        <TableCell>{r.createdAt ? new Date(r.createdAt).toLocaleString() : '—'}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" onClick={() => openDetails(r.id)} disabled={loading && selectedId === r.id}>
                            {loading && selectedId === r.id ? <Loader2 className='h-4 w-4 animate-spin' /> : 'View'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {rows.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">{loading ? 'Loading…' : 'No donations found'}</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="pt-3">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious onClick={() => setPage(p => Math.max(1, p - 1))} aria-disabled={page <= 1} />
                    </PaginationItem>
                    <span className="px-2 text-sm">Page {page} of {totalPages}</span>
                    <PaginationItem>
                      <PaginationNext onClick={() => setPage(p => Math.min(totalPages, p + 1))} aria-disabled={page >= totalPages} />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fund">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Fund Donations</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Coming soon.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <DonationDetailsModal
        open={!!selectedId}
        onOpenChange={(v) => { if (!v) { setSelectedId(null); setSelectedDonation(undefined) } }}
        donation={selectedDonation}
        onItemChange={handleItemChange}
        onItemAction={(itemId, action) => { action === 'print' ? handlePrint(itemId) : handleItemAction(itemId, action as any) }}
        savingItems={savingItems}
        pendingActions={pendingActions}
      />
    </div>
  )
}
