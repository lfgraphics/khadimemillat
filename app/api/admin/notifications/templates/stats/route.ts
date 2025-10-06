import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import connectDB from "@/lib/db"
import User from "@/models/User"
import NotificationTemplate from "@/models/NotificationTemplate"

// GET /api/admin/notifications/templates/stats - Get template statistics
export async function GET(_request: NextRequest) {
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

    // Get overall statistics
    const [
      totalTemplates,
      activeTemplates,
      categoryStats,
      usageStats,
      recentTemplates
    ] = await Promise.all([
      NotificationTemplate.countDocuments(),
      NotificationTemplate.countDocuments({ isActive: true }),
      NotificationTemplate.aggregate([
        {
          $group: {
            _id: "$category",
            count: { $sum: 1 },
            totalUsage: { $sum: "$usageCount" }
          }
        }
      ]),
      NotificationTemplate.aggregate([
        {
          $group: {
            _id: null,
            totalUsage: { $sum: "$usageCount" },
            avgUsage: { $avg: "$usageCount" },
            maxUsage: { $max: "$usageCount" }
          }
        }
      ]),
      NotificationTemplate.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('name category usageCount createdAt')
    ])

    // Get top used templates
    const topUsedTemplates = await NotificationTemplate.find({ usageCount: { $gt: 0 } })
      .sort({ usageCount: -1 })
      .limit(5)
      .select('name usageCount category')

    // Format category stats
    const categoryStatsFormatted = categoryStats.reduce((acc, stat) => {
      acc[stat._id] = {
        count: stat.count,
        totalUsage: stat.totalUsage
      }
      return acc
    }, {} as Record<string, { count: number; totalUsage: number }>)

    const stats = {
      overview: {
        total: totalTemplates,
        active: activeTemplates,
        inactive: totalTemplates - activeTemplates,
        totalUsage: usageStats[0]?.totalUsage || 0,
        averageUsage: Math.round((usageStats[0]?.avgUsage || 0) * 100) / 100,
        maxUsage: usageStats[0]?.maxUsage || 0
      },
      categories: categoryStatsFormatted,
      topUsed: topUsedTemplates,
      recent: recentTemplates
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error("Error fetching template statistics:", error)
    return NextResponse.json(
      { error: "Failed to fetch template statistics" },
      { status: 500 }
    )
  }
}