import { NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import MembershipRequest from '@/models/MembershipRequest'

export async function GET() {
  try {
    await connectDB()
    
    const allRequests = await MembershipRequest.find({}).lean()
    const approvedRequests = await MembershipRequest.find({ status: 'approved' }).lean()
    
    return NextResponse.json({
      success: true,
      data: {
        totalRequests: allRequests.length,
        approvedRequests: approvedRequests.length,
        statuses: allRequests.map(r => ({ id: r._id, status: (r as any).status }))
      }
    })
  } catch (error) {
    console.error('Test members count error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}