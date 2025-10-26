import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { activitiesService } from '@/lib/services/activities.service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/activities/[id] - Get single activity
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const activity = await activitiesService.getActivityById(id);
    
    if (!activity) {
      return NextResponse.json(
        { success: false, error: 'Activity not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: activity
    });
  } catch (error) {
    console.error('Error fetching activity:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch activity' },
      { status: 500 }
    );
  }
}

// PUT /api/activities/[id] - Update activity (Admin only)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { title, description, images, date, isActive } = body;

    const activity = await activitiesService.updateActivity(id, {
      title,
      description,
      images,
      date: date ? new Date(date) : undefined,
      isActive,
      updatedBy: userId
    });

    if (!activity) {
      return NextResponse.json(
        { success: false, error: 'Activity not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: activity
    });
  } catch (error) {
    console.error('Error updating activity:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update activity' },
      { status: 500 }
    );
  }
}

// DELETE /api/activities/[id] - Delete activity (Admin only)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const success = await activitiesService.deleteActivity(id);

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Activity not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Activity deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting activity:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete activity' },
      { status: 500 }
    );
  }
}