"use client";

import { Star, MapPin, Phone, Globe } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import useGoogleReviews from "@/hooks/useGoogleReviews";

interface GoogleBusinessStatsProps {
  showDetails?: boolean;
  className?: string;
}

export default function GoogleBusinessStats({ showDetails = false, className = "" }: GoogleBusinessStatsProps) {
  const { data, loading, error } = useGoogleReviews();

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="animate-pulse">
            <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return null;
  }

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-center space-x-2 mb-2">
          <div className="flex items-center">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`h-4 w-4 ${
                  star <= Math.round(data.rating)
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-gray-300"
                }`}
              />
            ))}
          </div>
          <span className="font-semibold text-lg">{data.rating.toFixed(1)}</span>
        </div>
        
        <p className="text-sm text-muted-foreground mb-3">
          Based on {data.totalReviews} Google reviews
        </p>

        {showDetails && (
          <div className="space-y-2 text-sm">
            {data.address && (
              <div className="flex items-center space-x-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{data.address}</span>
              </div>
            )}
            {data.phone && (
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Phone className="h-4 w-4" />
                <a href={`tel:${data.phone}`} className="hover:text-primary">
                  {data.phone}
                </a>
              </div>
            )}
            {data.website && (
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Globe className="h-4 w-4" />
                <a 
                  href={data.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-primary"
                >
                  Visit Website
                </a>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}