import { NextRequest, NextResponse } from 'next/server';
import { checkUserPermissionsAPI } from '@/lib/auth-utils';
import { ExpenseService } from '@/lib/services/expense.service';
import { receiptUploadSchema } from '@/lib/validators/expense.validator';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // Check permissions - only admin and moderator can upload receipts
        const authResult = await checkUserPermissionsAPI(['admin', 'moderator']);
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        const { user, userRole } = authResult;
        const body = await request.json();

        // Validate request body
        const { id } = await params;
        const validationResult = receiptUploadSchema.safeParse({
            expenseId: id,
            files: body.files
        });
        
        if (!validationResult.success) {
            return NextResponse.json({
                error: 'Invalid receipt upload data',
                details: validationResult.error.issues
            }, { status: 400 });
        }

        // Get existing expense to check ownership
        const existingExpense = await ExpenseService.getExpenseById(id, userRole);
        if (!existingExpense) {
            return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
        }

        // For non-admin users, only allow uploading receipts to their own expenses
        if (userRole !== 'admin' && existingExpense.clerkUserId !== user.clerkUserId) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // Extract URLs from the files array
        const receiptUrls = validationResult.data.files.map(file => file.url);

        const updatedExpense = await ExpenseService.uploadReceipts(
            id,
            receiptUrls,
            user.clerkUserId
        );

        return NextResponse.json({
            message: 'Receipts uploaded successfully',
            expense: updatedExpense
        });

    } catch (error) {
        console.error('Error uploading receipts:', error);
        
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