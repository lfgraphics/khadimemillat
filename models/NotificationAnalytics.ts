import mongoose, { Schema, Document } from 'mongoose'

export interface INotificationAnalytics extends Document {
  date: Date
  totalSent: number
  totalFailed: number
  channelStats: {
    webPush: { sent: number; failed: number }
    email: { sent: number; failed: number }
    whatsapp: { sent: number; failed: number }
    sms: { sent: number; failed: number }
  }
  roleStats: {
    [role: string]: { sent: number; failed: number }
  }
  createdAt: Date
  updatedAt: Date
}

const notificationAnalyticsSchema = new Schema<INotificationAnalytics>({
  date: { 
    type: Date, 
    required: true,
    unique: true // Ensure one record per day
  },
  totalSent: { 
    type: Number, 
    default: 0,
    min: 0
  },
  totalFailed: { 
    type: Number, 
    default: 0,
    min: 0
  },
  channelStats: {
    webPush: {
      sent: { type: Number, default: 0, min: 0 },
      failed: { type: Number, default: 0, min: 0 }
    },
    email: {
      sent: { type: Number, default: 0, min: 0 },
      failed: { type: Number, default: 0, min: 0 }
    },
    whatsapp: {
      sent: { type: Number, default: 0, min: 0 },
      failed: { type: Number, default: 0, min: 0 }
    },
    sms: {
      sent: { type: Number, default: 0, min: 0 },
      failed: { type: Number, default: 0, min: 0 }
    }
  },
  roleStats: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, { 
  timestamps: true
})

// Add indexes for efficient querying
notificationAnalyticsSchema.index({ date: -1 }) // For date-based queries (most recent first)
notificationAnalyticsSchema.index({ createdAt: -1 }) // For time-based queries
notificationAnalyticsSchema.index({ totalSent: -1 }) // For sorting by volume

// Static methods for data aggregation
notificationAnalyticsSchema.statics.aggregateDailyStats = async function(date: Date) {
  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)
  
  const endOfDay = new Date(date)
  endOfDay.setHours(23, 59, 59, 999)

  // Import NotificationLog model
  const NotificationLog = mongoose.models.NotificationLog || 
    require('./NotificationLog').default

  const logs = await NotificationLog.find({
    createdAt: { $gte: startOfDay, $lte: endOfDay }
  })

  const stats = {
    date: startOfDay,
    totalSent: 0,
    totalFailed: 0,
    channelStats: {
      webPush: { sent: 0, failed: 0 },
      email: { sent: 0, failed: 0 },
      whatsapp: { sent: 0, failed: 0 },
      sms: { sent: 0, failed: 0 }
    },
    roleStats: {} as { [role: string]: { sent: number; failed: number } }
  }

  logs.forEach(log => {
    stats.totalSent += log.totalSent
    stats.totalFailed += log.totalFailed

    // Aggregate channel stats
    log.sentTo.forEach((recipient: any) => {
      recipient.channels.forEach((channelLog: any) => {
        const channelKey = channelLog.channel === 'web_push' ? 'webPush' : channelLog.channel
        if (channelKey in stats.channelStats) {
          if (channelLog.status === 'sent') {
            (stats.channelStats as any)[channelKey].sent++
          } else if (channelLog.status === 'failed') {
            (stats.channelStats as any)[channelKey].failed++
          }
        }
      })
    })

    // Aggregate role stats
    log.targetRoles.forEach((role: string) => {
      if (!stats.roleStats[role]) {
        stats.roleStats[role] = { sent: 0, failed: 0 }
      }
      stats.roleStats[role].sent += log.totalSent
      stats.roleStats[role].failed += log.totalFailed
    })
  })

  return stats
}

notificationAnalyticsSchema.statics.getDateRangeStats = async function(
  startDate: Date, 
  endDate: Date
) {
  return this.find({
    date: { $gte: startDate, $lte: endDate }
  }).sort({ date: -1 })
}

notificationAnalyticsSchema.statics.getChannelEffectiveness = async function(
  startDate: Date, 
  endDate: Date
) {
  const stats = await this.find({
    date: { $gte: startDate, $lte: endDate }
  })

  const channelTotals = {
    webPush: { sent: 0, failed: 0, successRate: 0 },
    email: { sent: 0, failed: 0, successRate: 0 },
    whatsapp: { sent: 0, failed: 0, successRate: 0 },
    sms: { sent: 0, failed: 0, successRate: 0 }
  }

  stats.forEach((stat: any) => {
    Object.keys(channelTotals).forEach(channel => {
      const channelKey = channel as keyof typeof channelTotals
      channelTotals[channelKey].sent += stat.channelStats[channel].sent
      channelTotals[channelKey].failed += stat.channelStats[channel].failed
    })
  })

  // Calculate success rates
  Object.keys(channelTotals).forEach(channel => {
    const channelKey = channel as keyof typeof channelTotals
    const total = channelTotals[channelKey].sent + channelTotals[channelKey].failed
    channelTotals[channelKey].successRate = total > 0 
      ? (channelTotals[channelKey].sent / total) * 100 
      : 0
  })

  return channelTotals
}

export default mongoose.models.NotificationAnalytics || 
  mongoose.model<INotificationAnalytics>('NotificationAnalytics', notificationAnalyticsSchema, 'notification-analytics')