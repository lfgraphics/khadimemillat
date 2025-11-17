'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Heart,
  XCircle,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';
import { useState as useReactState, useEffect } from 'react';

interface MemberSponsorshipPanelProps {
  member: any;
  surveyId?: string; // Made optional since it's not used
}

export function MemberSponsorshipPanel({ member, surveyId }: MemberSponsorshipPanelProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [sponsorshipCategory, setSponsorshipCategory] = useState('');
  const [monthlyAmount, setMonthlyAmount] = useState('');
  const [description, setDescription] = useState('');
  const [memberHumanId, setMemberHumanId] = useState('');
  const [availableCategories, setAvailableCategories] = useReactState<any[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useReactState(true);

  const handleEnableSponsorship = async () => {
    if (!sponsorshipCategory || !monthlyAmount || !description) {
      toast.error('Please fill all required fields');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/members/${member._id}/sponsorship`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'enable',
          sponsorshipCategory,
          monthlyAmount: parseInt(monthlyAmount),
          description,
          memberHumanId: memberHumanId || undefined
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to enable sponsorship');
      }

      const result = await response.json();
      toast.success(result.message);
      
      // Refresh the page to show updated status
      window.location.reload();
    } catch (error) {
      console.error('Error enabling sponsorship:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to enable sponsorship');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisableSponsorship = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/members/${member._id}/sponsorship`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'disable'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to disable sponsorship');
      }

      const result = await response.json();
      toast.success(result.message);
      
      // Refresh the page
      window.location.reload();
    } catch (error) {
      console.error('Error disabling sponsorship:', error);
      toast.error('Failed to disable sponsorship');
    } finally {
      setIsLoading(false);
    }
  };

  const isAvailableForSponsorship = member.sponsorship?.availableForSponsorship;
  const hasActiveSponsor = member.sponsorship?.currentSponsor;

  // Fetch all sponsorship categories (let management decide)
  useEffect(() => {
    const fetchAllCategories = async () => {
      try {
        setCategoriesLoading(true);
        const response = await fetch('/api/admin/categories?type=sponsorship');
        
        if (response.ok) {
          const data = await response.json();
          console.log('Fetched all sponsorship categories:', data.categories);
          console.log('Total categories available:', data.categories?.length || 0);
          setAvailableCategories(data.categories || []);
        } else {
          console.error('Failed to fetch categories, status:', response.status);
          const errorData = await response.json().catch(() => ({}));
          console.error('Error data:', errorData);
          setAvailableCategories([]);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
        setAvailableCategories([]);
      } finally {
        setCategoriesLoading(false);
      }
    };

    fetchAllCategories();
  }, []);

  const getSponsorshipCategories = () => {
    console.log('Getting sponsorship categories, availableCategories:', availableCategories);
    return availableCategories.map(cat => ({
      value: cat.slug,
      label: cat.label,
      defaultAmount: cat.defaultMonthlyAmount
    }));
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Current Status */}
      {isAvailableForSponsorship ? (
        <div className="flex items-center gap-2">
          <Badge variant="default" className="bg-green-500">
            <Heart className="w-3 h-3 mr-1" />
            Available for Sponsorship
          </Badge>
          {member.sponsorship?.memberHumanId && (
            <Badge variant="outline">
              ID: {member.sponsorship.memberHumanId}
            </Badge>
          )}
        </div>
      ) : (
        <Badge variant="secondary">
          Not Available for Sponsorship
        </Badge>
      )}

      {/* Sponsorship Status */}
      {hasActiveSponsor && (
        <div className="text-xs text-muted-foreground">
          <p>Sponsored by: {member.sponsorship.currentSponsor.name}</p>
          <p>Monthly: ₹{member.sponsorship.monthlyAmount}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        {!isAvailableForSponsorship ? (
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Heart className="w-4 h-4 mr-2" />
                Enable Sponsorship
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Enable Sponsorship for {member.name}</DialogTitle>
                <DialogDescription>
                  Configure sponsorship details for this family member. You can select any available category - management decides eligibility.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="category">Sponsorship Category (All Available)</Label>
                  <Select 
                    value={sponsorshipCategory} 
                    onValueChange={(value) => {
                      setSponsorshipCategory(value);
                      // Auto-fill default amount
                      const category = availableCategories.find(cat => cat.slug === value);
                      if (category?.defaultMonthlyAmount) {
                        setMonthlyAmount(category.defaultMonthlyAmount.toString());
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categoriesLoading ? (
                        <SelectValue>Loading categories...</SelectValue>
                      ) : getSponsorshipCategories().length === 0 ? (
                        <SelectValue>No categories available</SelectValue>
                      ) : (
                        getSponsorshipCategories().map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                            {cat.defaultAmount && (
                              <span className="text-xs text-muted-foreground ml-2">
                                (₹{cat.defaultAmount})
                              </span>
                            )}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="amount">Monthly Support Amount (₹)</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="e.g., 2000"
                    value={monthlyAmount}
                    onChange={(e) => setMonthlyAmount(e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="humanId">Member Human ID (Optional)</Label>
                  <Input
                    id="humanId"
                    placeholder="e.g., KMWF-2024-001"
                    value={memberHumanId}
                    onChange={(e) => setMemberHumanId(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Leave empty to auto-generate
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="description">Support Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe the type of support needed..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleEnableSponsorship}
                  disabled={isLoading || !sponsorshipCategory || !monthlyAmount || !description}
                >
                  {isLoading ? 'Processing...' : 'Enable Sponsorship'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : (
          <div className="flex gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Settings className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Edit Sponsorship for {member.name}</DialogTitle>
                  <DialogDescription>
                    Update sponsorship configuration.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Current Category</Label>
                    <p className="text-sm text-muted-foreground">
                      {member.sponsorship?.category ? 
                        availableCategories.find(cat => cat.slug === member.sponsorship.category)?.label || member.sponsorship.category
                        : 'Not set'}
                    </p>
                  </div>
                  <div>
                    <Label>Current Monthly Amount</Label>
                    <p className="text-sm text-muted-foreground">
                      ₹{member.sponsorship?.monthlyAmount || 0}
                    </p>
                  </div>
                  <div>
                    <Label>Member ID</Label>
                    <p className="text-sm text-muted-foreground">
                      {member.sponsorship?.memberHumanId || 'Not assigned'}
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline">
                    Update Configuration
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" variant="destructive">
                  <XCircle className="w-4 h-4 mr-2" />
                  Disable
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Disable Sponsorship</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to disable sponsorship for {member.name}? 
                    This will remove them from the sponsorship program.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    onClick={handleDisableSponsorship}
                    disabled={isLoading}
                    variant="destructive"
                  >
                    {isLoading ? 'Processing...' : 'Disable Sponsorship'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {/* Sponsorship Info */}
      {isAvailableForSponsorship && (
        <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
          <p><strong>Category:</strong> {member.sponsorship?.category ? 
            availableCategories.find(cat => cat.slug === member.sponsorship.category)?.label || member.sponsorship.category
            : 'Not set'}</p>
          <p><strong>Monthly Amount:</strong> ₹{member.sponsorship?.monthlyAmount}</p>
          {member.sponsorship?.description && (
            <p><strong>Description:</strong> {member.sponsorship.description}</p>
          )}
        </div>
      )}
    </div>
  );
}