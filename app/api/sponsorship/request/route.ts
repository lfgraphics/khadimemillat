import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import connectDB from "@/lib/db";
import SponsorshipRequest from "@/models/SponsorshipRequest";
import User from "@/models/User";
import { z } from "zod";

// Simplified validation schema matching the frontend form
const createRequestSchema = z.object({
  applicantName: z.string().min(2, "Name must be at least 2 characters"),
  fatherName: z.string().min(2, "Father's name must be at least 2 characters"),
  phone: z.string().min(10, "Please provide a valid phone number"),
  alternatePhone: z.string().optional(),
  fullAddress: z.string().min(10, "Please provide complete address"),
  reasonForRequest: z.string().min(10, "Please briefly explain why you need help")
});

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    await connectDB();

    // Parse and validate request body
    const body = await request.json();
    const validatedData = createRequestSchema.parse(body);

    // Check if user exists
    const user = await User.findOne({ clerkUserId: userId });
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Create sponsorship request with simplified data
    const sponsorshipRequest = new SponsorshipRequest({
      applicantName: validatedData.applicantName,
      fatherName: validatedData.fatherName,
      // aadhaar is optional and will be collected during survey if available
      contactInfo: {
        phone: validatedData.phone,
        alternatePhone: validatedData.alternatePhone || undefined
      },
      fullAddress: validatedData.fullAddress,
      basicRequest: {
        reasonForRequest: validatedData.reasonForRequest
      },
      submittedBy: user._id,
      status: 'pending'
    });

    // Save the request
    const savedRequest = await sponsorshipRequest.save();

    // Send notification to admins about new request
    try {
      // Import notification service
      const { NotificationService } = await import('@/lib/services/notification.service');
      
      await NotificationService.sendNotification({
        title: 'New Sponsorship Request',
        message: `New sponsorship request from ${validatedData.applicantName}`,
        channels: ['web_push', 'email'],
        targetRoles: ['admin', 'moderator'],
        sentBy: user._id.toString(),
        metadata: {
          type: 'sponsorship_request',
          requestId: (savedRequest._id as any).toString(),
          applicantName: validatedData.applicantName,
          url: `/admin/sponsorship`
        }
      });
    } catch (notificationError) {
      console.error('Failed to send notification:', notificationError);
      // Don't fail the request if notification fails
    }

    return NextResponse.json({
      success: true,
      message: 'Sponsorship request submitted successfully',
      data: {
        requestId: savedRequest.requestId,
        id: savedRequest._id
      }
    });

  } catch (error) {
    console.error("Error creating sponsorship request:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: "Validation failed", 
          details: error.issues.map((e: any) => ({
            field: e.path.join('.'),
            message: e.message
          }))
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    await connectDB();

    const user = await User.findOne({ clerkUserId: userId });
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');

    // Build query based on user role
    let query: any = {};

    // Regular users can only see their own requests
    if (user.role === 'user') {
      query.submittedBy = user._id;
    }

    // Add filters
    if (status) {
      query.status = status;
    }
    if (priority) {
      query.priority = priority;
    }

    const skip = (page - 1) * limit;

    const [requests, total] = await Promise.all([
      SponsorshipRequest.find(query)
        .populate('submittedBy', 'name email')
        .populate('assignedOfficer', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SponsorshipRequest.countDocuments(query)
    ]);

    return NextResponse.json({
      success: true,
      data: {
        requests,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error("Error fetching sponsorship requests:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}