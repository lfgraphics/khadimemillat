import fs from 'fs';
import path from 'path';
import Activity, { IActivity } from '@/models/Activity';
import connectDB from '@/lib/db';

export interface ActivityData {
  _id: string;
  title?: string;
  description?: string;
  images: string[];
  date: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
  slug?: string;
}

export interface CreateActivityData {
  title?: string;
  description?: string;
  images: string[];
  date?: Date;
  createdBy?: string;
}

export interface UpdateActivityData {
  title?: string;
  description?: string;
  images?: string[];
  date?: Date;
  isActive?: boolean;
  updatedBy?: string;
}

class ActivitiesService {
  // Generate SEO-friendly slug from title and ID
  private generateSlug(title: string | undefined, id: string): string {
    if (!title || title.trim() === '') {
      return `activity-${id}`;
    }
    
    const slugTitle = title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
    
    return `${slugTitle}-${id}`;
  }

  // Extract ID from slug
  extractIdFromSlug(slug: string): string {
    const parts = slug.split('-');
    const lastPart = parts[parts.length - 1];
    
    // Check if the last part looks like a MongoDB ObjectId (24 hex characters)
    if (lastPart && lastPart.length === 24 && /^[0-9a-fA-F]{24}$/.test(lastPart)) {
      return lastPart;
    }
    
    // Fallback: assume the entire slug is an ID
    return slug;
  }
  async getAllActivities(includeInactive = false): Promise<ActivityData[]> {
    await connectDB();
    
    const filter = includeInactive ? {} : { isActive: true };
    const activities = await Activity.find(filter)
      .sort({ date: -1, createdAt: -1 })
      .lean();
    
    return activities.map((activity: any) => {
      const id = activity._id.toString();
      return {
        _id: id,
        title: activity.title,
        description: activity.description,
        images: activity.images,
        date: activity.date.toISOString(),
        isActive: activity.isActive,
        createdAt: activity.createdAt?.toISOString(),
        updatedAt: activity.updatedAt?.toISOString(),
        createdBy: activity.createdBy,
        updatedBy: activity.updatedBy,
        slug: this.generateSlug(activity.title, id)
      };
    });
  }

  async getActivityById(id: string): Promise<ActivityData | null> {
    await connectDB();
    
    const activity = await Activity.findById(id).lean();
    if (!activity) return null;
    
    const activityId = (activity as any)._id.toString();
    return {
      _id: activityId,
      title: (activity as any).title,
      description: (activity as any).description,
      images: (activity as any).images,
      date: (activity as any).date.toISOString(),
      isActive: (activity as any).isActive,
      createdAt: (activity as any).createdAt?.toISOString(),
      updatedAt: (activity as any).updatedAt?.toISOString(),
      createdBy: (activity as any).createdBy,
      updatedBy: (activity as any).updatedBy,
      slug: this.generateSlug((activity as any).title, activityId)
    };
  }

  async getActivityBySlug(slug: string): Promise<ActivityData | null> {
    const id = this.extractIdFromSlug(slug);
    return this.getActivityById(id);
  }

  async createActivity(data: CreateActivityData): Promise<ActivityData> {
    await connectDB();
    
    const activity = new Activity({
      title: data.title?.trim(),
      description: data.description?.trim(),
      images: data.images,
      date: data.date || new Date(),
      createdBy: data.createdBy,
      isActive: true
    });
    
    const savedActivity = await activity.save();
    
    const savedId = savedActivity._id.toString();
    return {
      _id: savedId,
      title: savedActivity.title,
      description: savedActivity.description,
      images: savedActivity.images,
      date: savedActivity.date.toISOString(),
      isActive: savedActivity.isActive,
      createdAt: savedActivity.createdAt?.toISOString(),
      updatedAt: savedActivity.updatedAt?.toISOString(),
      createdBy: savedActivity.createdBy,
      slug: this.generateSlug(savedActivity.title, savedId)
    };
  }

  async updateActivity(id: string, data: UpdateActivityData): Promise<ActivityData | null> {
    await connectDB();
    
    const updateData: any = {
      updatedBy: data.updatedBy
    };
    
    if (data.title !== undefined) updateData.title = data.title?.trim();
    if (data.description !== undefined) updateData.description = data.description?.trim();
    if (data.images !== undefined) updateData.images = data.images;
    if (data.date !== undefined) updateData.date = data.date;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    
    const activity = await Activity.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).lean();
    
    if (!activity) return null;
    
    const updatedId = (activity as any)._id.toString();
    return {
      _id: updatedId,
      title: (activity as any).title,
      description: (activity as any).description,
      images: (activity as any).images,
      date: (activity as any).date.toISOString(),
      isActive: (activity as any).isActive,
      createdAt: (activity as any).createdAt?.toISOString(),
      updatedAt: (activity as any).updatedAt?.toISOString(),
      createdBy: (activity as any).createdBy,
      updatedBy: (activity as any).updatedBy,
      slug: this.generateSlug((activity as any).title, updatedId)
    };
  }

  async deleteActivity(id: string): Promise<boolean> {
    await connectDB();
    
    const result = await Activity.findByIdAndDelete(id);
    return !!result;
  }

  // Get images from public/activities folder
  getActivitiesImages(): string[] {
    try {
      const activitiesDir = path.join(process.cwd(), 'public', 'activities');
      
      if (!fs.existsSync(activitiesDir)) {
        return [];
      }
      
      const files = fs.readdirSync(activitiesDir);
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
      
      return files
        .filter(file => {
          const ext = path.extname(file).toLowerCase();
          return imageExtensions.includes(ext);
        })
        .map(file => `/activities/${file}`)
        .sort();
    } catch (error) {
      console.error('Error reading activities directory:', error);
      return [];
    }
  }

  // Get combined activities (database + file system)
  async getCombinedActivities(): Promise<{
    managedActivities: ActivityData[];
    galleryImages: string[];
  }> {
    const [managedActivities, allImages] = await Promise.all([
      this.getAllActivities(),
      Promise.resolve(this.getActivitiesImages())
    ]);

    // Get images that are already managed in database
    const managedImages = new Set(
      managedActivities.flatMap(activity => activity.images)
    );

    // Filter out managed images from gallery
    const galleryImages = allImages.filter(image => !managedImages.has(image));

    return {
      managedActivities,
      galleryImages
    };
  }
}

export const activitiesService = new ActivitiesService();
export default activitiesService;