import { useState, useEffect } from 'react';
import { CategoryData } from '@/lib/categories';

interface CategoriesResponse {
  sponsorshipCategories?: CategoryData[];
  surveyCategories?: CategoryData[];
  categories?: CategoryData[];
}

export function useCategories(type?: 'sponsorship' | 'survey') {
  const [categories, setCategories] = useState<CategoriesResponse>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        const url = type ? `/api/admin/categories?type=${type}` : '/api/admin/categories';
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error('Failed to fetch categories');
        }
        
        const data = await response.json();
        setCategories(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch categories');
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, [type]);

  return { categories, loading, error };
}