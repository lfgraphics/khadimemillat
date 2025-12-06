import { NextResponse } from 'next/server'
import { checkRole } from '@/utils/roles'
import connectDB from '@/lib/db'
import SadqaSubscription from '@/models/SadqaSubscription'

export async function GET() {
  try {
    // Check if user is admin or moderator
    const isAdmin = await checkRole('admin')
    const isModerator = await checkRole('moderator')
    
    if (!isAdmin && !isModerator) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    await connectDB()

    // Get all subscriptions
    const subscriptions = await SadqaSubscription.find()
      .sort({ createdAt: -1 })
      .lean()

    // Enrich with user details
    const enrichedSubscriptions = await Promise.all(
      subscriptions.map(async (subscription) => {
        return {
          ...subscription,
          userName: subscription.userName || 'Unknown User',
          userEmail: subscription.userEmail || 'No email',
          userPhone: subscription.userPhone || 'No phone'
        }
      })
    )

    // Create CSV content
    const csvHeaders = [
      'ID',
      'User Name',
      'User Email',
      'User Phone',
      'Plan Type',
      'Amount',
      'Status',
      'Start Date',
      'Next Payment Date',
      'Total Paid',
      'Payment Count',
      'Failed Payment Count',
      'Razorpay Subscription ID',
      'Created At'
    ]

    const csvRows = enrichedSubscriptions.map((sub: any) => [
      sub._id,
      sub.userName,
      sub.userEmail,
      sub.userPhone,
      sub.planType,
      sub.amount,
      sub.status,
      sub.startDate ? new Date(sub.startDate).toISOString().split('T')[0] : '',
      sub.nextPaymentDate ? new Date(sub.nextPaymentDate).toISOString().split('T')[0] : '',
      sub.totalPaid || 0,
      sub.paymentCount || 0,
      sub.failedPaymentCount || 0,
      sub.razorpaySubscriptionId || '',
      new Date(sub.createdAt).toISOString().split('T')[0]
    ])

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n')

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="sadqa-subscriptions-${new Date().toISOString().split('T')[0]}.csv"`
      }
    })

  } catch (error) {
    console.error('Error exporting subscription data:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to export subscription data' 
      },
      { status: 500 }
    )
  }
}