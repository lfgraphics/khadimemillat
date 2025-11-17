'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

interface AddCategoryDialogProps {
  onCategoryAdded: () => void;
}

export function AddCategoryDialog({ onCategoryAdded }: AddCategoryDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'sponsorship',
    label: '',
    description: '',
    color: 'blue',
    icon: '',
    priority: 1,
    defaultMonthlyAmount: 2000,
    active: true,
    sortOrder: 1,
    eligibilityRules: {
      minAge: '',
      maxAge: '',
      relationships: '',
      healthStatuses: '',
      conditions: '',
      maritalStatuses: ''
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.label || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      // Process eligibility rules
      const eligibilityRules: any = {};
      
      if (formData.eligibilityRules.minAge) {
        eligibilityRules.minAge = parseInt(formData.eligibilityRules.minAge);
      }
      if (formData.eligibilityRules.maxAge) {
        eligibilityRules.maxAge = parseInt(formData.eligibilityRules.maxAge);
      }
      if (formData.eligibilityRules.relationships) {
        eligibilityRules.relationships = formData.eligibilityRules.relationships
          .split(',')
          .map(s => s.trim().toLowerCase())
          .filter(s => s);
      }
      if (formData.eligibilityRules.healthStatuses) {
        eligibilityRules.healthStatuses = formData.eligibilityRules.healthStatuses
          .split(',')
          .map(s => s.trim().toLowerCase())
          .filter(s => s);
      }
      if (formData.eligibilityRules.conditions) {
        eligibilityRules.conditions = formData.eligibilityRules.conditions
          .split(',')
          .map(s => s.trim().toLowerCase())
          .filter(s => s);
      }
      if (formData.eligibilityRules.maritalStatuses) {
        eligibilityRules.maritalStatuses = formData.eligibilityRules.maritalStatuses
          .split(',')
          .map(s => s.trim().toLowerCase())
          .filter(s => s);
      }

      const categoryData = {
        ...formData,
        eligibilityRules: Object.keys(eligibilityRules).length > 0 ? eligibilityRules : undefined
      };

      const response = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(categoryData),
      });

      if (response.ok) {
        toast.success('Category created successfully');
        setOpen(false);
        setFormData({
          name: '',
          type: 'sponsorship',
          label: '',
          description: '',
          color: 'blue',
          icon: '',
          priority: 1,
          defaultMonthlyAmount: 2000,
          active: true,
          sortOrder: 1,
          eligibilityRules: {
            minAge: '',
            maxAge: '',
            relationships: '',
            healthStatuses: '',
            conditions: '',
            maritalStatuses: ''
          }
        });
        onCategoryAdded();
      } else {
        const errorData = await response.json();
        toast.error(`Failed to create category: ${errorData.error}`);
      }
    } catch (error) {
      toast.error('Error creating category');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Category
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Category</DialogTitle>
          <DialogDescription>
            Create a new category for sponsorship or survey classification.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Category name"
                required
              />
            </div>
            <div>
              <Label htmlFor="type">Type *</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sponsorship">Sponsorship</SelectItem>
                  <SelectItem value="survey">Survey</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="label">Display Label *</Label>
            <Input
              id="label"
              value={formData.label}
              onChange={(e) => setFormData({ ...formData, label: e.target.value })}
              placeholder="How this category will be displayed"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe what this category is for"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="color">Color</Label>
              <Select value={formData.color} onValueChange={(value) => setFormData({ ...formData, color: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blue">Blue</SelectItem>
                  <SelectItem value="red">Red</SelectItem>
                  <SelectItem value="green">Green</SelectItem>
                  <SelectItem value="yellow">Yellow</SelectItem>
                  <SelectItem value="purple">Purple</SelectItem>
                  <SelectItem value="orange">Orange</SelectItem>
                  <SelectItem value="pink">Pink</SelectItem>
                  <SelectItem value="indigo">Indigo</SelectItem>
                  <SelectItem value="gray">Gray</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="icon">Icon</Label>
              <Input
                id="icon"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                placeholder="Lucide icon name"
              />
            </div>
            <div>
              <Label htmlFor="sortOrder">Sort Order</Label>
              <Input
                id="sortOrder"
                type="number"
                value={formData.sortOrder}
                onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 1 })}
              />
            </div>
          </div>

          {formData.type === 'sponsorship' && (
            <div>
              <Label htmlFor="defaultAmount">Default Monthly Amount (₹)</Label>
              <Input
                id="defaultAmount"
                type="number"
                value={formData.defaultMonthlyAmount}
                onChange={(e) => setFormData({ ...formData, defaultMonthlyAmount: parseInt(e.target.value) || 0 })}
              />
            </div>
          )}

          {formData.type === 'survey' && (
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Input
                id="priority"
                type="number"
                min="1"
                max="10"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 1 })}
              />
            </div>
          )}

          {formData.type === 'sponsorship' && (
            <div className="space-y-3">
              <Label>Eligibility Rules (Optional)</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="minAge" className="text-sm">Min Age</Label>
                  <Input
                    id="minAge"
                    type="number"
                    value={formData.eligibilityRules.minAge}
                    onChange={(e) => setFormData({
                      ...formData,
                      eligibilityRules: { ...formData.eligibilityRules, minAge: e.target.value }
                    })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="maxAge" className="text-sm">Max Age</Label>
                  <Input
                    id="maxAge"
                    type="number"
                    value={formData.eligibilityRules.maxAge}
                    onChange={(e) => setFormData({
                      ...formData,
                      eligibilityRules: { ...formData.eligibilityRules, maxAge: e.target.value }
                    })}
                    placeholder="120"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="relationships" className="text-sm">Relationships (comma-separated)</Label>
                <Input
                  id="relationships"
                  value={formData.eligibilityRules.relationships}
                  onChange={(e) => setFormData({
                    ...formData,
                    eligibilityRules: { ...formData.eligibilityRules, relationships: e.target.value }
                  })}
                  placeholder="mother, father, son, daughter"
                />
              </div>
              <div>
                <Label htmlFor="conditions" className="text-sm">Conditions (comma-separated)</Label>
                <Input
                  id="conditions"
                  value={formData.eligibilityRules.conditions}
                  onChange={(e) => setFormData({
                    ...formData,
                    eligibilityRules: { ...formData.eligibilityRules, conditions: e.target.value }
                  })}
                  placeholder="student, elderly, disabled, widowed"
                />
              </div>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Switch
              id="active"
              checked={formData.active}
              onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
            />
            <Label htmlFor="active">Active</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Category'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}