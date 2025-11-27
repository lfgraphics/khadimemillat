import { NextRequest, NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function POST(request: NextRequest) {
  try {
    const { publicId } = await request.json()
    
    if (!publicId) {
      return NextResponse.json(
        { success: false, error: 'No public_id provided' },
        { status: 400 }
      )
    }

    // Delete from Cloudinary
    const result = await cloudinary.uploader.destroy(publicId)
    
    if (result.result === 'ok') {
      return NextResponse.json({
        success: true,
        message: 'Image deleted successfully'
      })
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to delete image' },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('Cloudinary delete error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error during deletion' },
      { status: 500 }
    )
  }
}