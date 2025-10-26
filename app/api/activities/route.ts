import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { activitiesService } from '@/lib/services/activities.service';

// GET /api/activities - Get all activities
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';
    const combined = searchParams.get('combined') === 'true';

    if (combined) {
      const data = await activitiesService.getCombinedActivities();
      return NextResponse.json({
        success: true,
        data
      });
    }

    const activities = await activitiesService.getAllActivities(includeInactive);
    
    return NextResponse.json({
      success: true,
      data: activities
    });
  } catch (error) {
    console.error('Error fetching activities:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch activities' },
      { status: 500 }
    );
  }
}

// POST /api/activities - Create new activity (Admin only)
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { title, description, images, date } = body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one image is required' },
        { status: 400 }
      );
    }

    const activity = await activitiesService.createActivity({
      title,
      description,
      images,
      date: date ? new Date(date) : undefined,
      createdBy: userId
    });

    return NextResponse.json({
      success: true,
      data: activity
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating activity:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create activity' },
      { status: 500 }
    );
  }
}