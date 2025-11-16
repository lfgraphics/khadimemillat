import { NextRequest, NextResponse } from "next/server";
import { checkUserPermissionsAPI } from "@/lib/auth-utils";
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function DELETE(request: NextRequest) {
  try {
    // Check permissions
    const permissionResult = await checkUserPermissionsAPI(['admin', 'moderator', 'inquiry_officer', 'surveyor']);
    
    if ('error' in permissionResult) {
      return NextResponse.json(
        { error: permissionResult.error },
        { status: permissionResult.status }
      );
    }

    const { searchParams } = new URL(request.url);
    const publicId = searchParams.get('publicId');

    if (!publicId) {
      return NextResponse.json(
        { error: "Public ID is required" },
        { status: 400 }
      );
    }

    try {
      // Delete from Cloudinary
      const result = await cloudinary.uploader.destroy(publicId);
      
      console.log('Cloudinary deletion result:', result);

      if (result.result === 'ok' || result.result === 'not found') {
        return NextResponse.json({
          success: true,
          message: "Photo deleted successfully",
          result: result.result
        });
      } else {
        throw new Error(`Cloudinary deletion failed: ${result.result}`);
      }
    } catch (cloudinaryError) {
      console.error('Cloudinary deletion error:', cloudinaryError);
      return NextResponse.json(
        { error: "Failed to delete photo from cloud storage" },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("Error deleting photo:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}