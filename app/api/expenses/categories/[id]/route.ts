import { NextRequest, NextResponse } from 'next/server';
import { checkUserPermissionsAPI } from '@/lib/auth-utils';
import { ExpenseCategoryService } from '@/lib/services/expense-category.service';
import { expenseCategoryUpdateSchema } from '@/lib/validators/expense.validator';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // Check permissions - all authenticated users can view categories
        const authResult = await checkUserPermissionsAPI(['admin', 'moderator', 'accountant']);
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        const { id } = await params;
        const category = await ExpenseCategoryService.getCategoryById(id);

        if (!category) {
            return NextResponse.json({ error: 'Category not found' }, { status: 404 });
        }

        return NextResponse.json({ category });

    } catch (error) {
        console.error('Error fetching category:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    try {
        // Check permissions - only admin can update categories
        const authResult = await checkUserPermissionsAPI(['admin']);
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        const { user } = authResult;
        const body = await request.json();

        // Validate request body
        const validationResult = expenseCategoryUpdateSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json({
                error: 'Invalid category data',
                details: validationResult.error.issues
            }, { status: 400 });
        }

        const { id: categoryId } = await params;
        const updatedCategory = await ExpenseCategoryService.updateCategory(
            categoryId,
            validationResult.data,
            user.clerkUserId
        );

        return NextResponse.json({
            message: 'Category updated successfully',
            category: updatedCategory
        });

    } catch (error) {
        console.error('Error updating category:', error);

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

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // Check permissions - only admin can deactivate categories
        const authResult = await checkUserPermissionsAPI(['admin']);
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        const { user } = authResult;

        await ExpenseCategoryService.deactivateCategory((await params).id, user.clerkUserId);

        return NextResponse.json({
            message: 'Category deactivated successfully'
        });

    } catch (error) {
        console.error('Error deactivating category:', error);

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