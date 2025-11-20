import { NextRequest, NextResponse } from "next/server";
import { checkUserPermissionsAPI } from "@/lib/auth-utils";
import { uploadPhotoToCloudinary } from "@/lib/photo-upload";

export async function POST(request: NextRequest) {
  try {
    // Check permissions
    const permissionResult = await checkUserPermissionsAPI(['admin', 'moderator', 'surveyor', 'surveyor']);
    
    if ('error' in permissionResult) {
      return NextResponse.json(
        { error: permissionResult.error },
        { status: permissionResult.status }
      );
    }

    const formData = await request.formData();
    const photo = formData.get('photo') as File;
    const memberIndex = formData.get('memberIndex') as string;
    const category = formData.get('category') as string;
    const documentType = formData.get('documentType') as string;

    if (!photo || !photo.type.startsWith('image/')) {
      return NextResponse.json(
        { error: "No valid photo provided" },
        { status: 400 }
      );
    }

    // Get survey ID from request (we'll need to pass this)
    const surveyId = formData.get('surveyId') as string || 'temp-survey';
    
    // Create organized folder structure: survey-data/[surveyId]/members/[memberIndex] or family
    let folder = `survey-data/${surveyId}`;
    if (memberIndex !== undefined && memberIndex !== null) {
      folder += `/members/member-${memberIndex}`;
    } else {
      folder += `/family`;
    }
    folder += `/${category}`;
    
    const result = await uploadPhotoToCloudinary(photo, folder);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to upload photo" },
        { status: 500 }
      );
    }

    const uploadedPhoto = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2)}`,
      url: result.url,
      publicId: result.publicId,
      category,
      memberIndex: memberIndex ? parseInt(memberIndex) : undefined,
      documentType: documentType || undefined,
      description: `${category} for ${memberIndex ? `member ${parseInt(memberIndex) + 1}` : 'family'}`,
      uploadedAt: new Date()
    };

    // If this is a member photo, also save to FamilyMember collection
    if (memberIndex !== undefined && memberIndex !== null) {
      try {
        const FamilyMember = (await import('@/models/FamilyMember')).default;
        const SurveyResponse = (await import('@/models/SurveyResponse')).default;
        
        // Find survey by surveyId
        const survey = await SurveyResponse.findOne({ surveyId });
        if (survey) {
          // Find or create family member
          let member = await FamilyMember.findOne({
            surveyId: survey._id,
            memberIndex: parseInt(memberIndex)
          });

          if (member) {
            // Add photo to existing member
            member.photos.push({
              category,
              url: result.url,
              publicId: result.publicId,
              documentType: documentType || undefined,
              description: uploadedPhoto.description,
              uploadedAt: new Date()
            });
            await member.save();
          }
        }
      } catch (memberError) {
        console.error('Error saving photo to member:', memberError);
        // Don't fail the upload if member save fails
      }
    }

    return NextResponse.json({
      success: true,
      photo: uploadedPhoto,
      message: "Photo uploaded successfully"
    });

  } catch (error) {
    console.error("Error uploading photos:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}