import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import connectDB from "@/lib/db"
import User from "@/models/User"
import { NotificationService } from "@/lib/services/notification.service"

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    // Check if user is admin or moderator
    const user = await User.findOne({ clerkUserId: userId })
    if (!user || !['admin', 'moderator'].includes(user.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }
    
    const body = await request.json()
    const { 
      title, 
      message, 
      channels, 
      targetRoles,
      metadata 
    } = body
    
    if (!title || !message || !channels || !targetRoles) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Validate channels
    const validChannels = ['web_push', 'email', 'whatsapp', 'sms']
    const invalidChannels = channels.filter((c: string) => !validChannels.includes(c))
    if (invalidChannels.length > 0) {
      return NextResponse.json(
        { error: `Invalid channels: ${invalidChannels.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate target roles
    const validRoles = ['admin', 'moderator', 'field_executive', 'accountant', 'user', 'everyone']
    const invalidRoles = targetRoles.filter((r: string) => !validRoles.includes(r))
    if (invalidRoles.length > 0) {
      return NextResponse.json(
        { error: `Invalid roles: ${invalidRoles.join(', ')}` },
        { status: 400 }
      )
    }
    
    // Send notification
    const result = await NotificationService.sendNotification({
      title,
      message,
      channels,
      targetRoles,
      sentBy: userId,
      metadata
    })
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      logId: result.logId,
      totalUsers: result.totalUsers,
      results: result.results
    })
  } catch (error) {
    console.error("Error sending notification:", error)
    return NextResponse.json(
      { error: "Failed to send notification" },
      { status: 500 }
    )
  }
}