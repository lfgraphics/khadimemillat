"use client";

import { useState } from "react";
import { Star, ExternalLink, Quote } from "lucide-react";
import { AnimatedSection } from '@/components/animations';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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

interface GoogleReviewsClientProps {
  initialData: GoogleBusinessData | null;
  error?: string;
}

const GOOGLE_BUSINESS_URL = "https://g.page/r/CbQCl9C5slOyEBE/review";
const GOOGLE_REVIEWS_URL = "https://share.google/iBzqMXM0KkT4DHKF3";

interface StarRatingProps {
  rating: number;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
}

function StarRating({ rating, size = "md", interactive = false, onRatingChange }: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0);
  
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6"
  };

  const displayRating = interactive ? (hoverRating || rating) : rating;

  return (
    <div className="flex items-center space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${sizeClasses[size]} ${
            star <= displayRating
              ? "fill-yellow-400 text-yellow-400"
              : "text-gray-300"
          } ${interactive ? "cursor-pointer hover:scale-110 transition-transform" : ""}`}
          onClick={interactive ? () => onRatingChange?.(star) : undefined}
          onMouseEnter={interactive ? () => setHoverRating(star) : undefined}
          onMouseLeave={interactive ? () => setHoverRating(0) : undefined}
        />
      ))}
    </div>
  );
}

interface ReviewCardProps {
  review: GoogleReview;
}

function ReviewCard({ review }: ReviewCardProps) {
  return (
    <Card className="h-full">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            {review.profilePhoto && (
              <img
                src={review.profilePhoto}
                alt={review.author}
                className="w-10 h-10 rounded-full object-cover"
              />
            )}
            <div>
              <h4 className="font-semibold text-foreground">
                {review.authorUrl ? (
                  <a 
                    href={review.authorUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:text-primary transition-colors"
                  >
                    {review.author}
                  </a>
                ) : (
                  review.author
                )}
              </h4>
              <p className="text-sm text-muted-foreground">{review.date}</p>
            </div>
          </div>
          {review.verified && (
            <div className="flex items-center text-xs text-green-600 bg-green-50 dark:bg-green-950 px-2 py-1 rounded-full">
              ✓ Google Verified
            </div>
          )}
        </div>
        
        <div className="mb-4">
          <StarRating rating={review.rating} size="sm" />
        </div>
        
        <div className="relative">
          <Quote className="absolute -top-2 -left-2 h-4 w-4 text-muted-foreground/30" />
          <p className="text-muted-foreground italic pl-4">
            "{review.text}"
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function GoogleReviewsClient({ initialData, error }: GoogleReviewsClientProps) {
  const [userRating, setUserRating] = useState(0);

  const handleLeaveReview = () => {
    window.open(GOOGLE_BUSINESS_URL, '_blank', 'noopener,noreferrer');
  };

  const handleViewAllReviews = () => {
    window.open(GOOGLE_REVIEWS_URL, '_blank', 'noopener,noreferrer');
  };

  if (error || !initialData) {
    return (
      <section className="py-16 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Customer Reviews
            </h2>
            <p className="text-muted-foreground mb-8">
              {error || "Unable to load reviews at this time."}
            </p>
            <Button onClick={handleViewAllReviews}>
              <ExternalLink className="mr-2 h-4 w-4" />
              View Reviews on Google
            </Button>
          </div>
        </div>
      </section>
    );
  }

  const { rating: averageRating, totalReviews, reviews } = initialData;

  return (
    <section className="py-16 bg-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedSection variant="fade" delay={0.1}>
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              What People Say About Us
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              Real reviews from our Google Business Profile - see how we're making a difference together
            </p>
            
            {/* Overall Rating */}
            <div className="flex flex-col items-center space-y-2 mb-8">
              <div className="flex items-center space-x-4">
                <StarRating rating={Math.round(averageRating)} size="lg" />
                <div className="text-left">
                  <div className="text-3xl font-bold text-foreground">
                    {averageRating.toFixed(1)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Based on {totalReviews} Google reviews
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button onClick={handleLeaveReview} size="lg" className="flex items-center">
                <Star className="mr-2 h-5 w-5" />
                Leave a Review on Google
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
              <Button onClick={handleViewAllReviews} variant="outline" size="lg" className="flex items-center">
                View All Reviews
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </AnimatedSection>

        {/* Interactive Rating */}
        <AnimatedSection variant="slideUp" delay={0.2}>
          <Card className="max-w-md mx-auto mb-12 p-6">
            <CardContent className="flex flex-col p-0 text-center items-center justify-center">
              <h3 className="text-xl font-semibold mb-4">Rate Your Experience</h3>
              <p className="text-muted-foreground mb-4">
                How would you rate our service?
              </p>
              <StarRating 
                rating={userRating} 
                size="lg" 
                interactive 
                onRatingChange={setUserRating}
              />
              {userRating > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground mb-3">
                    Thank you for rating us {userRating} star{userRating !== 1 ? 's' : ''}!
                  </p>
                  <Button onClick={handleLeaveReview} size="sm">
                    Leave Detailed Review
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </AnimatedSection>

        {/* Reviews Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reviews.slice(0, 6).map((review, index) => (
            <AnimatedSection 
              key={review.id} 
              variant="slideUp" 
              delay={0.1 + (index * 0.1)}
            >
              <ReviewCard review={review} />
            </AnimatedSection>
          ))}
        </div>

        {/* Show more reviews if available */}
        {reviews.length > 6 && (
          <AnimatedSection variant="fade" delay={0.6}>
            <div className="text-center mt-8">
              <p className="text-muted-foreground mb-4">
                Showing 6 of {reviews.length} recent reviews
              </p>
              <Button onClick={handleViewAllReviews} variant="outline">
                View All {totalReviews} Reviews on Google
              </Button>
            </div>
          </AnimatedSection>
        )}

        {/* Google Business Link */}
        <AnimatedSection variant="fade" delay={0.5}>
          <div className="text-center mt-12">
            <p className="text-muted-foreground mb-4">
              Find us on Google Business for more reviews and information
            </p>
            <Button onClick={handleViewAllReviews} variant="outline">
              <ExternalLink className="mr-2 h-4 w-4" />
              Visit Our Google Business Page
            </Button>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}