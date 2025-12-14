'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, Loader2, FileText } from 'lucide-react'
import { toast } from 'sonner'

const documentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().optional(),
  documentType: z.enum(['annual_report', 'quarterly_report', 'monthly_report', 'audit_report', 'impact_assessment', 'utilization_report']),
  year: z.number().min(2020).max(new Date().getFullYear() + 1),
  quarter: z.number().min(1).max(4).optional(),
  month: z.number().min(1).max(12).optional(),
  file: z.any().optional()
})

type DocumentFormData = z.infer<typeof documentSchema>

const documentTypeOptions = [
  { value: 'annual_report', label: 'Annual Report', requiresQuarter: false, requiresMonth: false },
  { value: 'quarterly_report', label: 'Quarterly Report', requiresQuarter: true, requiresMonth: false },
  { value: 'monthly_report', label: 'Monthly Report', requiresQuarter: false, requiresMonth: true },
  { value: 'audit_report', label: 'Audit Report', requiresQuarter: false, requiresMonth: false },
  { value: 'impact_assessment', label: 'Impact Assessment', requiresQuarter: false, requiresMonth: false },
  { value: 'utilization_report', label: 'Utilization Report', requiresQuarter: false, requiresMonth: false }
]

export default function FinancialDocumentGenerator() {
  const [isOpen, setIsOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors }
  } = useForm<DocumentFormData>({
    resolver: zodResolver(documentSchema),
    defaultValues: {
      year: new Date().getFullYear()
    }
  })

  const documentType = watch('documentType')
  const selectedDocType = documentTypeOptions.find(opt => opt.value === documentType)

  const onSubmit = async (data: DocumentFormData) => {
    if (!selectedFile) {
      toast.error('Please select a file to upload')
      return
    }

    setIsGenerating(true)
    
    try {
      // Create FormData for file upload
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('title', data.title)
      formData.append('description', data.description || '')
      formData.append('documentType', data.documentType)
      formData.append('year', data.year.toString())
      if (data.quarter) formData.append('quarter', data.quarter.toString())
      if (data.month) formData.append('month', data.month.toString())

      const response = await fetch('/api/admin/financial-documents/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to upload document')
      }

      const result = await response.json()
      toast.success('Financial document uploaded successfully!')
      
      // Reset form and close dialog
      reset()
      setSelectedFile(null)
      setIsOpen(false)
      
      // Refresh the page to show the new document
      window.location.reload()
      
    } catch (error) {
      console.error('Upload error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to upload document')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Check file type (PDF, DOC, DOCX, XLS, XLSX)
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ]
      
      if (!allowedTypes.includes(file.type)) {
        toast.error('Please select a PDF, Word document, or Excel file')
        return
      }

      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB')
        return
      }

      setSelectedFile(file)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Upload Document
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Upload Financial Document
          </DialogTitle>
          <DialogDescription>
            Upload a financial report document for transparency and member access
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="title">Document Title</Label>
            <Input
              id="title"
              {...register('title')}
              placeholder="e.g., Annual Financial Report 2024"
            />
            {errors.title && (
              <p className="text-sm text-destructive mt-1">{errors.title.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Brief description of the document contents"
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="file">Upload Document</Label>
            <Input
              id="file"
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx"
              onChange={handleFileChange}
              className="cursor-pointer"
            />
            {selectedFile && (
              <p className="text-sm text-muted-foreground mt-1">
                Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Supported formats: PDF, Word (.doc, .docx), Excel (.xls, .xlsx). Max size: 10MB
            </p>
          </div>

          <div>
            <Label htmlFor="documentType">Document Type</Label>
            <Select
              value={documentType}
              onValueChange={(value) => setValue('documentType', value as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select document type" />
              </SelectTrigger>
              <SelectContent>
                {documentTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.documentType && (
              <p className="text-sm text-destructive mt-1">{errors.documentType.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="year">Year</Label>
              <Input
                id="year"
                type="number"
                {...register('year', { valueAsNumber: true })}
                min={2020}
                max={new Date().getFullYear() + 1}
              />
              {errors.year && (
                <p className="text-sm text-destructive mt-1">{errors.year.message}</p>
              )}
            </div>

            {selectedDocType?.requiresQuarter && (
              <div>
                <Label htmlFor="quarter">Quarter</Label>
                <Select
                  value={watch('quarter')?.toString()}
                  onValueChange={(value) => setValue('quarter', parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select quarter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Q1 (Jan-Mar)</SelectItem>
                    <SelectItem value="2">Q2 (Apr-Jun)</SelectItem>
                    <SelectItem value="3">Q3 (Jul-Sep)</SelectItem>
                    <SelectItem value="4">Q4 (Oct-Dec)</SelectItem>
                  </SelectContent>
                </Select>
                {errors.quarter && (
                  <p className="text-sm text-destructive mt-1">{errors.quarter.message}</p>
                )}
              </div>
            )}

            {selectedDocType?.requiresMonth && (
              <div>
                <Label htmlFor="month">Month</Label>
                <Select
                  value={watch('month')?.toString()}
                  onValueChange={(value) => setValue('month', parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => (
                      <SelectItem key={i + 1} value={(i + 1).toString()}>
                        {new Date(2024, i).toLocaleDateString('en-US', { month: 'long' })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.month && (
                  <p className="text-sm text-destructive mt-1">{errors.month.message}</p>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isGenerating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isGenerating || !selectedFile}>
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Upload Document
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}