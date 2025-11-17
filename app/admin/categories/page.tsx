'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Settings,
  Heart,
  FileText,
  Plus,
  Edit,
  Trash2,
  Eye
} from "lucide-react";
import { toast } from 'sonner';
import { AddCategoryDialog } from '@/components/admin/AddCategoryDialog';
import { ViewCategoryDialog } from '@/components/admin/ViewCategoryDialog';
import { EditCategoryDialog } from '@/components/admin/EditCategoryDialog';

export default function CategoriesManagementPage() {
  const { userId } = useAuth();
  const [sponsorshipCategories, setSponsorshipCategories] = useState<any[]>([]);
  const [surveyCategories, setSurveyCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      fetchCategories();
    }
  }, [userId]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/categories');
      if (response.ok) {
        const data = await response.json();
        setSponsorshipCategories(data.sponsorshipCategories || []);
        setSurveyCategories(data.surveyCategories || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSeedCategories = async () => {
    try {
      setSeeding(true);
      const response = await fetch('/api/admin/seed-categories', { method: 'POST' });
      const data = await response.json();
      
      if (response.ok) {
        toast.success('Categories seeded successfully!');
        fetchCategories();
      } else {
        toast.error(`Failed to seed categories: ${data.error || 'Unknown error'}`);
        console.error('Seeding error:', data);
      }
    } catch (error) {
      toast.error('Error seeding categories');
      console.error('Seeding error:', error);
    } finally {
      setSeeding(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
    // First check if category can be deleted
    try {
      const usageResponse = await fetch(`/api/admin/categories/${categoryId}/usage`);
      const usageData = await usageResponse.json();
      
      if (!usageData.canDelete) {
        toast.error(`Cannot delete ${categoryName}: ${usageData.message}`);
        return;
      }
      
      if (!confirm(`Are you sure you want to delete "${categoryName}"? This action cannot be undone.`)) {
        return;
      }

      setDeletingCategory(categoryId);
      const response = await fetch(`/api/admin/categories/${categoryId}`, { method: 'DELETE' });
      
      if (response.ok) {
        toast.success('Category deleted successfully');
        fetchCategories();
      } else {
        const errorData = await response.json();
        toast.error(`Failed to delete category: ${errorData.error}`);
      }
    } catch (error) {
      toast.error('Error deleting category');
      console.error('Delete error:', error);
    } finally {
      setDeletingCategory(null);
    }
  };

  if (!userId) {
    return <div>Please sign in</div>;
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p>Loading categories...</p>
        </div>
      </div>
    );
  }

  // Show seed button if no categories exist
  if (sponsorshipCategories.length === 0 && surveyCategories.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Category Management</h1>
          <p className="text-muted-foreground mb-6">No categories found. Seed initial categories to get started.</p>
          <Button 
            onClick={handleSeedCategories}
            disabled={seeding}
            size="lg"
          >
            {seeding ? 'Seeding Categories...' : 'Seed Initial Categories'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Category Management</h1>
        <p className="text-muted-foreground">
          Manage sponsorship and survey categories used throughout the system.
        </p>
      </div>

      <Tabs defaultValue="sponsorship" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="sponsorship">
            <Heart className="w-4 h-4 mr-2" />
            Sponsorship Categories
          </TabsTrigger>
          <TabsTrigger value="survey">
            <FileText className="w-4 h-4 mr-2" />
            Survey Categories
          </TabsTrigger>
        </TabsList>

        {/* Sponsorship Categories */}
        <TabsContent value="sponsorship" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Heart className="w-5 h-5" />
                  Sponsorship Categories ({sponsorshipCategories.length})
                </CardTitle>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={handleSeedCategories}
                    disabled={seeding}
                  >
                    {seeding ? 'Seeding...' : 'Seed Categories'}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/admin/fix-sponsorship-index', { method: 'POST' });
                        const data = await response.json();
                        if (response.ok) {
                          toast.success('Sponsorship index fixed successfully!');
                        } else {
                          toast.error(`Failed to fix index: ${data.error}`);
                        }
                      } catch (error) {
                        toast.error('Error fixing sponsorship index');
                      }
                    }}
                  >
                    Fix Sponsorship Index
                  </Button>
                  <AddCategoryDialog onCategoryAdded={fetchCategories} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Default Amount</TableHead>
                    <TableHead>Eligibility Rules</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sponsorshipCategories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full bg-${category.color}-500`} />
                          <div>
                            <p className="font-medium">{category.label}</p>
                            <p className="text-xs text-muted-foreground">{category.id}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <p className="text-sm text-muted-foreground truncate">
                          {category.description}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          ₹{category.defaultMonthlyAmount}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs space-y-1">
                          {category.eligibilityRules?.minAge && (
                            <p>Min Age: {category.eligibilityRules.minAge}</p>
                          )}
                          {category.eligibilityRules?.maxAge && (
                            <p>Max Age: {category.eligibilityRules.maxAge}</p>
                          )}
                          {category.eligibilityRules?.relationships && (
                            <p>Relations: {category.eligibilityRules.relationships.join(', ')}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={category.active ? 'default' : 'secondary'}>
                          {category.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <ViewCategoryDialog 
                            categoryId={category._id} 
                            categoryName={category.name} 
                          />
                          <EditCategoryDialog 
                            categoryId={category._id} 
                            categoryName={category.name}
                            onCategoryUpdated={fetchCategories}
                          />
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleDeleteCategory(category._id, category.name)}
                            disabled={deletingCategory === category._id}
                          >
                            {deletingCategory === category._id ? (
                              <div className="w-3 h-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            ) : (
                              <Trash2 className="w-3 h-3" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Survey Categories */}
        <TabsContent value="survey" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Survey Categories ({surveyCategories.length})
                </CardTitle>
                <AddCategoryDialog onCategoryAdded={fetchCategories} />
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {surveyCategories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{category.label}</p>
                          <p className="text-xs text-muted-foreground">{category.id}</p>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <p className="text-sm text-muted-foreground truncate">
                          {category.description}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          Priority {category.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded bg-${category.color}-500`} />
                          <span className="text-sm capitalize">{category.color}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={category.active ? 'default' : 'secondary'}>
                          {category.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <ViewCategoryDialog 
                            categoryId={category._id} 
                            categoryName={category.name} 
                          />
                          <EditCategoryDialog 
                            categoryId={category._id} 
                            categoryName={category.name}
                            onCategoryUpdated={fetchCategories}
                          />
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleDeleteCategory(category._id, category.name)}
                            disabled={deletingCategory === category._id}
                          >
                            {deletingCategory === category._id ? (
                              <div className="w-3 h-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            ) : (
                              <Trash2 className="w-3 h-3" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Usage Statistics */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Category Usage Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{sponsorshipCategories.length}</p>
              <p className="text-sm text-muted-foreground">Active Sponsorship Categories</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{surveyCategories.length}</p>
              <p className="text-sm text-muted-foreground">Active Survey Categories</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">0</p>
              <p className="text-sm text-muted-foreground">Members Using Categories</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}