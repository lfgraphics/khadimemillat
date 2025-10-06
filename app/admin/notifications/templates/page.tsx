"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FileText, RefreshCw, Trash2, Edit2, Plus } from 'lucide-react'
import { toast } from 'sonner'

interface TemplateItem {
  _id: string
  name: string
  title: string
  message: string
  channels: string[]
  targetRoles: string[]
  category: string
  isActive: boolean
  usageCount: number
  createdAt: string
}

export default function TemplatesPage() {
  const [items, setItems] = useState<TemplateItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (category !== 'all') params.set('category', category)
      if (search) params.set('search', search)
      const res = await fetch(`/api/admin/notifications/templates?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to load templates')
      const data = await res.json()
      setItems(data.templates || [])
    } catch (e) {
      console.error(e)
      toast.error('Could not load templates')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchTemplates() }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this template?')) return
    try {
      const res = await fetch(`/api/admin/notifications/templates/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      toast.success('Template deleted')
      fetchTemplates()
    } catch {
      toast.error('Failed to delete template')
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Templates</h1>
          <p className="text-sm text-muted-foreground">Manage reusable notification templates</p>
        </div>
        <Button onClick={() => (window.location.href = '/admin/notifications/compose')}>
          <Plus className="h-4 w-4 mr-2" /> New Notification
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Template Library</span>
            <Button variant="outline" size="sm" onClick={fetchTemplates} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
          </CardTitle>
          <CardDescription>Search and filter to find templates quickly</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-3 mb-4">
            <Input
              placeholder="Search by name or content"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchTemplates()}
            />
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="campaign">Campaign</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={fetchTemplates}>Apply</Button>
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading templates...</div>
          ) : items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No templates found</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {items.map((t) => (
                <Card key={t._id} className="border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <FileText className="h-4 w-4" /> {t.name}
                      <Badge variant="secondary" className="text-xs ml-1">{t.category}</Badge>
                    </CardTitle>
                    <CardDescription className="line-clamp-2">{t.title}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm text-muted-foreground line-clamp-3">{t.message}</div>
                    <div className="flex flex-wrap gap-1">
                      {t.channels.map((c) => (
                        <Badge key={c} variant="outline" className="text-xs capitalize">{c.replace('_', ' ')}</Badge>
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Usage: {t.usageCount}</span>
                      <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => (window.location.href = `/admin/notifications/compose?template=${t._id}`)}>
                        <Edit2 className="h-4 w-4 mr-1" /> Use
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(t._id)}>
                        <Trash2 className="h-4 w-4 mr-1" /> Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
