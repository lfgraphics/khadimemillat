// Helper functions for working with database categories
// This file provides client-side utilities for category management

export interface CategoryData {
  _id: string;
  name: string;
  slug: string;
  type: 'sponsorship' | 'survey' | 'general';
  label: string;
  description: string;
  color: string;
  icon?: string;
  priority?: number;
  defaultMonthlyAmount?: number;
  eligibilityRules?: {
    minAge?: number;
    maxAge?: number;
    relationships?: string[];
    healthStatuses?: string[];
    conditions?: string[];
    maritalStatuses?: string[];
  };
  active: boolean;
  sortOrder: number;
  usageCount?: number;
  lastUsed?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Client-side helper functions
export async function fetchCategories(type?: 'sponsorship' | 'survey'): Promise<CategoryData[]> {
  try {
    const url = type ? `/api/admin/categories?type=${type}` : '/api/admin/categories';
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error('Failed to fetch categories');
    }
    
    const data = await response.json();
    
    if (type) {
      return data.categories || [];
    } else {
      return [
        ...(data.sponsorshipCategories || []),
        ...(data.surveyCategories || [])
      ];
    }
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}

export async function fetchEligibleCategories(memberId: string): Promise<CategoryData[]> {
  try {
    const response = await fetch(`/api/admin/members/${memberId}/eligible-categories`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch eligible categories');
    }
    
    const data = await response.json();
    return data.categories || [];
  } catch (error) {
    console.error('Error fetching eligible categories:', error);
    return [];
  }
}

export function getCategoryLabel(categories: CategoryData[], slug: string): string {
  const category = categories.find(cat => cat.slug === slug);
  return category?.label || slug;
}

export function getCategoryBySlug(categories: CategoryData[], slug: string): CategoryData | undefined {
  return categories.find(cat => cat.slug === slug);
}

// Legacy support - these will be deprecated
export function getSponsorshipCategories(): any[] {
  console.warn('getSponsorshipCategories is deprecated. Use fetchCategories("sponsorship") instead.');
  return [];
}

export function getSurveyCategories(): any[] {
  console.warn('getSurveyCategories is deprecated. Use fetchCategories("survey") instead.');
  return [];
}