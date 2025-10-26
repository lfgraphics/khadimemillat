import { Metadata } from "next";
import { activitiesService } from '@/lib/services/activities.service';
import ActivitiesClient from './ActivitiesClient';

export const metadata: Metadata = {
  title: "Our Activities - Community Welfare Programs | Khadim-e-Millat Welfare Foundation",
  description: "Explore our community activities, welfare programs, and social initiatives in Gorakhpur, Uttar Pradesh. See how we're making a positive impact through sustainable scrap collection, healthcare support, education assistance, and community development programs.",
  keywords: [
    "community activities", 
    "welfare programs", 
    "social initiatives", 
    "Gorakhpur activities", 
    "charity work", 
    "social impact", 
    "community service",
    "volunteer work",
    "healthcare support",
    "education assistance",
    "food distribution",
    "emergency relief",
    "sustainable development",
    "community development"
  ],
  authors: [{ name: "Khadim-e-Millat Welfare Foundation" }],
  openGraph: {
    title: "Our Activities - Community Welfare Programs",
    description: "Explore our community activities and welfare programs in Gorakhpur. See how we're making a positive impact through various social initiatives.",
    type: "website",
    url: "/activities",
    images: [
      {
        url: "/android-chrome-512x512.png",
        width: 512,
        height: 512,
        alt: "Khadim-e-Millat Welfare Foundation Activities",
      }
    ],
    siteName: "Khadim-e-Millat Welfare Foundation",
  },
  twitter: {
    card: "summary_large_image",
    title: "Our Activities - Community Welfare Programs",
    description: "Explore our community activities and welfare programs in Gorakhpur. See how we're making a positive impact.",
  },
  alternates: {
    canonical: "/activities",
  },
};

export default async function ActivitiesPage() {
  try {
    const data = await activitiesService.getCombinedActivities();
    
    return (
      <ActivitiesClient 
        initialManagedActivities={data.managedActivities}
        initialGalleryImages={data.galleryImages}
      />
    );
  } catch (error) {
    console.error('Error loading activities:', error);
    
    // Fallback to just gallery images
    const galleryImages = activitiesService.getActivitiesImages();
    
    return (
      <ActivitiesClient 
        initialManagedActivities={[]}
        initialGalleryImages={galleryImages}
      />
    );
  }
}