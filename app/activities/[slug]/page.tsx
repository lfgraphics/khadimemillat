import { Metadata } from "next";
import { notFound } from "next/navigation";
import { activitiesService } from '@/lib/services/activities.service';
import ActivityDetailClient from './ActivityDetailClient';

interface ActivityPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ActivityPageProps): Promise<Metadata> {
  const { slug } = await params;
  
  try {
    const activity = await activitiesService.getActivityBySlug(slug);
    
    if (!activity) {
      return {
        title: "Activity Not Found - Khadim-e-Millat Welfare Foundation",
        description: "The requested activity could not be found.",
      };
    }

    const activityTitle = activity.title || 'Community Activity';
    const activityDescription = activity.description || "View details of this community activity and welfare initiative by Khadim-e-Millat Welfare Foundation.";

    return {
      title: `${activityTitle} - Khadim-e-Millat Welfare Foundation`,
      description: activityDescription,
      keywords: [
        "activity", 
        "community service", 
        "welfare", 
        "Gorakhpur", 
        "charity", 
        "social impact",
        "community work",
        "volunteer",
        activityTitle.toLowerCase()
      ],
      authors: [{ name: "Khadim-e-Millat Welfare Foundation" }],
      openGraph: {
        title: `${activityTitle} - Community Activity`,
        description: activityDescription,
        images: activity.images.length > 0 ? [
          {
            url: activity.images[0],
            width: 1200,
            height: 630,
            alt: activityTitle,
          }
        ] : [],
        type: 'article',
        publishedTime: activity.date,
        modifiedTime: activity.updatedAt,
        section: 'Community Activities',
        tags: ['community', 'welfare', 'charity', 'social impact'],
      },
      twitter: {
        card: 'summary_large_image',
        title: `${activityTitle} - Community Activity`,
        description: activityDescription,
        images: activity.images.length > 0 ? [activity.images[0]] : [],
      },
      alternates: {
        canonical: `/activities/${slug}`,
      },
    };
  } catch (error) {
    console.error('Error generating metadata for activity:', error);
    return {
      title: "Activity - Khadim-e-Millat Welfare Foundation",
      description: "Community activity by Khadim-e-Millat Welfare Foundation",
    };
  }
}

export default async function ActivityDetailPage({ params }: ActivityPageProps) {
  const { slug } = await params;
  
  try {
    const activity = await activitiesService.getActivityBySlug(slug);
    
    if (!activity) {
      notFound();
    }

    return <ActivityDetailClient activity={activity} />;
  } catch (error) {
    console.error('Error loading activity:', error);
    notFound();
  }
}