import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { schedulerService } from '@/lib/services/scheduler.service'

/**
 * GET /api/admin/scheduler
 * Get scheduler status and available jobs
 */
export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // TODO: Add admin role check here
    // const user = await getUserFromClerk(userId)
    // if (!user || !['admin'].includes(user.role)) {
    //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    // }

    const status = schedulerService.getJobStatus()
    const availableJobs = schedulerService.getAvailableJobs()

    return NextResponse.json({
      success: true,
      data: {
        available: availableJobs,
        active: status.active,
        summary: {
          totalAvailable: availableJobs.length,
          totalActive: status.active.length
        }
      }
    })
  } catch (error) {
    console.error('Failed to get scheduler status:', error)
    return NextResponse.json(
      { error: 'Failed to get scheduler status' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/scheduler
 * Enable/disable a scheduled job or run a job manually
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // TODO: Add admin role check here
    // const user = await getUserFromClerk(userId)
    // if (!user || !['admin'].includes(user.role)) {
    //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    // }

    const body = await request.json()
    const { action, jobName, enabled } = body

    if (!action || !jobName) {
      return NextResponse.json(
        { error: 'Missing required fields: action, jobName' },
        { status: 400 }
      )
    }

    switch (action) {
      case 'toggle':
        if (typeof enabled !== 'boolean') {
          return NextResponse.json(
            { error: 'enabled field must be a boolean for toggle action' },
            { status: 400 }
          )
        }
        
        schedulerService.setJobEnabled(jobName, enabled)
        
        return NextResponse.json({
          success: true,
          message: `Job ${jobName} ${enabled ? 'enabled' : 'disabled'} successfully`,
          data: {
            jobName,
            enabled,
            isActive: schedulerService.isJobEnabled(jobName)
          }
        })

      case 'run':
        await schedulerService.runJob(jobName)
        
        return NextResponse.json({
          success: true,
          message: `Job ${jobName} executed successfully`,
          data: {
            jobName,
            executedAt: new Date().toISOString()
          }
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: toggle, run' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Failed to manage scheduled job:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return NextResponse.json(
      { 
        error: 'Failed to manage scheduled job',
        details: errorMessage
      },
      { status: 500 }
    )
  }
}