import { NextRequest, NextResponse } from 'next/server'
import { uploadImage } from '@/lib/cloudinary-server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' },
        { status: 400 }
      )
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 413 }
      )
    }

    // Convert file to buffer and then to data URI
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const dataUri = `data:${file.type};base64,${buffer.toString('base64')}`

    // Prepare upload options
    const uploadOptions: any = {
      resource_type: 'image',
      folder: formData.get('folder') || 'kmwf/file-selector',
      use_filename: true,
      unique_filename: true,
      overwrite: false
    }

    // Add tags if provided
    const tags = formData.get('tags')
    if (tags) {
      uploadOptions.tags = tags.toString().split(',')
    }

    // Add transformation if provided
    const transformation = formData.get('transformation')
    if (transformation) {
      try {
        uploadOptions.transformation = JSON.parse(transformation.toString())
      } catch (error) {
        console.warn('Invalid transformation JSON:', error)
      }
    }

    // Upload to Cloudinary using data URI
    const result = await uploadImage(dataUri, uploadOptions)

    // Return standardized response
    return NextResponse.json({
      success: true,
      public_id: result.public_id,
      url: result.url,
      secure_url: result.secure_url,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
      created_at: result.created_at
    })

  } catch (error) {
    console.error('Cloudinary upload error:', error)
    
    // Handle specific Cloudinary errors
    if (error && typeof error === 'object' && 'http_code' in error) {
      const cloudinaryError = error as any
      
      if (cloudinaryError.http_code === 400) {
        return NextResponse.json(
          { success: false, error: 'Invalid file or upload parameters' },
          { status: 400 }
        )
      } else if (cloudinaryError.http_code === 401) {
        return NextResponse.json(
          { success: false, error: 'Cloudinary authentication failed' },
          { status: 401 }
        )
      } else if (cloudinaryError.http_code === 413) {
        return NextResponse.json(
          { success: false, error: 'File too large for Cloudinary' },
          { status: 413 }
        )
      }
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error during upload', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}