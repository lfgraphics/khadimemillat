import connectDB from "@/lib/db";
import FamilyMember from "@/models/FamilyMember";
import SurveyResponse from "@/models/SurveyResponse";
import User from "@/models/User";
import { checkUserPermissions } from "@/lib/auth-utils";

// Create or update family members from survey data
export async function syncFamilyMembers(surveyId: string, familyMembersData: any[], userId: string) {
  try {
    await connectDB();

    const survey = await SurveyResponse.findById(surveyId);
    if (!survey) {
      throw new Error("Survey not found");
    }

    const user = await User.findOne({ clerkUserId: userId });
    if (!user) {
      throw new Error("User not found");
    }

    const familyMemberIds: string[] = [];

    // Process each family member
    for (let index = 0; index < familyMembersData.length; index++) {
      const memberData = familyMembersData[index];

      // Check if family member already exists
      let familyMember = await FamilyMember.findOne({
        surveyId: survey._id,
        memberIndex: index
      });

      const memberPayload = {
        ...memberData,
        surveyId: survey._id,
        surveyHumanId: survey.surveyId,
        memberIndex: index,
        photos: [], // Photos will be managed separately
        createdBy: user._id,
        lastModifiedBy: user._id
      };

      if (familyMember) {
        // Update existing member
        Object.assign(familyMember, memberPayload);
        await familyMember.save();
      } else {
        // Create new member
        familyMember = new FamilyMember(memberPayload);
        await familyMember.save();
      }

      familyMemberIds.push(familyMember._id.toString());
    }

    // Update survey with family member references
    survey.familyMemberIds = familyMemberIds.map(id => id as any);
    survey.lastModifiedAt = new Date();
    survey.lastModifiedBy = user._id;
    await survey.save();

    return { success: true, familyMemberIds };
  } catch (error) {
    console.error("Error syncing family members:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to sync family members"
    };
  }
}

// Update sponsorship properties (moderator only)
export async function updateMemberSponsorship(memberId: string, sponsorshipData: any) {
  try {
    const { user } = await checkUserPermissions(['admin', 'moderator']);

    const member = await FamilyMember.findById(memberId);
    if (!member) {
      throw new Error("Family member not found");
    }

    // Update sponsorship properties
    member.sponsorship = {
      ...member.sponsorship,
      ...sponsorshipData
    };
    member.lastModifiedBy = user._id;

    await member.save();

    return { success: true, member };
  } catch (error) {
    console.error("Error updating member sponsorship:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update sponsorship"
    };
  }
}

// Get members available for sponsorship
export async function getAvailableMembers(filters?: {
  category?: string;
  priority?: string;
  status?: string;
}) {
  try {
    await connectDB();

    const query: any = {
      'sponsorship.availableForSponsorship': true
    };

    if (filters?.category) {
      query['sponsorship.category'] = filters.category;
    }
    if (filters?.priority) {
      query['sponsorship.priority'] = filters.priority;
    }
    if (filters?.status) {
      query['sponsorship.sponsorshipStatus'] = filters.status;
    }

    const members = await FamilyMember.find(query)
      .populate('surveyId', 'surveyId personalDetails status')
      .populate('createdBy', 'name')
      .sort({ 'sponsorship.priority': -1, createdAt: -1 });

    return { success: true, members };
  } catch (error) {
    console.error("Error getting available members:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get members"
    };
  }
}

// Add photo to family member
export async function addMemberPhoto(memberId: string, photoData: any) {
  try {
    await connectDB();

    const member = await FamilyMember.findById(memberId);
    if (!member) {
      throw new Error("Family member not found");
    }

    member.photos.push({
      category: photoData.category,
      url: photoData.url,
      publicId: photoData.publicId,
      documentType: photoData.documentType,
      description: photoData.description,
      uploadedAt: new Date()
    });

    await member.save();

    return { success: true, member };
  } catch (error) {
    console.error("Error adding member photo:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add photo"
    };
  }
}

// Get family members for a survey
export async function getSurveyFamilyMembers(surveyId: string) {
  try {
    await connectDB();

    const members = await FamilyMember.find({ surveyId })
      .sort({ memberIndex: 1 });

    return { success: true, members };
  } catch (error) {
    console.error("Error getting survey family members:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get family members"
    };
  }
}
