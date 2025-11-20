import { NextRequest, NextResponse } from 'next/server'
import { uploadImage } from '@/lib/cloudinary-server'
import { checkUserPermissionsAPI } from '@/lib/auth-utils'
import { validateReceiptFileServer } from '@/lib/validators/receipt.validator'

export async function POST(request: NextRequest) {
  try {
    // Check permissions - only admin and moderator can upload receipts
    const authResult = await checkUserPermissionsAPI(['admin', 'moderator'])
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type - receipts can be images or PDFs
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, WebP, and PDF files are allowed for receipts.' },
        { status: 400 }
      )
    }

    // Validate file size (10MB limit for receipts)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB for receipt uploads.' },
        { status: 413 }
      )
    }

    // Convert file to buffer and then to data URI
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const dataUri = `data:${file.type};base64,${buffer.toString('base64')}`

    // Prepare upload options specific to receipts
    const uploadOptions: any = {
      resource_type: file.type === 'application/pdf' ? 'raw' : 'image',
      folder: 'kmwf/receipts',
      use_filename: true,
      unique_filename: true,
      overwrite: false,
      tags: ['receipt', 'expense-management']
    }

    // Add expense ID tag if provided
    const expenseId = formData.get('expenseId')
    if (expenseId) {
      uploadOptions.tags.push(`expense-${expenseId}`)
    }

    // Add user ID tag for tracking
    const { user } = authResult
    uploadOptions.tags.push(`user-${user.clerkUserId}`)

    // Upload to Cloudinary
    const result = await uploadImage(dataUri, uploadOptions)

    // Validate the upload result
    const validation = validateReceiptFileServer(result)
    if (!validation.isValid) {
      console.error('Upload result validation failed:', validation.errors)
      return NextResponse.json(
        { error: 'Upload completed but result validation failed', details: validation.errors },
        { status: 500 }
      )
    }

    // Return standardized response with receipt-specific metadata
    return NextResponse.json({
      public_id: result.public_id,
      url: result.url,
      secure_url: result.secure_url,
      width: result.width || null,
      height: result.height || null,
      format: result.format,
      bytes: result.bytes,
      created_at: result.created_at,
      resource_type: result.resource_type,
      // Additional metadata for receipts
      original_filename: result.original_filename,
      tags: result.tags
    })

  } catch (error) {
    console.error('Receipt upload error:', error)
    
    // Handle specific Cloudinary errors
    if (error && typeof error === 'object' && 'http_code' in error) {
      const cloudinaryError = error as any
      
      if (cloudinaryError.http_code === 400) {
        return NextResponse.json(
          { error: 'Invalid file or upload parameters' },
          { status: 400 }
        )
      } else if (cloudinaryError.http_code === 401) {
        return NextResponse.json(
          { error: 'Cloudinary authentication failed' },
          { status: 401 }
        )
      } else if (cloudinaryError.http_code === 413) {
        return NextResponse.json(
          { error: 'File too large for Cloudinary' },
          { status: 413 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Internal server error during receipt upload' },
      { status: 500 }
    )
  }
}