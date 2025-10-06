"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Image as ImageIcon, Tag, CheckCircle, Pencil, Save, X, Plus } from 'lucide-react'
import { ClickableImage } from '@/components/ui/clickable-image'
import { toast } from 'sonner'
import { EnhancedFileSelector } from '@/components/file-selector'
import { FileUploadError, UploadResult } from '@/components/file-selector/types'

export type ScrapItem = {
  id: string
  name: string
  condition: 'new' | 'good' | 'repairable' | 'scrap' | 'not applicable'
  photos: { before: string[]; after: string[] }
  marketplaceListing: { listed: boolean; demandedPrice?: number; salePrice?: number; sold: boolean }
  repairingCost?: number
}

export default function ScrapItemCard({ item, onChange, onAction, saving = false, pendingAction }: {
  item: ScrapItem
  onChange?: (patch: Partial<ScrapItem>) => void
  onAction?: (action: 'list' | 'unlist' | 'sold' | 'print', payload?: any) => void
  saving?: boolean
  pendingAction?: 'list' | 'unlist' | 'sold'
}) {
  const [editing, setEditing] = React.useState(false)
  const [local, setLocal] = React.useState<ScrapItem>({ ...item, photos: { before: [...(item.photos?.before || [])], after: [...(item.photos?.after || [])] } })

  React.useEffect(() => setLocal(item), [item.id])

  const startEdit = () => setEditing(true)
  const cancel = () => { setEditing(false); setLocal(item) }
  const save = () => {
    setEditing(false)
    const patch: any = {
      name: local.name,
      marketplaceListing: local.marketplaceListing,
      condition: local.condition,
      // send photos updates using dedicated props expected by API route
      beforePhotos: local.photos?.before || [],
      afterPhotos: local.photos?.after || [],
      repairingCost: local.repairingCost,
    }
    onChange?.(patch)
  }

  // Enhanced file selector for adding photos
  const AddPhotoSelector: React.FC<{ onAdd: (id: string) => void; type: 'before' | 'after' }> = ({ onAdd, type }) => {
    const handleFileSelect = (file: File, previewUrl: string) => {
      // no-op
    }

    const handleUploadComplete = (uploadResult: UploadResult) => {
      onAdd(uploadResult.publicId)
      toast.success(`${type} photo uploaded successfully`)
    }

    const handleUploadError = (error: FileUploadError) => {
      console.error(`${type} photo upload error:`, error)
      toast.error(`Upload failed: ${error.message}`)
    }

    return (
      <div className="w-16 h-16">
        <EnhancedFileSelector
          onFileSelect={handleFileSelect}
          onUploadComplete={handleUploadComplete}
          onError={handleUploadError}
          maxFileSize={8 * 1024 * 1024} // 8MB
          acceptedTypes={['image/jpeg', 'image/png', 'image/webp']}
          placeholder="+"
          showPreview={false}
          uploadToCloudinary={true}
          cloudinaryOptions={{
            folder: 'kmwf/scrap-items',
            tags: ['scrap-item', type, item.id]
          }}
          className="w-16 h-16 rounded flex items-center justify-center text-muted-foreground bg-muted/40 cursor-pointer hover:bg-muted/60 transition-colors"
        />
      </div>
    )
  }

  const statusBadge = () => {
    if (item.marketplaceListing.sold) return <Badge variant="default">Sold</Badge>
    if (item.marketplaceListing.listed) return <Badge variant="secondary">Listed</Badge>
    return <Badge variant="outline">Unlisted</Badge>
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base">{item.name}</CardTitle>
        <div className="flex items-center gap-2">
          {statusBadge()}
          {!editing ? (
            <Button size="icon" variant="ghost" onClick={startEdit} disabled={saving}><Pencil className="h-4 w-4"/></Button>
          ) : (
            <div className="flex gap-2">
              <Button size="icon" onClick={save} disabled={saving}><Save className="h-4 w-4"/></Button>
              <Button size="icon" variant="ghost" onClick={cancel} disabled={saving}><X className="h-4 w-4"/></Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Before Photos */}
        <div>
          <div className="text-xs font-medium mb-1">Before Photos</div>
          <div className="flex flex-wrap gap-2">
            {(local.photos.before || []).map((pid, i) => (
              <div key={`b-${i}`} className="relative group w-16 h-16 rounded overflow-hidden border bg-muted" title="Before photo">
                <ClickableImage src={pid} alt="Before photo" className="w-full h-full object-cover" caption={`${local.name} - Before photo`} transform={{ width: 128, height: 128, crop: 'fill' }} />
                {editing && (
                  <button type="button" onClick={() => setLocal(l => ({ ...l, photos: { ...l.photos, before: l.photos.before.filter((_, idx) => idx !== i) } }))} className="absolute top-0 right-0 m-0.5 bg-black/60 text-white rounded-full w-4 h-4 text-[10px] hidden group-hover:flex items-center justify-center">×</button>
                )}
              </div>
            ))}
            {editing && (
              <AddPhotoSelector 
                type="before" 
                onAdd={(id) => setLocal(l => ({ ...l, photos: { ...l.photos, before: [...l.photos.before, id] } }))} 
              />
            )}
          </div>
        </div>
        {/* After Photos */}
        <div>
          <div className="text-xs font-medium mb-1">After Photos</div>
          <div className="flex flex-wrap gap-2">
            {(local.photos.after || []).map((pid, i) => (
              <div key={`a-${i}`} className="relative group w-16 h-16 rounded overflow-hidden border bg-muted" title="After photo">
                <ClickableImage src={pid} alt="After photo" className="w-full h-full object-cover" caption={`${local.name} - After photo`} transform={{ width: 128, height: 128, crop: 'fill' }} />
                {editing && (
                  <button type="button" onClick={() => setLocal(l => ({ ...l, photos: { ...l.photos, after: l.photos.after.filter((_, idx) => idx !== i) } }))} className="absolute top-0 right-0 m-0.5 bg-black/60 text-white rounded-full w-4 h-4 text-[10px] hidden group-hover:flex items-center justify-center">×</button>
                )}
              </div>
            ))}
            {editing && (
              <AddPhotoSelector 
                type="after" 
                onAdd={(id) => setLocal(l => ({ ...l, photos: { ...l.photos, after: [...l.photos.after, id] } }))} 
              />
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <Label>Name</Label>
            <Input value={local.name} onChange={e => setLocal({ ...local, name: e.target.value })} disabled={!editing || saving}/>
          </div>
          <div>
            <Label>Demanded Price</Label>
            <Input type="number" value={local.marketplaceListing.demandedPrice ?? ''} onChange={e => setLocal({ ...local, marketplaceListing: { ...local.marketplaceListing, demandedPrice: e.target.value ? Number(e.target.value) : undefined } })} disabled={!editing || saving}/>
          </div>
          <div>
            <Label>Sale Price</Label>
            <Input type="number" value={local.marketplaceListing.salePrice ?? ''} onChange={e => setLocal({ ...local, marketplaceListing: { ...local.marketplaceListing, salePrice: e.target.value ? Number(e.target.value) : undefined } })} disabled={!editing || saving}/>
          </div>
          <div className="flex items-center gap-2 mt-6">
            <Switch checked={local.marketplaceListing.listed} onCheckedChange={v => setLocal({ ...local, marketplaceListing: { ...local.marketplaceListing, listed: v } })} disabled={!editing || saving}/>
            <span className="text-sm">Listed</span>
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={() => onAction?.('print')} disabled={saving}><Tag className="h-4 w-4 mr-1"/>Print Barcode</Button>
          {!item.marketplaceListing.listed ? (
            <Button onClick={() => onAction?.('list')} disabled={saving || pendingAction === 'list'}>
              {pendingAction === 'list' ? 'Listing…' : 'List'}
            </Button>
          ) : (
            <Button variant="destructive" onClick={() => onAction?.('unlist')} disabled={saving || pendingAction === 'unlist'}>
              {pendingAction === 'unlist' ? 'Unlisting…' : 'Unlist'}
            </Button>
          )}
          {!item.marketplaceListing.sold && (
            <Button variant="secondary" onClick={() => onAction?.('sold')} disabled={saving || pendingAction === 'sold'}>
              <CheckCircle className="h-4 w-4 mr-1"/>{pendingAction === 'sold' ? 'Marking…' : 'Mark Sold'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
