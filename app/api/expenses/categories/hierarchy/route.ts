import { NextRequest, NextResponse } from 'next/server';
import { checkUserPermissionsAPI } from '@/lib/auth-utils';
import { ExpenseCategoryService } from '@/lib/services/expense-category.service';

export async function GET(request: NextRequest) {
    try {
        // Check permissions - all authenticated users can view category hierarchy
        const authResult = await checkUserPermissionsAPI(['admin', 'moderator', 'accountant', 'auditor']);
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        const hierarchy = await ExpenseCategoryService.getCategoryHierarchy();

        return NextResponse.json({ hierarchy });

    } catch (error) {
        console.error('Error fetching category hierarchy:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}