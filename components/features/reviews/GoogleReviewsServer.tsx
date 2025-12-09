import { googleReviewsService } from '@/lib/services/google-reviews.service';
import GoogleReviewsClient from './GoogleReviewsClient';

export default async function GoogleReviewsServer() {
  try {
    const businessDetails = await googleReviewsService.getBusinessDetails();
    
    if (!businessDetails) {
      return <GoogleReviewsClient initialData={null} error="Failed to load reviews" />;
    }

    const reviewsData = {
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
        verified: true
      }))
    };

    return <GoogleReviewsClient initialData={reviewsData} />;
  } catch (error) {
    console.error('Error in GoogleReviewsServer:', error);
    return <GoogleReviewsClient initialData={null} error="Failed to load reviews" />;
  }
}
