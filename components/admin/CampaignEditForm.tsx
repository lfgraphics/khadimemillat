'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import RichTextEditor from '@/components/ui/rich-text-editor'
import { Loader2, Save, ArrowLeft, Calendar, Target, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

interface WelfareProgram {
  _id: string
  title: string
  slug: string
}

interface Campaign {
  _id: string
  programId: string
  title: string
  slug: string
  description: string
  coverImage: string
  goal: number
  startDate: string
  endDate?: string
  isFeatured: boolean
  isActive: boolean
  welfareProgram?: {
    _id: string
    title: string
    slug: string
  }
}

interface CampaignEditFormProps {
  campaign: Campaign
}

export default function CampaignEditForm({ campaign }: CampaignEditFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [programs, setPrograms] = useState<WelfareProgram[]>([])
  const [loadingPrograms, setLoadingPrograms] = useState(true)
  const [formData, setFormData] = useState({
    programId: campaign.programId || '',
    title: campaign.title || '',
    slug: campaign.slug || '',
    description: campaign.description || '',
    coverImage: campaign.coverImage || '',
    goal: campaign.goal?.toString() || '',
    startDate: campaign.startDate ? new Date(campaign.startDate).toISOString().split('T')[0] : '',
    endDate: campaign.endDate ? new Date(campaign.endDate).toISOString().split('T')[0] : '',
    isFeatured: campaign.isFeatured || false,
    isActive: campaign.isActive !== false // Default to true if not specified
  })

  // Load welfare programs
  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        const response = await fetch('/api/public/welfare-programs')
        if (response.ok) {
          const data = await response.json()
          setPrograms(data)
        }
      } catch (error) {
        console.error('Error fetching programs:', error)
        toast.error('Failed to load welfare programs')
      } finally {
        setLoadingPrograms(false)
      }
    }

    fetchPrograms()
  }, [])

  // Auto-generate slug from title
  useEffect(() => {
    if (formData.title && formData.title !== campaign.title) {
      const slug = formData.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()
      setFormData(prev => ({ ...prev, slug }))
    }
  }, [formData.title, campaign.title])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.programId || !formData.title.trim() || !formData.description.trim() || 
        !formData.coverImage.trim() || !formData.goal || !formData.startDate) {
      toast.error('Please fill in all required fields')
      return
    }

    const goalAmount = parseFloat(formData.goal)
    if (isNaN(goalAmount) || goalAmount <= 0) {
      toast.error('Please enter a valid goal amount')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/admin/campaigns/${campaign._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          goal: goalAmount
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update campaign')
      }

      const result = await response.json()
      
      toast.success(result.message || 'Campaign updated successfully!')
      router.push('/admin/campaigns')
      
    } catch (error) {
      console.error('Error updating campaign:', error)
      toast.error(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this campaign? This action cannot be undone.')) {
      return
    }

    setIsDeleting(true)

    try {
      const response = await fetch(`/api/admin/campaigns/${campaign._id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete campaign')
      }

      toast.success('Campaign deleted successfully!')
      router.push('/admin/campaigns')
      
    } catch (error) {
      console.error('Error deleting campaign:', error)
      toast.error(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <Link 
          href="/admin/campaigns"
          className="inline-flex items-center text-muted-foreground hoact:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Campaigns
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Target className="h-5 w-5 mr-2" />
              Edit Campaign
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting || isSubmitting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Campaign
                </>
              )}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Program Selection */}
            <div>
              <Label htmlFor="programId" className="text-sm font-medium">
                Welfare Program *
              </Label>
              {loadingPrograms ? (
                <div className="flex items-center py-2">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Loading programs...
                </div>
              ) : (
                <Select
                  value={formData.programId}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, programId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a welfare program" />
                  </SelectTrigger>
                  <SelectContent>
                    {programs.map((program) => (
                      <SelectItem key={program._id} value={program._id}>
                        {program.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Campaign Title */}
            <div>
              <Label htmlFor="title" className="text-sm font-medium">
                Campaign Title *
              </Label>
              <Input
                id="title"
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter campaign title"
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
                placeholder="campaign-slug"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                URL: /campaigns/{formData.slug}
              </p>
            </div>

            {/* Description */}
            <RichTextEditor
              label="Description"
              value={formData.description}
              onChange={(value) => setFormData(prev => ({ ...prev, description: value }))}
              placeholder="Enter detailed campaign description with rich formatting..."
              required
            />

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

            {/* Goal and Dates */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="goal" className="text-sm font-medium">
                  Fundraising Goal (₹) *
                </Label>
                <Input
                  id="goal"
                  type="number"
                  value={formData.goal}
                  onChange={(e) => setFormData(prev => ({ ...prev, goal: e.target.value }))}
                  placeholder="100000"
                  min="1"
                  required
                />
              </div>

              <div>
                <Label htmlFor="startDate" className="text-sm font-medium">
                  Start Date *
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                  required
                />
              </div>

              <div>
                <Label htmlFor="endDate" className="text-sm font-medium">
                  End Date (Optional)
                </Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
            </div>

            {/* Options */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isFeatured"
                  checked={formData.isFeatured}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isFeatured: checked as boolean }))}
                />
                <Label htmlFor="isFeatured" className="text-sm">
                  Mark as featured campaign
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked as boolean }))}
                />
                <Label htmlFor="isActive" className="text-sm">
                  Campaign is active and visible to users
                </Label>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4">
              <Button
                type="submit"
                disabled={isSubmitting || loadingPrograms || isDeleting}
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating Campaign...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Update Campaign
                  </>
                )}
              </Button>
              
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/admin/campaigns')}
                disabled={isSubmitting || isDeleting}
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