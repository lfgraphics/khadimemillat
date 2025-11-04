'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import RichTextEditor from '@/components/ui/rich-text-editor'
import { Loader2, Save, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { getAvailableIcons, getDynamicIcon } from '@/lib/iconUtils'
import Link from 'next/link'

interface WelfareProgramFormProps {
  program?: {
    _id: string
    title: string
    slug: string
    description: string
    coverImage: string
    icon: string
    iconColor: string
    displayOrder: number
    isActive: boolean
  }
}

const ICON_COLORS = [
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Green', value: '#10B981' },
  { name: 'Orange', value: '#F59E0B' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Indigo', value: '#6366F1' },
  { name: 'Teal', value: '#14B8A6' }
]

export default function WelfareProgramForm({ program }: WelfareProgramFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    title: program?.title || '',
    slug: program?.slug || '',
    description: program?.description || '',
    coverImage: program?.coverImage || '',
    icon: program?.icon || 'Heart',
    iconColor: program?.iconColor || '#3B82F6',
    displayOrder: program?.displayOrder || 0,
    isActive: program?.isActive ?? true
  })

  const availableIcons = getAvailableIcons()
  const isEditing = !!program

  // Auto-generate slug from title
  useEffect(() => {
    if (!isEditing && formData.title) {
      const slug = formData.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()
      setFormData(prev => ({ ...prev, slug }))
    }
  }, [formData.title, isEditing])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title.trim() || !formData.description.trim() || !formData.coverImage.trim()) {
      toast.error('Please fill in all required fields')
      return
    }

    setIsSubmitting(true)

    try {
      const url = isEditing 
        ? `/api/admin/welfare-programs/${program._id}`
        : '/api/admin/welfare-programs'
      
      const method = isEditing ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          donationLink: `/welfare-programs/${formData.slug}`
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to ${isEditing ? 'update' : 'create'} welfare program`)
      }

      toast.success(`Welfare program ${isEditing ? 'updated' : 'created'} successfully!`)
      router.push('/admin/welfare-programs')
      
    } catch (error) {
      console.error('Error submitting form:', error)
      toast.error(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const IconComponent = getDynamicIcon(formData.icon)

  return (
    <div>
      <div className="mb-6">
        <Link 
          href="/admin/welfare-programs"
          className="inline-flex items-center text-muted-foreground hoact:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Welfare Programs
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? 'Edit' : 'Create'} Welfare Program</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <Label htmlFor="title" className="text-sm font-medium">
                Title *
              </Label>
              <Input
                id="title"
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter program title"
                required
              />
            </div>

            {/* Slug */}
            <div>
              <Label htmlFor="slug" className="text-sm font-medium">
                Slug *
                <span className="text-xs text-muted-foreground ml-1">
                  (URL-friendly version)
                </span>
              </Label>
              <Input
                id="slug"
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                placeholder="program-slug"
                required
                disabled={isEditing}
              />
              <p className="text-xs text-muted-foreground mt-1">
                URL: /welfare-programs/{formData.slug}
              </p>
            </div>

            {/* Description */}
            <div>
              <RichTextEditor
                value={formData.description}
                onChange={(value) => setFormData(prev => ({ ...prev, description: value }))}
                placeholder="Enter program description with rich formatting..."
                label="Description"
                required
              />
            </div>

            {/* Cover Image */}
            <div>
              <Label htmlFor="coverImage" className="text-sm font-medium">
                Cover Image URL *
              </Label>
              <Input
                id="coverImage"
                type="url"
                value={formData.coverImage}
                onChange={(e) => setFormData(prev => ({ ...prev, coverImage: e.target.value }))}
                placeholder="https://example.com/image.jpg"
                required
              />
            </div>

            {/* Icon Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Icon *</Label>
                <Select
                  value={formData.icon}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, icon: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableIcons.map((iconName) => {
                      const Icon = getDynamicIcon(iconName)
                      return (
                        <SelectItem key={iconName} value={iconName}>
                          <div className="flex items-center">
                            <Icon className="h-4 w-4 mr-2" />
                            {iconName}
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium">Icon Color *</Label>
                <Select
                  value={formData.iconColor}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, iconColor: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ICON_COLORS.map((color) => (
                      <SelectItem key={color.value} value={color.value}>
                        <div className="flex items-center">
                          <div 
                            className="w-4 h-4 rounded mr-2"
                            style={{ backgroundColor: color.value }}
                          />
                          {color.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Icon Preview */}
            <div>
              <Label className="text-sm font-medium">Preview</Label>
              <div className="mt-2 p-4 border rounded-lg">
                <div 
                  className="w-16 h-16 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${formData.iconColor}20` }}
                >
                  <IconComponent 
                    className="h-8 w-8" 
                    style={{ color: formData.iconColor }}
                  />
                </div>
              </div>
            </div>

            {/* Display Order */}
            <div>
              <Label htmlFor="displayOrder" className="text-sm font-medium">
                Display Order
              </Label>
              <Input
                id="displayOrder"
                type="number"
                value={formData.displayOrder}
                onChange={(e) => setFormData(prev => ({ ...prev, displayOrder: parseInt(e.target.value) || 0 }))}
                placeholder="0"
                min="0"
              />
            </div>

            {/* Submit Button */}
            <div className="flex gap-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isEditing ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {isEditing ? 'Update Program' : 'Create Program'}
                  </>
                )}
              </Button>
              
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/admin/welfare-programs')}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}