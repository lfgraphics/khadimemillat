'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff, 
  Search, 
  RefreshCw, 
  Tag,
  Loader2,
  AlertTriangle,
  CheckCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { IExpenseCategory } from '@/models/ExpenseCategory'

// Form validation schema
const categoryFormSchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100, 'Category name cannot exceed 100 characters'),
  description: z.string().max(500, 'Description cannot exceed 500 characters').optional(),
  parentCategory: z.string().optional(),
})

type CategoryFormData = z.infer<typeof categoryFormSchema>

interface CategoryManagerProps {
  className?: string
}

export function CategoryManager({ className }: CategoryManagerProps) {
  const [categories, setCategories] = useState<IExpenseCategory[]>([])
  const [filteredCategories, setFilteredCategories] = useState<IExpenseCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<IExpenseCategory | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: '',
      description: '',
      parentCategory: '',
    },
  })

  // Load categories
  const loadCategories = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        includeInactive: 'true', // Always load all categories for management
      })

      const response = await fetch(`/api/expenses/categories?${params}`)
      if (!response.ok) {
        throw new Error('Failed to load categories')
      }

      const data = await response.json()
      setCategories(data.categories || [])
    } catch (error: any) {
      console.error('Error loading categories:', error)
      setError(error.message || 'Failed to load categories')
      toast.error('Failed to load categories')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Load categories on mount
  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  // Filter categories based on search and active status
  useEffect(() => {
    let filtered = categories

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(category =>
        category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (category.description && category.description.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    // Filter by active status
    if (!showInactive) {
      filtered = filtered.filter(category => category.isActive)
    }

    setFilteredCategories(filtered)
  }, [categories, searchTerm, showInactive])

  // Handle form submission
  const handleSubmit = async (data: CategoryFormData) => {
    setIsSubmitting(true)

    try {
      // Validate parent category if provided
      if (data.parentCategory && data.parentCategory.trim() !== '') {
        const parentExists = categories.find(cat => cat._id?.toString() === data.parentCategory)
        if (!parentExists) {
          throw new Error('Selected parent category is no longer available')
        }
        if (!parentExists.isActive) {
          throw new Error('Cannot set inactive category as parent')
        }
      }
      const url = editingCategory 
        ? `/api/expenses/categories/${editingCategory._id}`
        : '/api/expenses/categories'
      
      const method = editingCategory ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          description: data.description || undefined,
          parentCategory: data.parentCategory && data.parentCategory !== 'none' && data.parentCategory.trim() !== '' ? data.parentCategory : undefined,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Category save error:', errorData)
        
        // Handle validation errors specifically
        if (response.status === 400 && errorData.details) {
          const validationErrors = errorData.details.map((detail: any) => detail.message).join(', ')
          throw new Error(`Validation error: ${validationErrors}`)
        }
        
        throw new Error(errorData.error || `Failed to save category (${response.status})`)
      }

      toast.success(editingCategory ? 'Category updated successfully' : 'Category created successfully')
      
      // Reset form and close dialog
      form.reset()
      setEditingCategory(null)
      setIsDialogOpen(false)
      
      // Reload categories
      await loadCategories()
    } catch (error: any) {
      console.error('Error saving category:', error)
      toast.error(error.message || 'Failed to save category')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle edit category
  const handleEditCategory = (category: IExpenseCategory) => {
    setEditingCategory(category)
    form.reset({
      name: category.name,
      description: category.description || '',
      parentCategory: category.parentCategory?.toString() || '',
    })
    setIsDialogOpen(true)
  }

  // Handle create new category
  const handleCreateCategory = () => {
    setEditingCategory(null)
    form.reset({
      name: '',
      description: '',
      parentCategory: '',
    })
    setIsDialogOpen(true)
  }

  // Handle toggle category status
  const handleToggleStatus = async (category: IExpenseCategory) => {
    try {
      const response = await fetch(`/api/expenses/categories/${category._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isActive: !category.isActive,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update category status')
      }

      toast.success(`Category ${category.isActive ? 'deactivated' : 'activated'} successfully`)
      await loadCategories()
    } catch (error: any) {
      console.error('Error updating category status:', error)
      toast.error(error.message || 'Failed to update category status')
    }
  }

  // Get parent category name
  const getParentCategoryName = (parentId: string) => {
    const parent = categories.find(cat => cat._id?.toString() === parentId)
    return parent?.name || 'Unknown'
  }

  // Get category hierarchy level
  const getCategoryLevel = (category: IExpenseCategory): number => {
    if (!category.parentCategory) return 0
    const parent = categories.find(cat => cat._id?.toString() === category.parentCategory?.toString())
    return parent ? getCategoryLevel(parent) + 1 : 0
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Tag className="h-6 w-6" />
            Category Management
          </h2>
          <p className="text-muted-foreground">
            Manage expense categories and their hierarchy
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={loadCategories}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            Refresh
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleCreateCategory} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                New Category
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>
                  {editingCategory ? 'Edit Category' : 'Create New Category'}
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Category Name <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter category name"
                            {...field}
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter category description (optional)"
                            rows={3}
                            {...field}
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="parentCategory"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Parent Category</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          disabled={isSubmitting}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select parent category (optional)" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">No Parent (Top Level)</SelectItem>
                            {categories
                              .filter(cat => 
                                cat.isActive && 
                                cat._id?.toString() !== editingCategory?._id?.toString() &&
                                cat._id && cat._id.toString().trim() !== ''
                              )
                              .map((category) => (
                                <SelectItem 
                                  key={category._id?.toString()} 
                                  value={category._id!.toString()}
                                >
                                  {category.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-3 pt-4">
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {editingCategory ? 'Updating...' : 'Creating...'}
                        </>
                      ) : (
                        <>
                          {editingCategory ? 'Update Category' : 'Create Category'}
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search categories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={showInactive ? "default" : "outline"}
                onClick={() => setShowInactive(!showInactive)}
                className="flex items-center gap-2"
              >
                {showInactive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                {showInactive ? 'Hide Inactive' : 'Show Inactive'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Categories Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Parent Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Loading categories...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredCategories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {searchTerm ? 'No categories found matching your search.' : 'No categories found. Create your first category to get started.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredCategories
                  .sort((a, b) => {
                    // Sort by hierarchy level first, then by name
                    const levelA = getCategoryLevel(a)
                    const levelB = getCategoryLevel(b)
                    if (levelA !== levelB) return levelA - levelB
                    return a.name.localeCompare(b.name)
                  })
                  .map((category) => {
                    const level = getCategoryLevel(category)
                    return (
                      <TableRow key={category._id?.toString()}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {level > 0 && (
                              <span className="text-muted-foreground">
                                {'└─'.repeat(level)}
                              </span>
                            )}
                            <span className="font-medium">{category.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {category.description || '-'}
                        </TableCell>
                        <TableCell>
                          {category.parentCategory ? (
                            <Badge variant="outline">
                              {getParentCategoryName(category.parentCategory.toString())}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">Top Level</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {category.isActive ? (
                            <Badge variant="default" className="flex items-center gap-1 w-fit">
                              <CheckCircle className="h-3 w-3" />
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                              <AlertTriangle className="h-3 w-3" />
                              Inactive
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {(category as any).createdAt ? format(new Date((category as any).createdAt), 'MMM dd, yyyy') : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditCategory(category)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleStatus(category)}
                              className={cn(
                                'h-8 w-8 p-0',
                                category.isActive 
                                  ? 'text-red-600 hover:text-red-700 hover:bg-red-50' 
                                  : 'text-green-600 hover:text-green-700 hover:bg-green-50'
                              )}
                            >
                              {category.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{categories.filter(cat => cat.isActive).length}</p>
              <p className="text-sm text-muted-foreground">Active Categories</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{categories.filter(cat => !cat.isActive).length}</p>
              <p className="text-sm text-muted-foreground">Inactive Categories</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{categories.filter(cat => !cat.parentCategory).length}</p>
              <p className="text-sm text-muted-foreground">Top Level Categories</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default CategoryManager