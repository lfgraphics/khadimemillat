import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { checkRole } from '@/lib/auth'
import connectDB from '@/lib/db'
import FinancialDocument from '@/models/FinancialDocument'
import { v2 as cloudinary } from 'cloudinary'

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user has admin or moderator role
    const hasAccess = await checkRole(['admin', 'moderator'])
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    await connectDB()

    const formData = await request.formData()
    const file = formData.get('file') as File
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const documentType = formData.get('documentType') as string
    const year = parseInt(formData.get('year') as string)
    const quarter = formData.get('quarter') ? parseInt(formData.get('quarter') as string) : undefined
    const month = formData.get('month') ? parseInt(formData.get('month') as string) : undefined

    // Validate required fields
    if (!file || !title || !documentType || !year) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only PDF, Word, and Excel files are allowed.' },
        { status: 400 }
      )
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size too large. Maximum size is 10MB.' },
        { status: 400 }
      )
    }

    // Convert file to buffer for Cloudinary upload
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Upload to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          resource_type: 'auto',
          folder: 'financial-documents',
          public_id: `${documentType}_${year}_${Date.now()}`,
          format: file.name.split('.').pop()
        },
        (error, result) => {
          if (error) reject(error)
          else resolve(result)
        }
      ).end(buffer)
    }) as any

    // Calculate period dates
    let startDate: Date, endDate: Date
    
    if (documentType === 'annual_report') {
      startDate = new Date(year, 0, 1)
      endDate = new Date(year + 1, 0, 1)
    } else if (documentType === 'quarterly_report' && quarter) {
      startDate = new Date(year, (quarter - 1) * 3, 1)
      endDate = new Date(year, quarter * 3, 1)
    } else if (documentType === 'monthly_report' && month) {
      startDate = new Date(year, month - 1, 1)
      endDate = new Date(year, month, 1)
    } else {
      startDate = new Date(year, 0, 1)
      endDate = new Date(year + 1, 0, 1)
    }

    // Create financial document record
    const document = new FinancialDocument({
      title,
      description,
      documentType,
      period: {
        startDate,
        endDate,
        year,
        quarter,
        month
      },
      fileUrl: uploadResult.secure_url,
      fileSize: file.size,
      generatedBy: userId,
      isPublic: true,
      memberAccessLevel: 'verified_only',
      summary: {
        totalDonations: 0, // Will be updated if needed
        totalExpenses: 0,
        netAmount: 0,
        beneficiariesHelped: 0,
        programsSupported: 0
      },
      metadata: {
        version: '1.0',
        generationMethod: 'manual',
        dataSourcePeriod: {
          from: startDate,
          to: endDate
        },
        originalFileName: file.name,
        fileType: file.type,
        cloudinaryPublicId: uploadResult.public_id
      }
    })

    await document.save()

    return NextResponse.json({
      success: true,
      message: 'Financial document uploaded successfully',
      document: {
        id: document._id,
        title: document.title,
        documentType: document.documentType,
        period: document.period,
        fileUrl: document.fileUrl,
        fileSize: document.fileSize
      }
    })

  } catch (error) {
    console.error('Upload financial document error:', error)
    return NextResponse.json(
      { error: 'Failed to upload financial document' },
      { status: 500 }
    )
  }
}