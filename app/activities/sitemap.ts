import { MetadataRoute } from 'next'
import { activitiesService } from '@/lib/services/activities.service'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const activities = await activitiesService.getAllActivities(false) // Only active activities

    const activityUrls = activities.map((activity) => ({
      url: `https://khadimemillat.org/activities/${activity.slug}`,
      lastModified: activity.updatedAt ? new Date(activity.updatedAt) : new Date(activity.createdAt || activity.date),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }))

    return [
      {
        url: 'https://khadimemillat.org/activities',
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.8,
      },
      ...activityUrls,
    ]
  } catch (error) {
    console.error('Error generating activities sitemap:', error)
    return [
      {
        url: 'https://khadimemillat.org/activities',
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.8,
      },
    ]
  }
}