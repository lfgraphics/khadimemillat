import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import SponsorshipRequest from '@/models/SponsorshipRequest';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    const user = await User.findOne({ clerkUserId: userId });
    
    if (!user || !['admin', 'moderator', 'inquiry_officer'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get sponsorship request
    const sponsorshipRequest = await SponsorshipRequest.findById((await params).id).lean() as any;
    
    if (!sponsorshipRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // If there's an assigned officer, fetch their details
    let assignedOfficerDetails = null;
    if (sponsorshipRequest.assignedOfficer) {
      try {
        let clerkUserId = sponsorshipRequest.assignedOfficer;
        
        // Check if assignedOfficer is a MongoDB ObjectId (legacy format)
        if (sponsorshipRequest.assignedOfficer.length === 24 && /^[0-9a-fA-F]{24}$/.test(sponsorshipRequest.assignedOfficer)) {
          // This looks like a MongoDB ObjectId, find the corresponding Clerk user ID
          const officerUser = await User.findById(sponsorshipRequest.assignedOfficer);
          if (officerUser?.clerkUserId) {
            clerkUserId = officerUser.clerkUserId;
          } else {
            console.warn('Legacy officer assignment found but no corresponding Clerk user ID');
            assignedOfficerDetails = {
              _id: sponsorshipRequest.assignedOfficer,
              name: 'Officer (Legacy)',
              email: 'N/A'
            };
          }
        }
        
        // Fetch from Clerk if we have a valid Clerk user ID
        if (clerkUserId && clerkUserId !== sponsorshipRequest.assignedOfficer) {
          const { clerkClient } = await import('@clerk/nextjs/server');
          const client = await clerkClient();
          const officer = await client.users.getUser(clerkUserId);
          
          assignedOfficerDetails = {
            _id: officer.id,
            name: officer.firstName && officer.lastName 
              ? `${officer.firstName} ${officer.lastName}` 
              : (officer.username || 'Officer'),
            email: officer.emailAddresses?.[0]?.emailAddress
          };
        } else if (clerkUserId === sponsorshipRequest.assignedOfficer) {
          // Direct Clerk user ID
          const { clerkClient } = await import('@clerk/nextjs/server');
          const client = await clerkClient();
          const officer = await client.users.getUser(clerkUserId);
          
          assignedOfficerDetails = {
            _id: officer.id,
            name: officer.firstName && officer.lastName 
              ? `${officer.firstName} ${officer.lastName}` 
              : (officer.username || 'Officer'),
            email: officer.emailAddresses?.[0]?.emailAddress
          };
        }
      } catch (error) {
        console.error('Error fetching officer details:', error);
        // Fallback for when we can't fetch officer details
        assignedOfficerDetails = {
          _id: sponsorshipRequest.assignedOfficer,
          name: 'Officer (Unavailable)',
          email: 'N/A'
        };
      }
    }

    // If there's a submittedBy user, fetch their details from Clerk
    let submittedByDetails = null;
    if (sponsorshipRequest.submittedBy) {
      try {
        const { clerkClient } = await import('@clerk/nextjs/server');
        const client = await clerkClient();
        const submitter = await client.users.getUser(sponsorshipRequest.submittedBy);
        
        submittedByDetails = {
          _id: submitter.id,
          name: submitter.firstName && submitter.lastName 
            ? `${submitter.firstName} ${submitter.lastName}` 
            : (submitter.username || 'User'),
          email: submitter.emailAddresses?.[0]?.emailAddress
        };
      } catch (error) {
        console.error('Error fetching submitter details:', error);
      }
    }

    const responseData = {
      ...sponsorshipRequest,
      assignedOfficer: assignedOfficerDetails,
      submittedBy: submittedByDetails
    };

    return NextResponse.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('Error fetching sponsorship request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}