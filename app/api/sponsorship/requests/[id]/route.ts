import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import connectDB from "@/lib/db";
import SponsorshipRequest from "@/models/SponsorshipRequest";
import User from "@/models/User";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    await connectDB();

    // Check if user has permission (admin, moderator, or inquiry_officer)
    const user = await User.findOne({ clerkUserId: userId });
    if (!user || !['admin', 'moderator', 'inquiry_officer'].includes(user.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const requestId = id;

    // Fetch the sponsorship request with populated references
    const sponsorshipRequest = await SponsorshipRequest.findById(requestId)
      .populate('submittedBy', 'name email')
      .populate('assignedOfficer', 'name email')
      .lean();

    if (!sponsorshipRequest) {
      return NextResponse.json(
        { error: "Request not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: sponsorshipRequest
    });

  } catch (error) {
    console.error("Error fetching sponsorship request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    await connectDB();

    // Check if user has permission (admin or moderator)
    const user = await User.findOne({ clerkUserId: userId });
    if (!user || !['admin', 'moderator'].includes(user.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const requestId = id;
    const body = await request.json();

    // Update the sponsorship request
    const updatedRequest = await SponsorshipRequest.findByIdAndUpdate(
      requestId,
      body,
      { new: true }
    ).populate('submittedBy', 'name email')
     .populate('assignedOfficer', 'name email');

    if (!updatedRequest) {
      return NextResponse.json(
        { error: "Request not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedRequest
    });

  } catch (error) {
    console.error("Error updating sponsorship request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}