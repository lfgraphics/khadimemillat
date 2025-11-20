import { NextRequest, NextResponse } from 'next/server';
import { checkUserPermissionsAPI } from '@/lib/auth-utils';
import { ExpenseCategoryService } from '@/lib/services/expense-category.service';
import { expenseCategoryUpdateSchema } from '@/lib/validators/expense.validator';
import { z } from 'zod';

const bulkUpdateSchema = z.object({
    updates: z.array(z.object({
        id: z.string().length(24, "Invalid category ID"),
        data: expenseCategoryUpdateSchema
    })).min(1, "At least one update is required")
});

export async function POST(request: NextRequest) {
    try {
        // Check permissions - only admin can bulk update categories
        const authResult = await checkUserPermissionsAPI(['admin']);
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        const { user } = authResult;
        const body = await request.json();

        // Validate request body
        const validationResult = bulkUpdateSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json({
                error: 'Invalid bulk update data',
                details: validationResult.error.issues
            }, { status: 400 });
        }

        const updatedCategories = await ExpenseCategoryService.bulkUpdateCategories(
            validationResult.data.updates,
            user.clerkUserId
        );

        return NextResponse.json({
            message: 'Categories updated successfully',
            categories: updatedCategories,
            successCount: updatedCategories.length,
            totalCount: validationResult.data.updates.length
        });

    } catch (error) {
        console.error('Error bulk updating categories:', error);
        
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