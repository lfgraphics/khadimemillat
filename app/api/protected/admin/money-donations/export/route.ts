import { auth } from '@clerk/nextjs/server'
import dbConnect from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { CampaignDonation } from '@/models'

export async function GET(request: NextRequest) {
  try {
    const { userId, sessionClaims } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is admin or moderator
    const userRole = (sessionClaims as any)?.metadata?.role || 'user'
    
    if (!['admin', 'moderator', 'auditor'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    await dbConnect()

    // Get query parameters for filtering (same as main route)
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const paymentVerified = searchParams.get('paymentVerified')
    const panProvided = searchParams.get('panProvided')
    const search = searchParams.get('search')
    const showAll = searchParams.get('showAll') === 'true'
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    // Build query with same filtering logic as main route
    const query: any = {}
    
    // Handle status filtering
    if (!showAll) {
      query.status = 'completed'
    } else if (status && status !== 'all') {
      query.status = status
    }

    // Handle payment verification filtering
    if (!showAll && (!paymentVerified || paymentVerified === 'all')) {
      // Default: only verified payments when not showing all
      query.paymentVerified = true
    } else if (paymentVerified === 'verified') {
      query.paymentVerified = true
    } else if (paymentVerified === 'unverified') {
      query.paymentVerified = { $ne: true }
    }

    // Handle PAN filtering
    if (panProvided === 'provided') {
      query.donorPAN = { $exists: true, $ne: null }
    } else if (panProvided === 'not_provided') {
      query.donorPAN = { $in: [null, ''] }
    }

    // Apply search filter
    if (search) {
      query.$or = [
        { donorName: { $regex: search, $options: 'i' } },
        { donorEmail: { $regex: search, $options: 'i' } }
      ]
    }

    // Add date range filtering
    if (dateFrom || dateTo) {
      const dateFilter: any = {}
      if (dateFrom) {
        dateFilter.$gte = new Date(dateFrom)
      }
      if (dateTo) {
        dateFilter.$lte = new Date(dateTo)
      }
      query.createdAt = dateFilter
    }

    // Fetch all matching donations for export (no pagination)
    const donations = await CampaignDonation.find(query)
      .populate('campaignId', 'title')
      .populate('programId', 'title')
      .sort({ createdAt: -1 })
      .lean()

    // Generate CSV content
    const csvHeaders = [
      'Donation ID',
      'Donor Name',
      'Donor Email',
      'Donor Phone',
      'PAN Number',
      'Amount (₹)',
      'Payment Method',
      'Status',
      'Payment Verified',
      'Campaign',
      'Program',
      'Donation Date',
      'Payment Reference',
      'Message'
    ]

    const csvRows = donations.map(donation => [
      (donation._id as any).toString(),
      donation.donorName || '',
      donation.donorEmail || '',
      donation.donorPhone || '',
      donation.donorPAN ? donation.donorPAN.toUpperCase() : 'Not Provided',
      donation.amount.toString(),
      donation.paymentMethod || '',
      donation.status || '',
      donation.paymentVerified ? 'Yes' : 'No',
      (donation as any).campaignId?.title || '',
      (donation as any).programId?.title || '',
      new Date(donation.createdAt).toLocaleDateString('en-IN'),
      donation.paymentReference || '',
      donation.message || ''
    ])

    // Convert to CSV format
    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => 
        row.map(field => 
          // Escape fields containing commas, quotes, or newlines
          typeof field === 'string' && (field.includes(',') || field.includes('"') || field.includes('\n'))
            ? `"${field.replace(/"/g, '""')}"` 
            : field
        ).join(',')
      )
    ].join('\n')

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `money-donations-export-${timestamp}.csv`

    // Return CSV file
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    })

  } catch (error) {
    console.error('Error exporting money donations:', error)
    return NextResponse.json(
      { error: 'Failed to export donations' },
      { status: 500 }
    )
  }
}