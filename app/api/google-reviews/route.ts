import { NextResponse } from 'next/server';
import { googleReviewsService } from '@/lib/services/google-reviews.service';

export async function GET() {
  try {
    const businessDetails = await googleReviewsService.getBusinessDetails();
    
    if (!businessDetails) {
      return NextResponse.json(
        { error: 'Failed to fetch business details' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        name: businessDetails.name,
        rating: businessDetails.rating,
        totalReviews: businessDetails.user_ratings_total,
        address: businessDetails.formatted_address,
        phone: businessDetails.formatted_phone_number,
        website: businessDetails.website,
        reviews: businessDetails.reviews.map(review => ({
          id: `${review.author_name}-${review.time}`,
          author: review.author_name,
          authorUrl: review.author_url,
          profilePhoto: review.profile_photo_url,
          rating: review.rating,
          text: review.text,
          date: review.relative_time_description,
          timestamp: review.time,
          language: review.language,
          verified: true // Google reviews are inherently verified
        }))
      }
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
      }
    });
  } catch (error) {
    console.error('Error in Google Reviews API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}