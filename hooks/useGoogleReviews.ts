"use client";

import { useState, useEffect } from 'react';

interface GoogleReview {
  id: string;
  author: string;
  authorUrl?: string;
  profilePhoto?: string;
  rating: number;
  text: string;
  date: string;
  timestamp: number;
  language: string;
  verified: boolean;
}

interface GoogleBusinessData {
  name: string;
  rating: number;
  totalReviews: number;
  address: string;
  phone?: string;
  website?: string;
  reviews: GoogleReview[];
}

interface UseGoogleReviewsReturn {
  data: GoogleBusinessData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useGoogleReviews(): UseGoogleReviewsReturn {
  const [data, setData] = useState<GoogleBusinessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/google-reviews');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
      } else {
        throw new Error(result.error || 'Failed to load reviews');
      }
    } catch (err) {
      console.error('Error fetching Google reviews:', err);
      setError(err instanceof Error ? err.message : 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  return {
    data,
    loading,
    error,
    refetch: fetchReviews
  };
}

export default useGoogleReviews;