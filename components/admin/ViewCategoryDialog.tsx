'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Eye } from 'lucide-react';

interface ViewCategoryDialogProps {
  categoryId: string;
  categoryName: string;
}

export function ViewCategoryDialog({ categoryId, categoryName }: ViewCategoryDialogProps) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchCategory = async () => {
    if (!open) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/categories/${categoryId}`);
      if (response.ok) {
        const data = await response.json();
        setCategory(data.category);
      }
    } catch (error) {
      console.error('Error fetching category:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategory();
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Eye className="w-3 h-3" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Category Details</DialogTitle>
          <DialogDescription>
            View detailed information about {categoryName}
          </DialogDescription>
        </DialogHeader>
        
        {loading ? (
          <div className="p-4 text-center">Loading...</div>
        ) : category ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium">Name</h4>
                <p className="text-sm text-muted-foreground">{category.name}</p>
              </div>
              <div>
                <h4 className="font-medium">Type</h4>
                <Badge variant="outline">{category.type}</Badge>
              </div>
            </div>

            <div>
              <h4 className="font-medium">Label</h4>
              <p className="text-sm text-muted-foreground">{category.label}</p>
            </div>

            <div>
              <h4 className="font-medium">Description</h4>
              <p className="text-sm text-muted-foreground">{category.description}</p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <h4 className="font-medium">Color</h4>
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded bg-${category.color}-500`} />
                  <span className="text-sm capitalize">{category.color}</span>
                </div>
              </div>
              <div>
                <h4 className="font-medium">Icon</h4>
                <p className="text-sm text-muted-foreground">{category.icon || 'None'}</p>
              </div>
              <div>
                <h4 className="font-medium">Sort Order</h4>
                <p className="text-sm text-muted-foreground">{category.sortOrder}</p>
              </div>
            </div>

            {category.defaultMonthlyAmount && (
              <div>
                <h4 className="font-medium">Default Monthly Amount</h4>
                <p className="text-sm text-muted-foreground">₹{category.defaultMonthlyAmount}</p>
              </div>
            )}

            {category.priority && (
              <div>
                <h4 className="font-medium">Priority</h4>
                <p className="text-sm text-muted-foreground">{category.priority}</p>
              </div>
            )}

            {category.eligibilityRules && Object.keys(category.eligibilityRules).length > 0 && (
              <div>
                <h4 className="font-medium">Eligibility Rules</h4>
                <div className="space-y-2 text-sm text-muted-foreground">
                  {category.eligibilityRules.minAge && (
                    <p>Min Age: {category.eligibilityRules.minAge}</p>
                  )}
                  {category.eligibilityRules.maxAge && (
                    <p>Max Age: {category.eligibilityRules.maxAge}</p>
                  )}
                  {category.eligibilityRules.relationships && (
                    <p>Relationships: {category.eligibilityRules.relationships.join(', ')}</p>
                  )}
                  {category.eligibilityRules.conditions && (
                    <p>Conditions: {category.eligibilityRules.conditions.join(', ')}</p>
                  )}
                  {category.eligibilityRules.healthStatuses && (
                    <p>Health Statuses: {category.eligibilityRules.healthStatuses.join(', ')}</p>
                  )}
                  {category.eligibilityRules.maritalStatuses && (
                    <p>Marital Statuses: {category.eligibilityRules.maritalStatuses.join(', ')}</p>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium">Status</h4>
                <Badge variant={category.active ? 'default' : 'secondary'}>
                  {category.active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div>
                <h4 className="font-medium">Usage Count</h4>
                <p className="text-sm text-muted-foreground">{category.usageCount || 0}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
              <div>
                <h4 className="font-medium">Created</h4>
                <p>{new Date(category.createdAt).toLocaleDateString()}</p>
              </div>
              <div>
                <h4 className="font-medium">Last Updated</h4>
                <p>{new Date(category.updatedAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 text-center text-muted-foreground">
            Failed to load category details
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}