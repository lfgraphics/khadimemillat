import { NextRequest, NextResponse } from 'next/server';
import { checkUserPermissionsAPI } from '@/lib/auth-utils';
import { ExpenseService } from '@/lib/services/expense.service';
import { z } from 'zod';

const userActivityQuerySchema = z.object({
    userId: z.string().optional(),
    days: z.string().optional().transform(val => val ? parseInt(val) : 30)
});

export async function GET(request: NextRequest) {
    try {
        // Check permissions - admin andaccountant, auditor can view all users, others can only view their own
        const authResult = await checkUserPermissionsAPI(['admin', 'accountant', 'auditor', 'moderator']);
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        const { user, userRole } = authResult;
        const { searchParams } = new URL(request.url);
        const queryParams = Object.fromEntries(searchParams.entries());

        const validationResult = userActivityQuerySchema.safeParse(queryParams);
        if (!validationResult.success) {
            return NextResponse.json({
                error: 'Invalid query parameters',
                details: validationResult.error.issues
            }, { status: 400 });
        }

        const { userId, days } = validationResult.data;

        // Determine which user's activity to retrieve
        let targetUserId = userId || user.id; // Default to current user if not specified
        
        if (userRole !== 'admin' && userRole !== 'accountant' && userRole !== 'auditor' && targetUserId !== user.id) {
            return NextResponse.json({
                error: 'You can only view your own activity'
            }, { status: 403 });
        }

        const activityStats = await ExpenseService.getUserActivityStats(targetUserId, days);

        return NextResponse.json({
            message: 'User activity retrieved successfully',
            userId: targetUserId,
            stats: activityStats
        });

    } catch (error) {
        console.error('Error retrieving user activity:', error);
        
        if (error instanceof Error) {
            return NextResponse.json(
                { error: error.message },
                { status: 400 }
            );
        }
        
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}