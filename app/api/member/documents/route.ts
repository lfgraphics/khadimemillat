import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { checkRole } from '@/lib/auth'
import connectDB from '@/lib/db'
import FinancialDocument from '@/models/FinancialDocument'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user has member role
    const isMember = await checkRole(['member', 'admin', 'moderator'])
    if (!isMember) {
      return NextResponse.json(
        { error: 'Member access required' },
        { status: 403 }
      )
    }

    await connectDB()

    // Fetch documents accessible to members
    const documents = await FinancialDocument.find({
      $or: [
        { isPublic: true },
        { memberAccessLevel: 'all' },
        { memberAccessLevel: 'verified_only' }
      ]
    })
    .sort({ generatedAt: -1 })
    .limit(20)
    .lean()

    const formattedDocuments = documents.map((doc: any) => ({
      id: doc._id.toString(),
      name: doc.title,
      type: getDocumentTypeLabel(doc.documentType),
      size: formatFileSize(doc.fileSize || 0),
      date: doc.generatedAt.toISOString(),
      downloadUrl: doc.fileUrl,
      period: {
        year: doc.period.year,
        quarter: doc.period.quarter,
        month: doc.period.month
      },
      summary: doc.summary
    }))

    return NextResponse.json({
      success: true,
      documents: formattedDocuments
    })

  } catch (error) {
    console.error('Documents fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    )
  }
}

function getDocumentTypeLabel(type: string): string {
  const labels = {
    'annual_report': 'Annual Report',
    'quarterly_report': 'Quarterly Report',
    'monthly_report': 'Monthly Report',
    'audit_report': 'Audit Report',
    'impact_assessment': 'Impact Assessment',
    'utilization_report': 'Utilization Report'
  }
  return labels[type as keyof typeof labels] || type
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}