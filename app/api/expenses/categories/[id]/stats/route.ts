import { NextRequest, NextResponse } from 'next/server';
import { checkUserPermissionsAPI } from '@/lib/auth-utils';
import { ExpenseCategoryService } from '@/lib/services/expense-category.service';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // Check permissions - admin andaccountant, auditor can view category stats
        const authResult = await checkUserPermissionsAPI(['admin', 'accountant', 'auditor']);
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        const { id } = await params;
        const stats = await ExpenseCategoryService.getCategoryUsageStats(id);

        return NextResponse.json({ stats });

    } catch (error) {
        console.error('Error fetching category stats:', error);
        
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