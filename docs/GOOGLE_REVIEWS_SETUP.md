# Google Reviews Integration Setup

This guide explains how to set up real Google Business reviews integration for the Khadim-e-Millat Welfare Foundation website.

## Overview

The website now fetches real reviews and business statistics from your Google Business Profile using the Google Places API. This provides authentic, up-to-date reviews and ratings directly from Google.

## Setup Instructions

### 1. Get Google Places API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Places API**:
   - Go to "APIs & Services" > "Library"
   - Search for "Places API"
   - Click "Enable"
4. Create credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - Copy the API key

### 2. Configure Environment Variables

Add the following to your `.env` file:

```env
GOOGLE_PLACES_API_KEY=your_api_key_here
GOOGLE_BUSINESS_PLACE_ID=CbQCl9C5slOyEBE
```

### 3. Find Your Place ID

Your Google Business Place ID is already configured as `CbQCl9C5slOyEBE` (extracted from your Google Business URL: `https://g.page/r/CbQCl9C5slOyEBE/review`).

If you need to find a different Place ID:
1. Use [Google Place ID Finder](https://developers.google.com/maps/documentation/places/web-service/place-id)
2. Or extract from your Google Business URL

### 4. API Restrictions (Recommended)

For security, restrict your API key:
1. In Google Cloud Console, go to "Credentials"
2. Click on your API key
3. Under "API restrictions", select "Restrict key"
4. Choose "Places API"
5. Under "Website restrictions", add your domain

## Features

### Real-Time Data
- ✅ **Live Reviews**: Fetches actual Google Business reviews
- ✅ **Current Ratings**: Shows real average rating and review count
- ✅ **Business Info**: Displays address, phone, website from Google
- ✅ **Profile Photos**: Shows reviewer profile pictures when available
- ✅ **Verified Reviews**: All Google reviews are automatically verified

### Fallback System
- If API key is missing or invalid, shows mock data
- Graceful error handling with fallback to static reviews
- Caching for better performance (1-hour cache)

### Components Available

1. **GoogleReviewsServer** - Server-side rendered reviews (SEO-friendly)
2. **GoogleReviewsClient** - Client-side reviews with interactivity
3. **GoogleBusinessStats** - Compact stats widget
4. **useGoogleReviews** - React hook for custom implementations

## Usage Examples

### Basic Reviews Section
```tsx
import GoogleReviewsServer from '@/components/GoogleReviewsServer';

export default function AboutPage() {
  return (
    <div>
      <GoogleReviewsServer />
    </div>
  );
}
```

### Business Stats Widget
```tsx
import GoogleBusinessStats from '@/components/GoogleBusinessStats';

export default function HomePage() {
  return (
    <div>
      <GoogleBusinessStats showDetails={true} />
    </div>
  );
}
```

### Custom Hook Usage
```tsx
import useGoogleReviews from '@/hooks/useGoogleReviews';

export default function CustomComponent() {
  const { data, loading, error } = useGoogleReviews();
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return (
    <div>
      <h2>Rating: {data?.rating}/5</h2>
      <p>Total Reviews: {data?.totalReviews}</p>
    </div>
  );
}
```

## API Endpoints

### GET /api/google-reviews
Returns business details and reviews:

```json
{
  "success": true,
  "data": {
    "name": "Khadim-e-Millat Welfare Foundation",
    "rating": 4.8,
    "totalReviews": 127,
    "address": "Gorakhpur, Uttar Pradesh, India",
    "reviews": [...]
  }
}
```

## Caching

- Server-side caching: 1 hour
- Browser caching: 24 hours with stale-while-revalidate
- Reduces API calls and improves performance

## Troubleshooting

### Common Issues

1. **No reviews showing**
   - Check if `GOOGLE_PLACES_API_KEY` is set correctly
   - Verify Places API is enabled in Google Cloud Console
   - Check browser console for API errors

2. **API quota exceeded**
   - Google Places API has usage limits
   - Consider implementing longer caching
   - Monitor usage in Google Cloud Console

3. **Wrong business data**
   - Verify `GOOGLE_BUSINESS_PLACE_ID` is correct
   - Use Google Place ID Finder to get the right ID

### Testing

Test the API endpoint directly:
```bash
curl http://localhost:3000/api/google-reviews
```

## Cost Considerations

- Google Places API charges per request
- Current implementation caches for 1 hour to minimize costs
- Monitor usage in Google Cloud Console
- Set up billing alerts

## Security

- Never expose API keys in client-side code
- Use environment variables for sensitive data
- Implement API key restrictions
- Consider using server-side proxy for additional security

## Support

For issues with Google Places API:
- [Google Places API Documentation](https://developers.google.com/maps/documentation/places/web-service/overview)
- [Google Cloud Support](https://cloud.google.com/support)

For implementation issues:
- Check the browser console for errors
- Verify environment variables are loaded
- Test API endpoint directly