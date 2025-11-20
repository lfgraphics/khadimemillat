import { NextRequest, NextResponse } from 'next/server';
import { checkUserPermissionsAPI } from '@/lib/auth-utils';
import { ExpenseCategoryService } from '@/lib/services/expense-category.service';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // Check permissions - only admin can reactivate categories
        const authResult = await checkUserPermissionsAPI(['admin']);
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        const { user } = authResult;

        const { id } = await params;
        const reactivatedCategory = await ExpenseCategoryService.reactivateCategory(id, user.clerkUserId);

        return NextResponse.json({
            message: 'Category reactivated successfully',
            category: reactivatedCategory
        });

    } catch (error) {
        console.error('Error reactivating category:', error);
        
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