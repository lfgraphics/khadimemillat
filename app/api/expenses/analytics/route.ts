import { NextRequest, NextResponse } from 'next/server';
import { checkUserPermissionsAPI } from '@/lib/auth-utils';
import { ExpenseService } from '@/lib/services/expense.service';
import { z } from 'zod';

const analyticsQuerySchema = z.object({
    days: z.string().optional().transform(val => val ? parseInt(val) : 30)
});

export async function GET(request: NextRequest) {
    try {
        // Check permissions - only admin andaccountant, auditor can view analytics
        const authResult = await checkUserPermissionsAPI(['admin', 'accountant', 'auditor']);
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        const { searchParams } = new URL(request.url);
        const queryParams = Object.fromEntries(searchParams.entries());

        const validationResult = analyticsQuerySchema.safeParse(queryParams);
        if (!validationResult.success) {
            return NextResponse.json({
                error: 'Invalid query parameters',
                details: validationResult.error.issues
            }, { status: 400 });
        }

        const { days } = validationResult.data;
        const analytics = await ExpenseService.getDashboardAnalytics(days);

        return NextResponse.json({
            message: 'Analytics retrieved successfully',
            analytics
        });

    } catch (error) {
        console.error('Error retrieving analytics:', error);
        
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