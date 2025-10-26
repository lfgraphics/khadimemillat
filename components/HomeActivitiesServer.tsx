import { activitiesService } from '@/lib/services/activities.service';
import HomeActivitiesSection from './HomeActivitiesSection';

export default async function HomeActivitiesServer() {
  try {
    const data = await activitiesService.getCombinedActivities();
    
    // Only show if there are images to display
    if (data.managedActivities.length === 0 && data.galleryImages.length === 0) {
      return null;
    }
    
    return (
      <HomeActivitiesSection 
        activities={data.managedActivities}
        galleryImages={data.galleryImages}
      />
    );
  } catch (error) {
    console.error('Error loading activities for home page:', error);
    
    // Fallback to just gallery images
    try {
      const galleryImages = activitiesService.getActivitiesImages();
      
      if (galleryImages.length === 0) {
        return null;
      }
      
      return (
        <HomeActivitiesSection 
          activities={[]}
          galleryImages={galleryImages}
        />
      );
    } catch (fallbackError) {
      console.error('Error loading gallery images:', fallbackError);
      return null;
    }
  }
}